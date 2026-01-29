from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
import json
from app.database import get_db
from app.models.models import (
    Calibration, Device, User,
    ActuatorCalibration, IntrinsicCalibration, ExtrinsicCalibration
)
from app.schemas.schemas import (
    CalibrationCreate, CalibrationResponse, CompareResponse, JointCompare,
    ActuatorCalibrationCreate, ActuatorCalibrationResponse,
    IntrinsicCalibrationCreate, IntrinsicCalibrationResponse,
    ExtrinsicCalibrationCreate, ExtrinsicCalibrationResponse
)
from app.services.auth import get_current_user

router = APIRouter()

# ============================================
# Legacy Calibration (기존 호환성)
# ============================================

@router.post("/", response_model=CalibrationResponse)
def create_calibration(calib: CalibrationCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
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


# ============================================
# Actuator Calibration
# ============================================

@router.get("/actuator", response_model=List[ActuatorCalibrationResponse])
def list_actuator_calibrations(
    device_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ActuatorCalibration)
    if device_id:
        query = query.filter(ActuatorCalibration.device_id == device_id)
    return query.order_by(ActuatorCalibration.created_at.desc()).all()

@router.post("/actuator", response_model=ActuatorCalibrationResponse)
def create_actuator_calibration(
    calib: ActuatorCalibrationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    device = db.query(Device).filter(Device.id == calib.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    db_calib = ActuatorCalibration(
        device_id=calib.device_id,
        calibration_data=calib.calibration_data,
        notes=calib.notes
    )
    db.add(db_calib)
    db.commit()
    db.refresh(db_calib)
    return db_calib

@router.delete("/actuator/{calib_id}")
def delete_actuator_calibration(
    calib_id: int,
    device_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    calib = db.query(ActuatorCalibration).filter(ActuatorCalibration.id == calib_id).first()
    if not calib:
        raise HTTPException(status_code=404, detail="Calibration not found")
    db.delete(calib)
    db.commit()
    return {"message": "Deleted successfully"}

@router.put("/actuator/{calib_id}/activate")
def activate_actuator_calibration(
    calib_id: int,
    device_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    calib = db.query(ActuatorCalibration).filter(ActuatorCalibration.id == calib_id).first()
    if not calib:
        raise HTTPException(status_code=404, detail="Calibration not found")

    # 같은 device의 다른 calibration을 비활성화
    db.query(ActuatorCalibration).filter(
        ActuatorCalibration.device_id == calib.device_id
    ).update({"is_active": False})

    calib.is_active = True
    db.commit()
    return {"message": "Activated successfully"}


# ============================================
# Intrinsic Calibration (카메라 내부 파라미터)
# ============================================

@router.get("/intrinsic", response_model=List[IntrinsicCalibrationResponse])
def list_intrinsic_calibrations(
    device_id: Optional[int] = Query(None),
    camera: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(IntrinsicCalibration)
    if device_id:
        query = query.filter(IntrinsicCalibration.device_id == device_id)
    if camera:
        query = query.filter(IntrinsicCalibration.camera == camera)
    calibrations = query.order_by(IntrinsicCalibration.created_at.desc()).all()

    # dist_coeffs JSON 파싱
    result = []
    for c in calibrations:
        resp = IntrinsicCalibrationResponse(
            id=c.id,
            device_id=c.device_id,
            camera=c.camera,
            fx=c.fx,
            fy=c.fy,
            cx=c.cx,
            cy=c.cy,
            dist_coeffs=json.loads(c.dist_coeffs) if c.dist_coeffs else None,
            rms_error=c.rms_error,
            image_count=c.image_count,
            resolution=c.resolution,
            notes=c.notes,
            is_active=c.is_active,
            created_at=c.created_at
        )
        result.append(resp)
    return result

@router.post("/intrinsic", response_model=IntrinsicCalibrationResponse)
def create_intrinsic_calibration(
    calib: IntrinsicCalibrationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    device = db.query(Device).filter(Device.id == calib.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    db_calib = IntrinsicCalibration(
        device_id=calib.device_id,
        camera=calib.camera,
        fx=calib.fx,
        fy=calib.fy,
        cx=calib.cx,
        cy=calib.cy,
        dist_coeffs=json.dumps(calib.dist_coeffs) if calib.dist_coeffs else None,
        rms_error=calib.rms_error,
        image_count=calib.image_count,
        resolution=calib.resolution,
        notes=calib.notes
    )
    db.add(db_calib)
    db.commit()
    db.refresh(db_calib)

    return IntrinsicCalibrationResponse(
        id=db_calib.id,
        device_id=db_calib.device_id,
        camera=db_calib.camera,
        fx=db_calib.fx,
        fy=db_calib.fy,
        cx=db_calib.cx,
        cy=db_calib.cy,
        dist_coeffs=json.loads(db_calib.dist_coeffs) if db_calib.dist_coeffs else None,
        rms_error=db_calib.rms_error,
        image_count=db_calib.image_count,
        resolution=db_calib.resolution,
        notes=db_calib.notes,
        is_active=db_calib.is_active,
        created_at=db_calib.created_at
    )

@router.delete("/intrinsic/{calib_id}")
def delete_intrinsic_calibration(
    calib_id: int,
    device_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    calib = db.query(IntrinsicCalibration).filter(IntrinsicCalibration.id == calib_id).first()
    if not calib:
        raise HTTPException(status_code=404, detail="Calibration not found")
    db.delete(calib)
    db.commit()
    return {"message": "Deleted successfully"}

@router.put("/intrinsic/{calib_id}/activate")
def activate_intrinsic_calibration(
    calib_id: int,
    device_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    calib = db.query(IntrinsicCalibration).filter(IntrinsicCalibration.id == calib_id).first()
    if not calib:
        raise HTTPException(status_code=404, detail="Calibration not found")

    # 같은 device, 같은 camera의 다른 calibration을 비활성화
    db.query(IntrinsicCalibration).filter(
        IntrinsicCalibration.device_id == calib.device_id,
        IntrinsicCalibration.camera == calib.camera
    ).update({"is_active": False})

    calib.is_active = True
    db.commit()
    return {"message": "Activated successfully"}


# ============================================
# Extrinsic Calibration (카메라 외부 파라미터)
# ============================================

@router.get("/extrinsic", response_model=List[ExtrinsicCalibrationResponse])
def list_extrinsic_calibrations(
    device_id: Optional[int] = Query(None),
    camera: Optional[str] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(ExtrinsicCalibration)
    if device_id:
        query = query.filter(ExtrinsicCalibration.device_id == device_id)
    if camera:
        query = query.filter(ExtrinsicCalibration.camera == camera)
    calibrations = query.order_by(ExtrinsicCalibration.created_at.desc()).all()

    # JSON 파싱
    result = []
    for c in calibrations:
        resp = ExtrinsicCalibrationResponse(
            id=c.id,
            device_id=c.device_id,
            camera=c.camera,
            intrinsic_id=c.intrinsic_id,
            translation_vector=json.loads(c.translation_vector) if c.translation_vector else [0, 0, 0],
            rotation_vector=json.loads(c.rotation_vector) if c.rotation_vector else [0, 0, 0],
            rotation_matrix=json.loads(c.rotation_matrix) if c.rotation_matrix else None,
            reprojection_error=c.reprojection_error,
            image_count=c.image_count,
            notes=c.notes,
            is_active=c.is_active,
            created_at=c.created_at
        )
        result.append(resp)
    return result

@router.post("/extrinsic", response_model=ExtrinsicCalibrationResponse)
def create_extrinsic_calibration(
    calib: ExtrinsicCalibrationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    device = db.query(Device).filter(Device.id == calib.device_id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")

    # intrinsic_id 검증 (선택적)
    if calib.intrinsic_id:
        intrinsic = db.query(IntrinsicCalibration).filter(IntrinsicCalibration.id == calib.intrinsic_id).first()
        if not intrinsic:
            raise HTTPException(status_code=404, detail="Intrinsic calibration not found")

    db_calib = ExtrinsicCalibration(
        device_id=calib.device_id,
        camera=calib.camera,
        intrinsic_id=calib.intrinsic_id,
        translation_vector=json.dumps(calib.translation_vector),
        rotation_vector=json.dumps(calib.rotation_vector),
        rotation_matrix=json.dumps(calib.rotation_matrix) if calib.rotation_matrix else None,
        reprojection_error=calib.reprojection_error,
        image_count=calib.image_count,
        notes=calib.notes
    )
    db.add(db_calib)
    db.commit()
    db.refresh(db_calib)

    return ExtrinsicCalibrationResponse(
        id=db_calib.id,
        device_id=db_calib.device_id,
        camera=db_calib.camera,
        intrinsic_id=db_calib.intrinsic_id,
        translation_vector=json.loads(db_calib.translation_vector),
        rotation_vector=json.loads(db_calib.rotation_vector),
        rotation_matrix=json.loads(db_calib.rotation_matrix) if db_calib.rotation_matrix else None,
        reprojection_error=db_calib.reprojection_error,
        image_count=db_calib.image_count,
        notes=db_calib.notes,
        is_active=db_calib.is_active,
        created_at=db_calib.created_at
    )

@router.delete("/extrinsic/{calib_id}")
def delete_extrinsic_calibration(
    calib_id: int,
    device_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    calib = db.query(ExtrinsicCalibration).filter(ExtrinsicCalibration.id == calib_id).first()
    if not calib:
        raise HTTPException(status_code=404, detail="Calibration not found")
    db.delete(calib)
    db.commit()
    return {"message": "Deleted successfully"}

@router.put("/extrinsic/{calib_id}/activate")
def activate_extrinsic_calibration(
    calib_id: int,
    device_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    calib = db.query(ExtrinsicCalibration).filter(ExtrinsicCalibration.id == calib_id).first()
    if not calib:
        raise HTTPException(status_code=404, detail="Calibration not found")

    # 같은 device, 같은 camera의 다른 calibration을 비활성화
    db.query(ExtrinsicCalibration).filter(
        ExtrinsicCalibration.device_id == calib.device_id,
        ExtrinsicCalibration.camera == calib.camera
    ).update({"is_active": False})

    calib.is_active = True
    db.commit()
    return {"message": "Activated successfully"}
