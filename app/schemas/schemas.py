from pydantic import BaseModel
from typing import Optional
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

# Calibration
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
