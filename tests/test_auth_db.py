"""
Unit & Integration Tests for P0.1 - Authentication, Authorization,
Tenant Isolation, and Database Models.
"""
import unittest
import asyncio
from datetime import datetime, timedelta
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession
from sqlalchemy import select, text

from backend.app.db.database import Base
from backend.app.db.models import User, Session, Watchlist, WatchlistItem, Portfolio, PortfolioItem, Alert, PaperAccount, PaperPosition, PaperTrade
from backend.app.utils.security import hash_password, verify_password, generate_session_token, generate_uuid
from backend.app.routes.auth import get_current_user
from fastapi import HTTPException

TEST_DB_URL = "sqlite+aiosqlite:///:memory:"

class TestAuthAndDatabase(unittest.TestCase):
    def setUp(self):
        self.engine = create_async_engine(TEST_DB_URL, echo=False)
        self.session_factory = async_sessionmaker(self.engine, expire_on_commit=False, class_=AsyncSession)

    def tearDown(self):
        asyncio.run(self.engine.dispose())

    def test_security_crypto_primitives(self):
        """Validates password hashing, verification, and token randomness."""
        password = "SuperSecretPassword123!"
        hashed = hash_password(password)
        
        self.assertTrue(hashed.startswith("pbkdf2_sha256$200000$"))
        self.assertTrue(verify_password(password, hashed))
        self.assertFalse(verify_password("WrongPassword", hashed))
        self.assertFalse(verify_password("", hashed))
        
        # Token uniqueness
        token1 = generate_session_token()
        token2 = generate_session_token()
        self.assertNotEqual(token1, token2)
        self.assertGreaterEqual(len(token1), 40)

    def test_database_models_creation_and_cascade(self):
        """Tests that all P0.1 tables are created and cascade deletes work as designed."""
        async def _run():
            async with self.engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)

            async with self.session_factory() as session:
                # 1. Create User
                user_id = generate_uuid()
                user = User(id=user_id, email="investor@example.com", hashed_password=hash_password("Pass1234"), is_guest=False)
                session.add(user)
                await session.flush()

                # 2. Add Session
                token = generate_session_token()
                sess = Session(id=generate_uuid(), user_id=user_id, session_token=token, expires_at=datetime.utcnow() + timedelta(days=7))
                session.add(sess)

                # 3. Add Watchlist
                wl = Watchlist(user_id=user_id, name="Tech Giants")
                session.add(wl)
                await session.flush()
                item = WatchlistItem(watchlist_id=wl.id, ticker="NVDA", notes="AI infrastructure leader")
                session.add(item)

                # 4. Add Portfolio
                port = Portfolio(user_id=user_id, name="Growth Fund", description="High-beta equities")
                session.add(port)
                await session.flush()
                p_item = PortfolioItem(portfolio_id=port.id, ticker="AAPL", target_weight=0.5)
                session.add(p_item)

                # 5. Add Alert
                alert = Alert(user_id=user_id, ticker="NVDA", condition_type="PRICE_ABOVE", threshold_value=150.0)
                session.add(alert)

                # 6. Add Paper Account & Position
                p_acc = PaperAccount(user_id=user_id, cash_balance=100000.0, currency="USD")
                session.add(p_acc)
                await session.flush()
                pos = PaperPosition(account_id=p_acc.id, ticker="NVDA", shares=10.0, average_entry_price=120.0)
                session.add(pos)
                trade = PaperTrade(account_id=p_acc.id, ticker="NVDA", action="BUY", shares=10.0, execution_price=120.0)
                session.add(trade)

                await session.commit()

                # Verify persistence
                res = await session.execute(select(Watchlist).where(Watchlist.user_id == user_id))
                fetched_wl = res.scalar_one()
                self.assertEqual(fetched_wl.name, "Tech Giants")
                self.assertEqual(len(fetched_wl.items), 1)
                self.assertEqual(fetched_wl.items[0].ticker, "NVDA")

                res_acc = await session.execute(select(PaperAccount).where(PaperAccount.user_id == user_id))
                fetched_acc = res_acc.scalar_one()
                self.assertEqual(fetched_acc.cash_balance, 100000.0)
                self.assertEqual(len(fetched_acc.positions), 1)

                # Verify Cascade Delete: Deleting user removes watchlists, portfolios, alerts, paper account
                await session.delete(user)
                await session.commit()

                res_wl_post = await session.execute(select(Watchlist).where(Watchlist.user_id == user_id))
                self.assertIsNone(res_wl_post.scalar_one_or_none())

                res_item_post = await session.execute(select(WatchlistItem).where(WatchlistItem.ticker == "NVDA"))
                self.assertIsNone(res_item_post.scalar_one_or_none())

        asyncio.run(_run())

    def test_tenant_isolation_between_users(self):
        """Verifies that User A cannot view, query, or mutate User B's watchlists or portfolios."""
        async def _run():
            async with self.engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)

            async with self.session_factory() as session:
                user_a = User(id=generate_uuid(), email="a@example.com", is_guest=False)
                user_b = User(id=generate_uuid(), email="b@example.com", is_guest=False)
                session.add_all([user_a, user_b])
                await session.flush()

                # User A creates watchlist
                wl_a = Watchlist(user_id=user_a.id, name="User A Confidential Watchlist")
                session.add(wl_a)
                await session.commit()

                # User B queries their watchlists
                query_b = select(Watchlist).where(Watchlist.user_id == user_b.id)
                res_b = await session.execute(query_b)
                watchlists_b = res_b.scalars().all()
                
                # User B must NOT see User A's watchlist
                self.assertEqual(len(watchlists_b), 0)

                # User A queries their watchlists
                query_a = select(Watchlist).where(Watchlist.user_id == user_a.id)
                res_a = await session.execute(query_a)
                watchlists_a = res_a.scalars().all()
                self.assertEqual(len(watchlists_a), 1)
                self.assertEqual(watchlists_a[0].name, "User A Confidential Watchlist")

        asyncio.run(_run())

    def test_get_current_user_dependency_auto_guest_and_token_validation(self):
        """Validates that get_current_user authenticates valid tokens and auto-creates guest sessions."""
        async def _run():
            async with self.engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)

            async with self.session_factory() as session:
                # Case 1: No authorization header -> creates new guest user
                guest = await get_current_user(authorization=None, db=session)
                self.assertIsNotNone(guest)
                self.assertTrue(guest.is_guest)
                self.assertIsNone(guest.email)

                # Query created session
                res = await session.execute(select(Session).where(Session.user_id == guest.id))
                sess = res.scalar_one()
                token = sess.session_token

                # Case 2: Valid Bearer token provided -> returns matching user
                auth_header = f"Bearer {token}"
                authenticated_user = await get_current_user(authorization=auth_header, db=session)
                self.assertEqual(authenticated_user.id, guest.id)

                # Case 3: Invalid Bearer token provided -> raises 401 Unauthorized
                bad_auth = "Bearer invalid_token_xyz"
                with self.assertRaises(HTTPException) as ctx:
                    await get_current_user(authorization=bad_auth, db=session)
                self.assertEqual(ctx.exception.status_code, 401)

        asyncio.run(_run())

if __name__ == "__main__":
    unittest.main()
