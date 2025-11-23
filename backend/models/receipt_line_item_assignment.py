from sqlalchemy.dialects.postgresql import UUID
from models import db
from sqlalchemy import Column, ForeignKey
from sqlalchemy.orm import relationship
import uuid

class ReceiptLineItemAssignment(db.Model):
    __tablename__ = 'receipt_line_item_assignment'

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    receipt_line_item_id = Column(UUID(as_uuid=True), ForeignKey('receipt_line_items.id'), nullable=False)
    assignment_id = Column(UUID(as_uuid=True), ForeignKey('assignment.id'), nullable=False)

    line_item = relationship('ReceiptLineItem', backref='assignment_junctions')
    assignment = relationship('Assignment', backref='line_item_junctions')