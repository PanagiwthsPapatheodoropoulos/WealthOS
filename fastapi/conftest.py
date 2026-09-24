import sys
import os
import pytest

# Add fastapi directory to sys.path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from db.database import engine, Base, SessionLocal
from db.models import Asset, User, Account, Portfolio, Holding


@pytest.fixture(autouse=True, scope="session")
def setup_test_database():
    """Ensure database schema and basic test assets exist for test execution."""
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        # Seed test asset if empty
        if not db.query(Asset).filter(Asset.symbol == "AAPL").first():
            test_asset = Asset(
                symbol="AAPL",
                name="Apple Inc.",
                asset_type="STOCK",
                currency="USD",
                current_price=180.0,
                price_change_24h=1.5,
                high_24h=182.0,
                low_24h=178.0,
                volume_24h=50000000.0,
                sector="Technology",
                risk_score=0.25,
            )
            db.add(test_asset)
            db.commit()

        # Seed test user and portfolio if empty
        if not db.query(User).filter(User.email == "test@wealthos.local").first():
            user = User(
                email="test@wealthos.local",
                password_hash="hashed_test_pass",
                first_name="Test",
                role="USER",
            )
            db.add(user)
            db.commit()

            account = Account(
                user_id=user.id,
                name="Primary Cash Account",
                account_type="BROKERAGE",
                currency="USD",
                cash_balance=1000.0,
            )
            db.add(account)
            db.commit()

            portfolio = Portfolio(
                user_id=user.id,
                account_id=account.id,
                name="Tech Growth",
            )
            db.add(portfolio)
            db.commit()

            asset = db.query(Asset).filter(Asset.symbol == "AAPL").first()
            holding = Holding(
                portfolio_id=portfolio.id,
                asset_id=asset.id,
                quantity=10.0,
                avg_cost=150.0,
            )
            db.add(holding)
            db.commit()
    except Exception as e:
        print("Test DB setup notice:", e)
    finally:
        db.close()
    yield
