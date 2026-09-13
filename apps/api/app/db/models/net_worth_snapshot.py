import uuid
from sqlalchemy import Column, Date, ForeignKey, Index, Numeric, String
from sqlalchemy.orm import relationship
from app.db.base import Base, TimestampMixin


class NetWorthSnapshot(Base, TimestampMixin):
    __tablename__ = "net_worth_snapshots"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    user_id = Column(String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    snapshot_date = Column(Date, nullable=False, index=True)
    total_assets = Column(Numeric(18, 2), nullable=False, default=0.00)
    total_liabilities = Column(Numeric(18, 2), nullable=False, default=0.00)
    net_worth = Column(Numeric(18, 2), nullable=False, default=0.00)

    user = relationship("User", back_populates="net_worth_snapshots")

    __table_args__ = (
        Index("ix_net_worth_snapshots_user_date", "user_id", "snapshot_date"),
    )
