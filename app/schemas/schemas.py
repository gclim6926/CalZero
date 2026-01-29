from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# User
class UserCreate(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class UserLogin(BaseModel):
    email: str
    password: str

class UserResponse(BaseModel):
    id: int
    email: str
    name: Optional[str]
    role: str

    class Config:
        from_attributes = True

# Device
class DeviceCreate(BaseModel):
    device_name: str
    device_type: str
    serial_number: Optional[str] = None

class DeviceResponse(BaseModel):
    id: int
    device_name: str
    device_type: str
    serial_number: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# Calibration (레거시)
class CalibrationCreate(BaseModel):
    device_id: int
    calibration_data: str  # JSON 문자열
    notes: Optional[str] = None

class CalibrationResponse(BaseModel):
    id: int
    device_id: int
    calibration_data: str
    notes: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True

# Actuator Calibration
class ActuatorCalibrationCreate(BaseModel):
    device_id: int
    calibration_data: str  # JSON 문자열 (joints 데이터)
    notes: Optional[str] = None

class ActuatorCalibrationResponse(BaseModel):
    id: int
    device_id: int
    calibration_data: str
    notes: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Intrinsic Calibration (카메라 내부 파라미터)
class IntrinsicCalibrationCreate(BaseModel):
    device_id: int
    camera: str  # 'front_cam' or 'wrist_cam'
    fx: float
    fy: float
    cx: float
    cy: float
    dist_coeffs: Optional[List[float]] = None  # [k1, k2, p1, p2, k3]
    rms_error: Optional[float] = None
    image_count: Optional[int] = None
    resolution: Optional[str] = None
    notes: Optional[str] = None

class IntrinsicCalibrationResponse(BaseModel):
    id: int
    device_id: int
    camera: str
    fx: float
    fy: float
    cx: float
    cy: float
    dist_coeffs: Optional[List[float]] = None
    rms_error: Optional[float] = None
    image_count: Optional[int] = None
    resolution: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Extrinsic Calibration (카메라 외부 파라미터)
class ExtrinsicCalibrationCreate(BaseModel):
    device_id: int
    camera: str  # 'front_cam' or 'wrist_cam'
    intrinsic_id: Optional[int] = None
    translation_vector: List[float]  # [tx, ty, tz] in mm
    rotation_vector: List[float]  # [rx, ry, rz] in rad
    rotation_matrix: Optional[List[List[float]]] = None  # 3x3 matrix
    reprojection_error: Optional[float] = None
    image_count: Optional[int] = None
    notes: Optional[str] = None

class ExtrinsicCalibrationResponse(BaseModel):
    id: int
    device_id: int
    camera: str
    intrinsic_id: Optional[int] = None
    translation_vector: List[float]
    rotation_vector: List[float]
    rotation_matrix: Optional[List[List[float]]] = None
    reprojection_error: Optional[float] = None
    image_count: Optional[int] = None
    notes: Optional[str] = None
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

# Compare
class JointCompare(BaseModel):
    homing_offset_1: int
    homing_offset_2: int
    homing_offset_diff: int
    range_min_1: int
    range_min_2: int
    range_min_diff: int
    range_max_1: int
    range_max_2: int
    range_max_diff: int
    diff_degrees: float

class CompareResponse(BaseModel):
    calib_id_1: int
    calib_id_2: int
    joints: dict[str, JointCompare]

# Token
class Token(BaseModel):
    access_token: str
    token_type: str
