from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.database import Base

class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password = Column(String(255), nullable=False)
    name = Column(String(100))
    role = Column(String(50), default="user")
    created_at = Column(DateTime, default=datetime.utcnow)
    
    devices = relationship("Device", back_populates="owner")

class Device(Base):
    __tablename__ = "devices"
    
    id = Column(Integer, primary_key=True, index=True)
    device_name = Column(String(100), nullable=False)
    device_type = Column(String(50), nullable=False)
    serial_number = Column(String(100), unique=True)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    owner = relationship("User", back_populates="devices")
    calibrations = relationship("Calibration", back_populates="device")

class Calibration(Base):
    __tablename__ = "calibrations"
    
    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    calibration_data = Column(Text, nullable=False)  # JSON 문자열
    notes = Column(String(500))
    created_at = Column(DateTime, default=datetime.utcnow)
    
    device = relationship("Device", back_populates="calibrations")
    user = relationship("User")
