"""
Pytest configuration and global fixtures for FinSight AI test suite.
Ensures database schema is initialized and available for all tests across the suite.
"""
import pytest
import asyncio
from backend.app.db.database import init_db


@pytest.fixture(scope="session", autouse=True)
def initialize_test_database():
    """
    Session-scoped fixture that initializes database schema (SQLite tables)
    before any tests are executed, ensuring test isolation and deterministic table existence.
    """
    try:
        loop = asyncio.get_event_loop()
    except RuntimeError:
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    if loop.is_closed():
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)

    if loop.is_running():
        import concurrent.futures
        with concurrent.futures.ThreadPoolExecutor() as pool:
            pool.submit(lambda: asyncio.run(init_db())).result()
    else:
        loop.run_until_complete(init_db())
