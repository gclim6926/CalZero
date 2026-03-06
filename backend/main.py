from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, EmailStr
from typing import Optional, List
from datetime import datetime, timedelta, timezone
import bcrypt
import jwt
import json
import os
import shutil

# ==================== Config ====================

SECRET_KEY = os.getenv("SECRET_KEY", "calzero-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_HOURS = 24

# 데이터 디렉토리 구조
DATA_DIR = os.getenv("DATA_DIR", os.path.join(os.path.dirname(__file__), "data"))
USERS_FILE = os.path.join(DATA_DIR, "users.json")
DEVICES_FILE = os.path.join(DATA_DIR, "devices.json")
CALIBRATIONS_DIR = os.path.join(DATA_DIR, "calibrations")

security = HTTPBearer(auto_error=False)

# 한국 시간대 (KST = UTC+9)
KST = timezone(timedelta(hours=9))

def get_kst_now():
    """현재 한국 시간 반환"""
    return datetime.now(KST)


# ==================== 파일 유틸리티 ====================

def ensure_data_dirs():
    """데이터 디렉토리 생성"""
    os.makedirs(DATA_DIR, exist_ok=True)
    os.makedirs(CALIBRATIONS_DIR, exist_ok=True)


def load_json(filepath, default=None):
    """JSON 파일 로드"""
    if default is None:
        default = []
    if os.path.exists(filepath):
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            return default
    return default


def save_json(filepath, data):
    """JSON 파일 저장"""
    os.makedirs(os.path.dirname(filepath), exist_ok=True)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


def get_device_calib_dir(device_id: int):
    """장치별 캘리브레이션 디렉토리"""
    return os.path.join(CALIBRATIONS_DIR, f"device_{device_id}")


def get_calib_file(device_id: int, calib_type: str):
    """캘리브레이션 파일 경로"""
    return os.path.join(get_device_calib_dir(device_id), f"{calib_type}.json")


def get_next_id(items: list):
    """다음 ID 생성"""
    if not items:
        return 1
    return max(item.get('id', 0) for item in items) + 1


# ==================== Pydantic Schemas ====================

class UserRegister(BaseModel):
    email: EmailStr
    password: str
    name: str


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    role: str
    created_at: str


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class DeviceCreate(BaseModel):
    name: str
    type: str = "so101_follower"
    status: str = "offline"
    location: str = ""
    manager: str = ""
    description: str = ""
    ip_address: str = ""
    port: Optional[int] = None
    serial_number: str = ""
    manufacturer: str = ""
    model: str = ""
    firmware_version: str = ""
    usd_file_path: str = ""
    target_device_ids: List[int] = []


class DeviceUpdate(BaseModel):
    name: str
    type: str
    status: str
    location: str = ""
    manager: str = ""
    description: str = ""
    ip_address: str = ""
    port: Optional[int] = None
    serial_number: str = ""
    manufacturer: str = ""
    model: str = ""
    firmware_version: str = ""
    usd_file_path: str = ""
    target_device_ids: List[int] = []


class ActuatorCalibrationCreate(BaseModel):
    device_id: int
    notes: str = ""
    calibration_data: dict


class IntrinsicCalibrationCreate(BaseModel):
    device_id: int
    camera: str
    camera_matrix: List[List[float]]
    dist_coeffs: List[float]
    image_size: List[int]
    rms_error: float
    notes: str = ""


class ExtrinsicCalibrationCreate(BaseModel):
    device_id: int
    camera: str
    intrinsic_id: Optional[int] = None
    rotation_vector: List[float]
    translation_vector: List[float]
    rotation_matrix: List[List[float]]
    reprojection_error: float
    notes: str = ""


class HandEyeCalibrationCreate(BaseModel):
    device_id: int
    camera: str
    type: str
    intrinsic_id: Optional[int] = None
    transformation_matrix: List[List[float]]
    translation: List[float]
    rotation_matrix: List[List[float]]
    rotation_euler: List[float]
    poses_count: int
    reprojection_error: float
    is_active: bool = False
    notes: str = ""


class ReplayTestPosition(BaseModel):
    position: int
    error_x: float
    error_y: float
    error_z: float


class ReplayTestCreate(BaseModel):
    device_id: int
    calibration_id: Optional[int] = None
    positions: List[ReplayTestPosition]
    notes: str = ""


# ==================== FastAPI App ====================

app = FastAPI(title="CalZero API", version="0.3.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ==================== Auth Helpers ====================

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))


def create_token(user_id: int, email: str) -> str:
    expire = get_kst_now() + timedelta(hours=ACCESS_TOKEN_EXPIRE_HOURS)
    payload = {"sub": str(user_id), "email": email, "exp": expire}
    return jwt.encode(payload, SECRET_KEY, algorithm=ALGORITHM)


def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = int(payload.get("sub"))
        users = load_json(USERS_FILE, [])
        user = next((u for u in users if u['id'] == user_id), None)
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


# ==================== Auth Endpoints ====================

@app.post("/api/auth/register", response_model=TokenResponse)
def register(user: UserRegister):
    users = load_json(USERS_FILE, [])

    if any(u['email'] == user.email for u in users):
        raise HTTPException(status_code=400, detail="Email already registered")

    user_data = {
        'id': get_next_id(users),
        'email': user.email,
        'password': hash_password(user.password),
        'name': user.name,
        'role': 'user',
        'created_at': get_kst_now().isoformat()
    }
    users.append(user_data)
    save_json(USERS_FILE, users)

    token = create_token(user_data['id'], user_data['email'])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user_data['id'],
            "email": user_data['email'],
            "name": user_data['name'],
            "role": user_data['role'],
            "created_at": user_data['created_at']
        }
    }


@app.post("/api/auth/login", response_model=TokenResponse)
def login(user: UserLogin):
    users = load_json(USERS_FILE, [])
    db_user = next((u for u in users if u['email'] == user.email), None)

    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid email or password")
    if not verify_password(user.password, db_user['password']):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(db_user['id'], db_user['email'])
    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": db_user['id'],
            "email": db_user['email'],
            "name": db_user['name'],
            "role": db_user['role'],
            "created_at": db_user['created_at']
        }
    }


@app.get("/api/auth/me", response_model=UserResponse)
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "id": current_user['id'],
        "email": current_user['email'],
        "name": current_user['name'],
        "role": current_user['role'],
        "created_at": current_user['created_at']
    }


# ==================== Device Endpoints ====================

@app.get("/api/devices")
def get_devices():
    return load_json(DEVICES_FILE, [])


@app.post("/api/devices")
def create_device(device: DeviceCreate):
    devices = load_json(DEVICES_FILE, [])

    data = device.dict()
    data['id'] = get_next_id(devices)
    data['created_at'] = get_kst_now().isoformat()

    # 장치별 캘리브레이션 디렉토리 생성
    device_dir = get_device_calib_dir(data['id'])
    os.makedirs(device_dir, exist_ok=True)

    devices.append(data)
    save_json(DEVICES_FILE, devices)
    return data


@app.put("/api/devices/{device_id}")
def update_device(device_id: int, device: DeviceUpdate):
    devices = load_json(DEVICES_FILE, [])

    idx = next((i for i, d in enumerate(devices) if d['id'] == device_id), None)
    if idx is None:
        raise HTTPException(status_code=404, detail="Device not found")

    update_data = device.dict()
    update_data['id'] = device_id
    update_data['created_at'] = devices[idx].get('created_at', get_kst_now().isoformat())
    update_data['updated_at'] = get_kst_now().isoformat()

    devices[idx] = update_data
    save_json(DEVICES_FILE, devices)
    return update_data


@app.delete("/api/devices/{device_id}")
def delete_device(device_id: int):
    devices = load_json(DEVICES_FILE, [])

    if not any(d['id'] == device_id for d in devices):
        raise HTTPException(status_code=404, detail="Device not found")

    # 장치 삭제
    devices = [d for d in devices if d['id'] != device_id]
    save_json(DEVICES_FILE, devices)

    # 관련 캘리브레이션 디렉토리 삭제
    device_dir = get_device_calib_dir(device_id)
    if os.path.exists(device_dir):
        shutil.rmtree(device_dir)

    return {"message": "Device and related calibrations deleted"}


# ==================== Actuator Calibration Endpoints ====================

@app.get("/api/calibrations/actuator")
def get_actuator_calibrations(device_id: Optional[int] = None):
    if device_id:
        calibs = load_json(get_calib_file(device_id, "actuator"), [])
        return sorted(calibs, key=lambda x: x.get('created_at', ''), reverse=True)

    # 모든 장치의 캘리브레이션
    devices = load_json(DEVICES_FILE, [])
    all_calibs = []
    for device in devices:
        calibs = load_json(get_calib_file(device['id'], "actuator"), [])
        all_calibs.extend(calibs)
    return sorted(all_calibs, key=lambda x: x.get('created_at', ''), reverse=True)


@app.post("/api/calibrations/actuator")
def create_actuator_calibration(calib: ActuatorCalibrationCreate):
    device_id = calib.device_id
    filepath = get_calib_file(device_id, "actuator")
    calibs = load_json(filepath, [])

    data = calib.dict()
    data['id'] = get_next_id(calibs)
    data['created_at'] = get_kst_now().isoformat()

    calibs.append(data)
    save_json(filepath, calibs)
    return data


@app.delete("/api/calibrations/actuator/{calib_id}")
def delete_actuator_calibration(calib_id: int, device_id: int):
    filepath = get_calib_file(device_id, "actuator")
    calibs = load_json(filepath, [])

    if not any(c['id'] == calib_id for c in calibs):
        raise HTTPException(status_code=404, detail="Calibration not found")

    calibs = [c for c in calibs if c['id'] != calib_id]
    save_json(filepath, calibs)
    return {"message": "Calibration deleted"}


# ==================== Intrinsic Calibration Endpoints ====================

@app.get("/api/calibrations/intrinsic")
def get_intrinsic_calibrations(device_id: Optional[int] = None, camera: Optional[str] = None):
    if device_id:
        calibs = load_json(get_calib_file(device_id, "intrinsic"), [])
    else:
        devices = load_json(DEVICES_FILE, [])
        calibs = []
        for device in devices:
            calibs.extend(load_json(get_calib_file(device['id'], "intrinsic"), []))

    if camera:
        calibs = [c for c in calibs if c.get('camera') == camera]

    return sorted(calibs, key=lambda x: x.get('created_at', ''), reverse=True)


@app.post("/api/calibrations/intrinsic")
def create_intrinsic_calibration(calib: IntrinsicCalibrationCreate):
    device_id = calib.device_id
    filepath = get_calib_file(device_id, "intrinsic")
    calibs = load_json(filepath, [])

    data = calib.dict()
    data['id'] = get_next_id(calibs)
    data['created_at'] = get_kst_now().isoformat()

    calibs.append(data)
    save_json(filepath, calibs)
    return data


@app.delete("/api/calibrations/intrinsic/{calib_id}")
def delete_intrinsic_calibration(calib_id: int, device_id: int):
    filepath = get_calib_file(device_id, "intrinsic")
    calibs = load_json(filepath, [])

    if not any(c['id'] == calib_id for c in calibs):
        raise HTTPException(status_code=404, detail="Calibration not found")

    calibs = [c for c in calibs if c['id'] != calib_id]
    save_json(filepath, calibs)
    return {"message": "Calibration deleted"}


# ==================== Extrinsic Calibration Endpoints ====================

@app.get("/api/calibrations/extrinsic")
def get_extrinsic_calibrations(device_id: Optional[int] = None, camera: Optional[str] = None):
    if device_id:
        calibs = load_json(get_calib_file(device_id, "extrinsic"), [])
    else:
        devices = load_json(DEVICES_FILE, [])
        calibs = []
        for device in devices:
            calibs.extend(load_json(get_calib_file(device['id'], "extrinsic"), []))

    if camera:
        calibs = [c for c in calibs if c.get('camera') == camera]

    return sorted(calibs, key=lambda x: x.get('created_at', ''), reverse=True)


@app.post("/api/calibrations/extrinsic")
def create_extrinsic_calibration(calib: ExtrinsicCalibrationCreate):
    device_id = calib.device_id
    filepath = get_calib_file(device_id, "extrinsic")
    calibs = load_json(filepath, [])

    data = calib.dict()
    data['id'] = get_next_id(calibs)
    data['created_at'] = get_kst_now().isoformat()

    calibs.append(data)
    save_json(filepath, calibs)
    return data


@app.delete("/api/calibrations/extrinsic/{calib_id}")
def delete_extrinsic_calibration(calib_id: int, device_id: int):
    filepath = get_calib_file(device_id, "extrinsic")
    calibs = load_json(filepath, [])

    if not any(c['id'] == calib_id for c in calibs):
        raise HTTPException(status_code=404, detail="Calibration not found")

    calibs = [c for c in calibs if c['id'] != calib_id]
    save_json(filepath, calibs)
    return {"message": "Calibration deleted"}


# ==================== Hand-Eye Calibration Endpoints ====================

@app.get("/api/calibrations/handeye")
def get_handeye_calibrations(device_id: Optional[int] = None, camera: Optional[str] = None):
    if device_id:
        calibs = load_json(get_calib_file(device_id, "handeye"), [])
    else:
        devices = load_json(DEVICES_FILE, [])
        calibs = []
        for device in devices:
            calibs.extend(load_json(get_calib_file(device['id'], "handeye"), []))

    if camera:
        calibs = [c for c in calibs if c.get('camera') == camera]

    return sorted(calibs, key=lambda x: x.get('created_at', ''), reverse=True)


@app.post("/api/calibrations/handeye")
def create_handeye_calibration(calib: HandEyeCalibrationCreate):
    device_id = calib.device_id
    filepath = get_calib_file(device_id, "handeye")
    calibs = load_json(filepath, [])

    data = calib.dict()
    data['id'] = get_next_id(calibs)
    data['created_at'] = get_kst_now().isoformat()

    # 같은 device+camera의 기존 active 해제
    if data.get('is_active'):
        for c in calibs:
            if c.get('camera') == data['camera']:
                c['is_active'] = False

    calibs.append(data)
    save_json(filepath, calibs)
    return data


@app.put("/api/calibrations/handeye/{calib_id}/activate")
def activate_handeye_calibration(calib_id: int, device_id: int):
    filepath = get_calib_file(device_id, "handeye")
    calibs = load_json(filepath, [])

    calib = next((c for c in calibs if c['id'] == calib_id), None)
    if not calib:
        raise HTTPException(status_code=404, detail="Calibration not found")

    # 같은 camera의 기존 active 해제
    for c in calibs:
        if c.get('camera') == calib['camera']:
            c['is_active'] = False

    calib['is_active'] = True
    save_json(filepath, calibs)
    return {"message": "Calibration activated"}


@app.delete("/api/calibrations/handeye/{calib_id}")
def delete_handeye_calibration(calib_id: int, device_id: int):
    filepath = get_calib_file(device_id, "handeye")
    calibs = load_json(filepath, [])

    if not any(c['id'] == calib_id for c in calibs):
        raise HTTPException(status_code=404, detail="Calibration not found")

    calibs = [c for c in calibs if c['id'] != calib_id]
    save_json(filepath, calibs)
    return {"message": "Calibration deleted"}


# ==================== Replay Test Endpoints ====================

@app.get("/api/replay-tests")
def get_replay_tests(device_id: Optional[int] = None):
    """리플레이 테스트 목록 조회"""
    if device_id:
        calibs = load_json(get_calib_file(device_id, "replay"), [])
        return sorted(calibs, key=lambda x: x.get('created_at', ''), reverse=True)

    # 모든 장치의 테스트
    devices = load_json(DEVICES_FILE, [])
    all_tests = []
    for device in devices:
        tests = load_json(get_calib_file(device['id'], "replay"), [])
        all_tests.extend(tests)
    return sorted(all_tests, key=lambda x: x.get('created_at', ''), reverse=True)


@app.post("/api/replay-tests")
def create_replay_test(test: ReplayTestCreate):
    """새 리플레이 테스트 저장"""
    import math

    device_id = test.device_id
    filepath = get_calib_file(device_id, "replay")
    tests = load_json(filepath, [])

    # 각 위치별 거리 계산 및 통계
    positions_data = []
    distances = []
    for pos in test.positions:
        distance = math.sqrt(pos.error_x**2 + pos.error_y**2 + pos.error_z**2)
        distances.append(distance)
        positions_data.append({
            "position": pos.position,
            "error_x": pos.error_x,
            "error_y": pos.error_y,
            "error_z": pos.error_z,
            "distance": round(distance, 3)
        })

    data = {
        "id": get_next_id(tests),
        "device_id": device_id,
        "calibration_id": test.calibration_id,
        "positions": positions_data,
        "avg_error": round(sum(distances) / len(distances), 3) if distances else 0,
        "max_error": round(max(distances), 3) if distances else 0,
        "notes": test.notes,
        "created_at": get_kst_now().isoformat()
    }

    tests.append(data)
    save_json(filepath, tests)
    return data


@app.delete("/api/replay-tests/{test_id}")
def delete_replay_test(test_id: int, device_id: int):
    """리플레이 테스트 삭제"""
    filepath = get_calib_file(device_id, "replay")
    tests = load_json(filepath, [])

    if not any(t['id'] == test_id for t in tests):
        raise HTTPException(status_code=404, detail="Test not found")

    tests = [t for t in tests if t['id'] != test_id]
    save_json(filepath, tests)
    return {"message": "Test deleted"}


# ==================== Health Check ====================

@app.get("/api/health")
def health_check():
    return {
        "status": "ok",
        "version": "0.3.0",
        "data_dir": DATA_DIR,
        "structure": "file-based"
    }


# ==================== Backup/Restore API ====================

@app.get("/api/backup")
def create_backup():
    """전체 데이터 백업 생성"""
    backup_data = {
        "version": "0.3.0",
        "created_at": get_kst_now().isoformat(),
        "users": load_json(USERS_FILE, []),
        "devices": load_json(DEVICES_FILE, []),
        "calibrations": {}
    }

    # 모든 장치의 캘리브레이션 수집
    devices = backup_data["devices"]
    for device in devices:
        device_id = device["id"]
        device_calibs = {}

        for calib_type in ["actuator", "intrinsic", "extrinsic", "handeye", "replay"]:
            filepath = get_calib_file(device_id, calib_type)
            calibs = load_json(filepath, [])
            if calibs:
                device_calibs[calib_type] = calibs

        if device_calibs:
            backup_data["calibrations"][f"device_{device_id}"] = device_calibs

    # 통계 정보 추가
    total_calibrations = sum(
        len(calibs)
        for device_calibs in backup_data["calibrations"].values()
        for calibs in device_calibs.values()
    )
    backup_data["stats"] = {
        "users_count": len(backup_data["users"]),
        "devices_count": len(backup_data["devices"]),
        "calibrations_count": total_calibrations
    }

    return backup_data


@app.post("/api/restore")
def restore_backup(backup_data: dict):
    """백업 데이터 복원"""
    try:
        # 버전 확인
        version = backup_data.get("version", "unknown")

        # 사용자 복원 (비밀번호 해시 유지)
        if "users" in backup_data:
            save_json(USERS_FILE, backup_data["users"])

        # 장치 복원
        if "devices" in backup_data:
            save_json(DEVICES_FILE, backup_data["devices"])

        # 캘리브레이션 복원
        if "calibrations" in backup_data:
            for device_key, device_calibs in backup_data["calibrations"].items():
                # device_key: "device_1", "device_2", ...
                device_id = int(device_key.replace("device_", ""))
                device_dir = get_device_calib_dir(device_id)
                os.makedirs(device_dir, exist_ok=True)

                for calib_type, calibs in device_calibs.items():
                    filepath = get_calib_file(device_id, calib_type)
                    save_json(filepath, calibs)

        return {
            "success": True,
            "message": "백업이 복원되었습니다.",
            "version": version,
            "stats": backup_data.get("stats", {})
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"복원 실패: {str(e)}")


@app.delete("/api/reset")
def reset_all_data():
    """전체 데이터 초기화 (위험!)"""
    try:
        # 캘리브레이션 디렉토리 삭제
        if os.path.exists(CALIBRATIONS_DIR):
            shutil.rmtree(CALIBRATIONS_DIR)
        os.makedirs(CALIBRATIONS_DIR, exist_ok=True)

        # 장치 초기화
        save_json(DEVICES_FILE, [])

        # 사용자는 유지 (로그인 필요하므로)

        return {"success": True, "message": "모든 데이터가 초기화되었습니다."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"초기화 실패: {str(e)}")


# ==================== Initialize ====================

@app.on_event("startup")
def startup_event():
    ensure_data_dirs()

    # 기본 사용자 생성
    users = load_json(USERS_FILE, [])
    if not users:
        users.append({
            'id': 1,
            'email': 'test@test.com',
            'password': hash_password('test1234'),
            'name': 'Test User',
            'role': 'admin',
            'created_at': get_kst_now().isoformat()
        })
        save_json(USERS_FILE, users)
        print("✅ Sample user created (test@test.com / test1234)")

    print(f"📁 Data directory: {DATA_DIR}")
    print("🚀 CalZero API v0.3.0 started")


# ==================== Frontend Static Files ====================

# 절대 경로로 변환하여 Docker/로컬 모두 안정적으로 동작
BASE_DIR = os.path.dirname(os.path.abspath(__file__))

# Docker: /app/frontend/dist, 로컬: /app/static
STATIC_DIR = os.path.join(BASE_DIR, "frontend", "dist")
if not os.path.exists(STATIC_DIR):
    STATIC_DIR = os.path.join(BASE_DIR, "static")

print(f"📂 Static directory: {STATIC_DIR} (exists: {os.path.exists(STATIC_DIR)})")

if os.path.exists(STATIC_DIR):
    assets_dir = os.path.join(STATIC_DIR, "assets")
    if os.path.exists(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(full_path: str):
        file_path = os.path.join(STATIC_DIR, full_path)
        if os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(STATIC_DIR, "index.html"))

if __name__ == "__main__":
    import uvicorn

    port = int(os.getenv("PORT", 8000))
    uvicorn.run(app, host="0.0.0.0", port=port)
