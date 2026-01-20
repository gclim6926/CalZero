from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app.routes import auth, devices, calibrations

# 테이블 생성
Base.metadata.create_all(bind=engine)

app = FastAPI(title="RoboCalib", description="Robot Calibration Manager")

# CORS 설정
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 라우터 등록
app.include_router(auth.router, prefix="/api/auth", tags=["Auth"])
app.include_router(devices.router, prefix="/api/devices", tags=["Devices"])
app.include_router(calibrations.router, prefix="/api/calibrations", tags=["Calibrations"])

@app.get("/")
def root():
    return {"message": "Welcome to RoboCalib API"}
