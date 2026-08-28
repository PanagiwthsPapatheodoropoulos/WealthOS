import uuid
from datetime import datetime, timezone
from sqlalchemy import (
    Column,
    String,
    Float,
    Boolean,
    DateTime,
    ForeignKey,
    Text,
)
from sqlalchemy.orm import relationship
from db.database import Base


def generate_uuid(prefix: str = "") -> str:
    short_id = uuid.uuid4().hex[:8]
    return f"{prefix}{short_id}" if prefix else short_id


class User(Base):
    __tablename__ = "users"

    id = Column(String(50), primary_key=True, default=lambda: generate_uuid("usr-"))
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    role = Column(String(50), default="USER", nullable=False)
    base_currency = Column(String(10), default="EUR", nullable=False)
    theme = Column(String(20), default="light", nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    accounts = relationship("Account", back_populates="user", cascade="all, delete-orphan")
    portfolios = relationship("Portfolio", back_populates="user", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="user", cascade="all, delete-orphan")
    watchlists = relationship("Watchlist", back_populates="user", cascade="all, delete-orphan")
    alerts = relationship("PriceAlert", back_populates="user", cascade="all, delete-orphan")
    notifications = relationship("Notification", back_populates="user", cascade="all, delete-orphan")


class Account(Base):
    __tablename__ = "accounts"

    id = Column(String(50), primary_key=True, default=lambda: generate_uuid("acc-"))
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    account_type = Column(String(50), default="CASH", nullable=False)
    currency = Column(String(10), default="USD", nullable=False)
    cash_balance = Column(Float, default=0.0, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="accounts")
    portfolios = relationship("Portfolio", back_populates="account")


class Asset(Base):
    __tablename__ = "assets"

    id = Column(String(50), primary_key=True, default=lambda: generate_uuid("ast-"))
    symbol = Column(String(20), unique=True, index=True, nullable=False)
    name = Column(String(255), nullable=False)
    asset_type = Column(String(50), default="STOCK", nullable=False)  # STOCK, ETF, CRYPTO, BOND
    currency = Column(String(10), default="USD", nullable=False)
    current_price = Column(Float, default=0.0, nullable=False)
    price_change_24h = Column(Float, default=0.0, nullable=False)
    high_24h = Column(Float, default=0.0, nullable=True)
    low_24h = Column(Float, default=0.0, nullable=True)
    volume_24h = Column(Float, default=0.0, nullable=True)
    market_cap = Column(Float, default=0.0, nullable=True)
    sector = Column(String(100), default="Technology", nullable=False)
    risk_score = Column(Float, default=0.35, nullable=False)  # 0.0 to 1.0
    esg_score = Column(Float, default=75.0, nullable=False)    # 0 to 100
    supply_chain_dependency = Column(String(255), default="Global Supply Chain", nullable=True)
    last_updated = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    holdings = relationship("Holding", back_populates="asset")
    transactions = relationship("Transaction", back_populates="asset")


class Portfolio(Base):
    __tablename__ = "portfolios"

    id = Column(String(50), primary_key=True, default=lambda: generate_uuid("port-"))
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    account_id = Column(String(50), ForeignKey("accounts.id"), nullable=True)
    name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="portfolios")
    account = relationship("Account", back_populates="portfolios")
    holdings = relationship("Holding", back_populates="portfolio", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="portfolio", cascade="all, delete-orphan")


class Holding(Base):
    __tablename__ = "portfolio_holdings"

    id = Column(String(50), primary_key=True, default=lambda: generate_uuid("hld-"))
    portfolio_id = Column(String(50), ForeignKey("portfolios.id"), nullable=False)
    asset_id = Column(String(50), ForeignKey("assets.id"), nullable=False)
    quantity = Column(Float, default=0.0, nullable=False)
    avg_cost = Column(Float, default=0.0, nullable=False)
    updated_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))

    portfolio = relationship("Portfolio", back_populates="holdings")
    asset = relationship("Asset", back_populates="holdings")


class Transaction(Base):
    __tablename__ = "transactions"

    id = Column(String(50), primary_key=True, default=lambda: generate_uuid("tx-"))
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    portfolio_id = Column(String(50), ForeignKey("portfolios.id"), nullable=False)
    asset_id = Column(String(50), ForeignKey("assets.id"), nullable=False)
    symbol = Column(String(20), nullable=False)
    type = Column(String(20), default="BUY", nullable=False)  # BUY, SELL, DEPOSIT, WITHDRAW
    quantity = Column(Float, nullable=False)
    price = Column(Float, nullable=False)
    total_amount = Column(Float, nullable=False)
    realized_pnl = Column(Float, nullable=True)
    executed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="transactions")
    portfolio = relationship("Portfolio", back_populates="transactions")
    asset = relationship("Asset", back_populates="transactions")


class Watchlist(Base):
    __tablename__ = "watchlists"

    id = Column(String(50), primary_key=True, default=lambda: generate_uuid("wl-"))
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    name = Column(String(100), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="watchlists")
    items = relationship("WatchlistItem", back_populates="watchlist", cascade="all, delete-orphan")


class WatchlistItem(Base):
    __tablename__ = "watchlist_items"

    id = Column(String(50), primary_key=True, default=lambda: generate_uuid("wli-"))
    watchlist_id = Column(String(50), ForeignKey("watchlists.id"), nullable=False)
    asset_id = Column(String(50), ForeignKey("assets.id"), nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    watchlist = relationship("Watchlist", back_populates="items")
    asset = relationship("Asset")


class PriceAlert(Base):
    __tablename__ = "price_alerts"

    id = Column(String(50), primary_key=True, default=lambda: generate_uuid("alt-"))
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    asset_id = Column(String(50), ForeignKey("assets.id"), nullable=False)
    symbol = Column(String(20), nullable=False)
    condition = Column(String(20), default="ABOVE", nullable=False)  # ABOVE, BELOW
    target_price = Column(Float, nullable=False)
    status = Column(String(20), default="ACTIVE", nullable=False)    # ACTIVE, TRIGGERED, CANCELLED
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)
    triggered_at = Column(DateTime, nullable=True)

    user = relationship("User", back_populates="alerts")
    asset = relationship("Asset")


class Notification(Base):
    __tablename__ = "notifications"

    id = Column(String(50), primary_key=True, default=lambda: generate_uuid("notif-"))
    user_id = Column(String(50), ForeignKey("users.id"), nullable=False)
    title = Column(String(255), nullable=False)
    message = Column(Text, nullable=False)
    read = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc), nullable=False)

    user = relationship("User", back_populates="notifications")
