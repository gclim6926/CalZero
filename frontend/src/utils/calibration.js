// Pyodide를 사용한 카메라 캘리브레이션

let pyodideReady = false;
let pyodideInstance = null;

export const initPyodide = async () => {
  if (pyodideReady) return pyodideInstance;
  
  console.log('[Pyodide] 초기화 시작...');
  pyodideInstance = await loadPyodide();
  
  console.log('[Pyodide] OpenCV 설치 중...');
  await pyodideInstance.loadPackage(['numpy', 'opencv-python']);
  
  console.log('[Pyodide] 준비 완료!');
  pyodideReady = true;
  return pyodideInstance;
};

export const runCalibration = async (imageDataList, boardConfig) => {
  const pyodide = await initPyodide();
  
  const { cols, rows, squareSize } = boardConfig;
  
  // Python 코드
  const pythonCode = `
import numpy as np
import cv2
import base64
from io import BytesIO

def calibrate_camera(image_data_list, cols, rows, square_size):
    # 체커보드 코너 찾기 기준
    criteria = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.001)
    
    # 3D 점 준비 (0,0,0), (1,0,0), (2,0,0) ...
    objp = np.zeros((rows * cols, 3), np.float32)
    objp[:, :2] = np.mgrid[0:cols, 0:rows].T.reshape(-1, 2)
    objp *= square_size
    
    obj_points = []  # 3D 점
    img_points = []  # 2D 점
    
    img_size = None
    detected_count = 0
    results = []
    
    for i, img_data in enumerate(image_data_list):
        # Base64 디코딩
        img_bytes = base64.b64decode(img_data)
        nparr = np.frombuffer(img_bytes, np.uint8)
        img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        
        if img is None:
            results.append({'index': i, 'detected': False})
            continue
            
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        if img_size is None:
            img_size = gray.shape[::-1]
        
        # 체커보드 코너 찾기
        ret, corners = cv2.findChessboardCorners(gray, (cols, rows), None)
        
        if ret:
            obj_points.append(objp)
            corners2 = cv2.cornerSubPix(gray, corners, (11, 11), (-1, -1), criteria)
            img_points.append(corners2)
            detected_count += 1
            results.append({'index': i, 'detected': True})
        else:
            results.append({'index': i, 'detected': False})
    
    if detected_count < 3:
        return {
            'success': False,
            'error': f'최소 3장의 이미지에서 코너가 검출되어야 합니다. (검출: {detected_count}장)',
            'detection_results': results
        }
    
    # 캘리브레이션 실행
    ret, camera_matrix, dist_coeffs, rvecs, tvecs = cv2.calibrateCamera(
        obj_points, img_points, img_size, None, None
    )
    
    return {
        'success': True,
        'rms_error': ret,
        'camera_matrix': {
            'fx': camera_matrix[0, 0],
            'fy': camera_matrix[1, 1],
            'cx': camera_matrix[0, 2],
            'cy': camera_matrix[1, 2]
        },
        'dist_coeffs': dist_coeffs.flatten().tolist(),
        'image_size': {'width': img_size[0], 'height': img_size[1]},
        'image_count': detected_count,
        'detection_results': results
    }

# 실행
result = calibrate_camera(image_data_list, cols, rows, square_size)
result
`;

  // 이미지들을 Base64로 변환
  const imageBase64List = await Promise.all(
    imageDataList.map(async (imgData) => {
      if (imgData.startsWith('data:')) {
        return imgData.split(',')[1];
      }
      // URL인 경우 fetch
      const response = await fetch(imgData);
      const blob = await response.blob();
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result.split(',')[1]);
        reader.readAsDataURL(blob);
      });
    })
  );

  // Python에 데이터 전달
  pyodide.globals.set('image_data_list', imageBase64List);
  pyodide.globals.set('cols', cols);
  pyodide.globals.set('rows', rows);
  pyodide.globals.set('square_size', squareSize);

  // Python 실행
  const result = await pyodide.runPythonAsync(pythonCode);
  return result.toJs({ dict_converter: Object.fromEntries });
};

export const isPyodideReady = () => pyodideReady;
