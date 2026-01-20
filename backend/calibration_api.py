from fastapi import FastAPI, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import json
from typing import List
import io

app = FastAPI(title="RoboCalib API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"status": "ok", "message": "RoboCalib Calibration API"}

@app.post("/calibrate")
async def calibrate_camera(
    files: List[UploadFile] = File(...),
    corners_x: int = Form(9),
    corners_y: int = Form(6),
    square_size: float = Form(24.0)
):
    """
    체커보드 이미지로 카메라 캘리브레이션 수행
    """
    # 3D 좌표 (체커보드 평면)
    objp = np.zeros((corners_x * corners_y, 3), np.float32)
    objp[:, :2] = np.mgrid[0:corners_x, 0:corners_y].T.reshape(-1, 2)
    objp *= square_size
    
    objpoints = []  # 3D points
    imgpoints = []  # 2D points
    image_size = None
    
    results = []
    
    for file in files:
        # 이미지 읽기
        contents = await file.read()
        nparr = np.frombuffer(contents, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            results.append({"filename": file.filename, "status": "failed", "reason": "이미지 읽기 실패"})
            continue
        
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        if image_size is None:
            image_size = gray.shape[::-1]
        
        # 체커보드 코너 검출
        ret, corners = cv2.findChessboardCorners(
            gray, 
            (corners_x, corners_y),
            cv2.CALIB_CB_ADAPTIVE_THRESH + cv2.CALIB_CB_NORMALIZE_IMAGE
        )
        
        if ret:
            # 서브픽셀 정확도로 개선
            criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001)
            corners2 = cv2.cornerSubPix(gray, corners, (11, 11), (-1, -1), criteria)
            
            objpoints.append(objp)
            imgpoints.append(corners2)
            
            results.append({
                "filename": file.filename, 
                "status": "success",
                "corners_found": len(corners2)
            })
        else:
            results.append({
                "filename": file.filename, 
                "status": "failed",
                "reason": "코너 검출 실패"
            })
    
    # 최소 3장 필요
    if len(objpoints) < 3:
        return {
            "success": False,
            "error": f"최소 3장 이상의 유효한 이미지가 필요합니다. (현재: {len(objpoints)}장)",
            "image_results": results
        }
    
    # 캘리브레이션 실행
    ret, camera_matrix, dist_coeffs, rvecs, tvecs = cv2.calibrateCamera(
        objpoints, imgpoints, image_size, None, None
    )
    
    # 재투영 오차 계산
    total_error = 0
    for i in range(len(objpoints)):
        imgpoints2, _ = cv2.projectPoints(objpoints[i], rvecs[i], tvecs[i], camera_matrix, dist_coeffs)
        error = cv2.norm(imgpoints[i], imgpoints2, cv2.NORM_L2) / len(imgpoints2)
        total_error += error
    mean_error = total_error / len(objpoints)
    
    return {
        "success": True,
        "camera_matrix": {
            "fx": float(camera_matrix[0, 0]),
            "fy": float(camera_matrix[1, 1]),
            "cx": float(camera_matrix[0, 2]),
            "cy": float(camera_matrix[1, 2]),
            "matrix": camera_matrix.tolist()
        },
        "distortion": {
            "k1": float(dist_coeffs[0, 0]),
            "k2": float(dist_coeffs[0, 1]),
            "p1": float(dist_coeffs[0, 2]),
            "p2": float(dist_coeffs[0, 3]),
            "k3": float(dist_coeffs[0, 4]) if dist_coeffs.shape[1] > 4 else 0.0,
            "coefficients": dist_coeffs.tolist()
        },
        "reprojection_error": float(mean_error),
        "image_size": {"width": image_size[0], "height": image_size[1]},
        "used_images": len(objpoints),
        "total_images": len(files),
        "image_results": results
    }

@app.post("/detect-corners")
async def detect_corners(
    file: UploadFile = File(...),
    corners_x: int = Form(9),
    corners_y: int = Form(6)
):
    """
    단일 이미지에서 코너 검출 테스트
    """
    contents = await file.read()
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    if img is None:
        return {"success": False, "error": "이미지 읽기 실패"}
    
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    
    ret, corners = cv2.findChessboardCorners(
        gray, 
        (corners_x, corners_y),
        cv2.CALIB_CB_ADAPTIVE_THRESH + cv2.CALIB_CB_NORMALIZE_IMAGE
    )
    
    if ret:
        return {
            "success": True,
            "found": True,
            "corners_count": len(corners),
            "image_size": {"width": img.shape[1], "height": img.shape[0]}
        }
    else:
        return {
            "success": True,
            "found": False,
            "image_size": {"width": img.shape[1], "height": img.shape[0]}
        }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8001)
