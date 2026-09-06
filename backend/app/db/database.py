"""
Database configuration and SQLAlchemy async session management.
Supports PostgreSQL (asyncpg) with seamless SQLite (aiosqlite) fallback for local offline development.
Includes automated lightweight schema migration to ensure user_id columns exist.
"""
import os
import sys
from pathlib import Path
from typing import AsyncGenerator
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy.orm import declarative_base
from sqlalchemy import text, inspect

import socket

Base = declarative_base()

DEFAULT_PG_URL = "postgresql+asyncpg://postgres:postgrespassword@localhost:5432/finsight_db"
SQLITE_FALLBACK_URL = "sqlite+aiosqlite:///./finsight.db"

def _is_pg_available(host: str = "localhost", port: int = 5432) -> bool:
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(0.5)
            return sock.connect_ex((host, port)) == 0
    except Exception:
        return False

env_url = os.getenv("DATABASE_URL")
if env_url and ("localhost" in env_url or "127.0.0.1" in env_url) and not _is_pg_available("localhost", 5432):
    DATABASE_URL = SQLITE_FALLBACK_URL
elif env_url:
    DATABASE_URL = env_url
    if DATABASE_URL.startswith("postgres://"):
        DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+asyncpg://", 1)
    elif DATABASE_URL.startswith("postgresql://") and "+asyncpg" not in DATABASE_URL:
        DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://", 1)
else:
    # Auto-detect if PostgreSQL is running locally
    if _is_pg_available("localhost", 5432):
        DATABASE_URL = DEFAULT_PG_URL
    else:
        DATABASE_URL = SQLITE_FALLBACK_URL

active_url = DATABASE_URL
engine = None
async_session_factory = None

from sqlalchemy.pool import NullPool

def _create_engine_for_url(url: str):
    is_sqlite = "sqlite" in url
    if is_sqlite:
        return create_async_engine(
            url,
            echo=False,
            future=True,
            poolclass=NullPool,
            connect_args={"check_same_thread": False}
        )
    return create_async_engine(
        url,
        echo=False,
        future=True,
        pool_pre_ping=True,
        connect_args={"timeout": 3}
    )

engine = _create_engine_for_url(active_url)
async_session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
async_session = async_session_factory

def _sync_schema_updates(conn):
    """Run synchronous table inspection and add missing columns if upgrading legacy tables."""
    inspector = inspect(conn)
    tables = inspector.get_table_names()

    # 1. Check portfolios table
    if "portfolios" in tables:
        cols = [c["name"] for c in inspector.get_columns("portfolios")]
        if "user_id" not in cols:
            conn.execute(text("ALTER TABLE portfolios ADD COLUMN user_id VARCHAR(36)"))

    # 2. Check watchlists table
    if "watchlists" in tables:
        cols = [c["name"] for c in inspector.get_columns("watchlists")]
        if "user_id" not in cols:
            conn.execute(text("ALTER TABLE watchlists ADD COLUMN user_id VARCHAR(36)"))

    # 3. Check analysis_snapshots table
    if "analysis_snapshots" in tables:
        cols = [c["name"] for c in inspector.get_columns("analysis_snapshots")]
        if "user_id" not in cols:
            conn.execute(text("ALTER TABLE analysis_snapshots ADD COLUMN user_id VARCHAR(36)"))

async def init_db():
    """
    Initialize database connection and create tables.
    Falls back to SQLite if PostgreSQL server is not currently reachable.
    """
    global engine, async_session_factory, active_url
    from . import models  # Ensure all model tables are registered with Base.metadata

    try:
        async with engine.begin() as conn:
            await conn.execute(text("SELECT 1"))
            await conn.run_sync(Base.metadata.create_all)
            await conn.run_sync(_sync_schema_updates)
        print(f"[Database] Successfully connected to primary database: {active_url.split('@')[-1] if '@' in active_url else active_url}")
    except Exception as e:
        if "sqlite" not in active_url:
            print(f"[Database] Primary PostgreSQL not reachable ({e}). Falling back to local SQLite ({SQLITE_FALLBACK_URL})...")
            active_url = SQLITE_FALLBACK_URL
            engine = _create_engine_for_url(active_url)
            async_session_factory = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
                await conn.run_sync(_sync_schema_updates)
            print("[Database] SQLite database initialized successfully.")
        else:
            print(f"[Database] SQLite initialization failed: {e}")
            raise

async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """
    FastAPI dependency for obtaining async database sessions.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
