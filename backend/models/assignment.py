from models import db
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy import String, BigInteger, ForeignKey, Column
from sqlalchemy.orm import relationship
import uuid

class Assignment(db.Model):
  __tablename__ = 'assignment'

  id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
  name = Column(String, nullable=True, server_default='')
  user_id = Column(BigInteger, ForeignKey('users.id', ondelete='CASCADE'), nullable=True, index=True)

  user = relationship('User', back_populates='assignments')