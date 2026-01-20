from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from app.database import get_db
from app.models.models import Device, User
from app.schemas.schemas import DeviceCreate, DeviceResponse
from app.services.auth import get_current_user

router = APIRouter()

@router.get("/", response_model=List[DeviceResponse])
def get_devices(db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    return db.query(Device).filter(Device.owner_id == current_user.id).all()

@router.post("/", response_model=DeviceResponse)
def create_device(device: DeviceCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    db_device = Device(
        device_name=device.device_name,
        device_type=device.device_type,
        serial_number=device.serial_number,
        owner_id=current_user.id
    )
    db.add(db_device)
    db.commit()
    db.refresh(db_device)
    return db_device

@router.get("/{device_id}", response_model=DeviceResponse)
def get_device(device_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    device = db.query(Device).filter(Device.id == device_id, Device.owner_id == current_user.id).first()
    if not device:
        raise HTTPException(status_code=404, detail="Device not found")
    return device
