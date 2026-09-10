from datetime import datetime
from sqlalchemy import Column, String, Integer, Float, Boolean, DateTime, JSON, Text
from app.core.database import Base

class ProjectModel(Base):
    __tablename__ = "projects"

    id = Column(String(36), primary_key=True, index=True)
    title = Column(String(255), nullable=False, default="Untitled Study")
    image_filename = Column(String(255), nullable=True)
    image_width = Column(Integer, default=600)
    image_height = Column(Integer, default=800)
    medium = Column(String(50), default="graphite")
    stage = Column(Integer, default=1)
    is_sandbox = Column(Boolean, default=False)
    num_value_layers = Column(Integer, default=5)
    layers_data = Column(JSON, nullable=True)
    grid_data = Column(JSON, nullable=True)
    calibration_data = Column(JSON, nullable=True)
    methods_data = Column(JSON, nullable=True)
    notes = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
