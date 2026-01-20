from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
import json
from app.database import get_db
from app.models.models import Calibration, Device, User
from app.schemas.schemas import CalibrationCreate, CalibrationResponse, CompareResponse, JointCompare
from app.services.auth import get_current_user

router = APIRouter()

@router.post("/", response_model=CalibrationResponse)
def create_calibration(calib: CalibrationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    # 디바이스 확인
    device = db.query(Device).filter(Device.id == calib.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    
    db_calib = Calibration(
        device_id=calib.device_id,
        user_id=current_user.id,
        calibration_data=calib.calibration_data,
        notes=calib.notes
    )
    db.add(db_calib)
    db.commit()
    db.refresh(db_calib)
    return db_calib

@router.get("/device/{device_id}", response_model=List[CalibrationResponse])
def get_calibrations(device_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Calibration).filter(Calibration.device_id == device_id).order_by(Calibration.created_at.desc()).all()

@router.get("/{calib_id}", response_model=CalibrationResponse)
def get_calibration(calib_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    calib = db.query(Calibration).filter(Calibration.id == calib_id).first()
    if not calib:
        raise HTTPException(status_code=404, detail="Calibration not found")
    return calib

@router.get("/{calib_id_1}/compare/{calib_id_2}", response_model=CompareResponse)
def compare_calibrations(calib_id_1: int, calib_id_2: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    calib1 = db.query(Calibration).filter(Calibration.id == calib_id_1).first()
    calib2 = db.query(Calibration).filter(Calibration.id == calib_id_2).first()
    
    if not calib1 or not calib2:
        raise HTTPException(status_code=404, detail="Calibration not found")
    
    data1 = json.loads(calib1.calibration_data)
    data2 = json.loads(calib2.calibration_data)
    
    joints = {}
    joint_names = ["shoulder_pan", "shoulder_lift", "elbow_flex", "wrist_flex", "wrist_roll", "gripper"]
    
    for joint in joint_names:
        if joint in data1 and joint in data2:
            j1, j2 = data1[joint], data2[joint]
            ho_diff = j2["homing_offset"] - j1["homing_offset"]
            
            joints[joint] = JointCompare(
                homing_offset_1=j1["homing_offset"],
                homing_offset_2=j2["homing_offset"],
                homing_offset_diff=ho_diff,
                range_min_1=j1["range_min"],
                range_min_2=j2["range_min"],
                range_min_diff=j2["range_min"] - j1["range_min"],
                range_max_1=j1["range_max"],
                range_max_2=j2["range_max"],
                range_max_diff=j2["range_max"] - j1["range_max"],
                diff_degrees=round(abs(ho_diff) * 360 / 4096, 2)
            )
    
    return CompareResponse(calib_id_1=calib_id_1, calib_id_2=calib_id_2, joints=joints)
