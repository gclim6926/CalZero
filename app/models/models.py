from sqlalchemy import Column, Integer, String, Text, DateTime, ForeignKey, Float, Boolean
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
    actuator_calibrations = relationship("ActuatorCalibration", back_populates="device")
    intrinsic_calibrations = relationship("IntrinsicCalibration", back_populates="device")
    extrinsic_calibrations = relationship("ExtrinsicCalibration", back_populates="device")

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

class ActuatorCalibration(Base):
    """액추에이터 캘리브레이션 (homing offset, range 등)"""
    __tablename__ = "actuator_calibrations"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    calibration_data = Column(Text, nullable=False)  # JSON: joints 데이터
    notes = Column(String(500))
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    device = relationship("Device", back_populates="actuator_calibrations")

class IntrinsicCalibration(Base):
    """카메라 내부 파라미터 캘리브레이션"""
    __tablename__ = "intrinsic_calibrations"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    camera = Column(String(50), nullable=False)  # 'front_cam' or 'wrist_cam'

    # Camera Matrix (fx, fy, cx, cy)
    fx = Column(Float, nullable=False)
    fy = Column(Float, nullable=False)
    cx = Column(Float, nullable=False)
    cy = Column(Float, nullable=False)

    # Distortion Coefficients (k1, k2, p1, p2, k3)
    dist_coeffs = Column(Text)  # JSON array: [k1, k2, p1, p2, k3]

    # 품질 지표
    rms_error = Column(Float)
    image_count = Column(Integer)
    resolution = Column(String(50))  # e.g., "1920x1080"

    notes = Column(String(500))
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    device = relationship("Device", back_populates="intrinsic_calibrations")
    extrinsic_calibrations = relationship("ExtrinsicCalibration", back_populates="intrinsic")

class ExtrinsicCalibration(Base):
    """카메라 외부 파라미터 캘리브레이션 (위치/방향)"""
    __tablename__ = "extrinsic_calibrations"

    id = Column(Integer, primary_key=True, index=True)
    device_id = Column(Integer, ForeignKey("devices.id"), nullable=False)
    intrinsic_id = Column(Integer, ForeignKey("intrinsic_calibrations.id"))
    camera = Column(String(50), nullable=False)  # 'front_cam' or 'wrist_cam'

    # Translation Vector (X, Y, Z in mm)
    translation_vector = Column(Text, nullable=False)  # JSON array: [tx, ty, tz]

    # Rotation Vector (Rodrigues form)
    rotation_vector = Column(Text, nullable=False)  # JSON array: [rx, ry, rz]

    # Rotation Matrix (3x3)
    rotation_matrix = Column(Text)  # JSON array: [[r11,r12,r13], [r21,r22,r23], [r31,r32,r33]]

    # 품질 지표
    reprojection_error = Column(Float)
    image_count = Column(Integer)

    notes = Column(String(500))
    is_active = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    device = relationship("Device", back_populates="extrinsic_calibrations")
    intrinsic = relationship("IntrinsicCalibration", back_populates="extrinsic_calibrations")
