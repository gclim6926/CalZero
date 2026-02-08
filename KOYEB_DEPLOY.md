 > [frontend-builder 6/6] RUN npm run build:
0.288 file:///app/frontend/node_modules/rolldown/dist/shared/src-CYkh2Ybc.mjs:8
0.288 import { styleText } from "node:util";
0.288          ^^^^^^^^^
0.288 SyntaxError: The requested module 'node:util' does not provide an export named 'styleText'
0.288     at ModuleJob._instantiate (node:internal/modules/esm/module_job:123:21)
0.288     at async ModuleJob.run (node:internal/modules/esm/module_job:191:5)
0.288     at async ModuleLoader.import (node:internal/modules/esm/loader:337:24)
0.288     at async CAC.<anonymous> (file:///app/frontend/node_modules/vite/dist/node/cli.js:626:28)
0.288 
0.288 Node.js v18.20.8
------
Dockerfile:10
--------------------
   8 |     RUN npm install
   9 |     COPY frontend/ ./
  10 | >>> RUN npm run build
  11 |     
  12 |     # ============================================
--------------------
error: failed to solve: process "/bin/sh -c npm run build" did not complete successfully: exit code: 1
# Koyeb 배포 가이드

## 준비사항

1. Koyeb 계정 생성 (https://koyeb.com)
2. GitHub 저장소 연결

## 배포 설정

### 1. Koyeb 앱 생성

1. Koyeb Dashboard에서 **Create App** 클릭
2. **GitHub**에서 저장소 선택
3. 빌드 설정:
   - **Builder**: Dockerfile
   - **Dockerfile path**: `./Dockerfile`
   - **Port**: `8000`

### 2. 환경변수 설정 (Environment Variables)

**필수 환경변수**:

```
SECRET_KEY=your-secret-key-here-change-this
```

> 🔒 **중요**: 프로덕션에서는 반드시 강력한 SECRET_KEY를 설정하세요!
>
> 생성 예시:
> ```bash
> python -c "import secrets; print(secrets.token_urlsafe(32))"
> ```

### 3. 리소스 설정 (무료 플랜)

- **Instance Type**: Nano (Free)
- **Regions**: 가까운 리전 선택 (예: Singapore)
- **Scaling**: 1 instance (무료 플랜)

### 4. Health Check 설정

- **Health check path**: `/health` 또는 `/`
- **Port**: `8000`

## 무료 플랜 제약사항

- ⚠️ **Ephemeral Storage**: 앱 재시작 시 데이터 초기화됨
  - 영구 데이터 저장 필요 시 외부 DB 사용 (PostgreSQL, MongoDB 등)
- **메모리**: 512MB
- **CPU**: 0.1 vCPU
- **Sleep**: 비활성 시 자동 sleep (무료 플랜)

## 배포 후 확인

1. 배포 완료 후 Koyeb이 제공하는 URL 확인
2. Health check: `https://your-app.koyeb.app/health`
3. Frontend: `https://your-app.koyeb.app/`
4. API: `https://your-app.koyeb.app/api/...`

## 문제 해결

### 빌드 실패

- Logs 탭에서 빌드 로그 확인
- Dockerfile 문법 오류 체크

### 앱 실행 실패

- Environment Variables가 올바르게 설정되었는지 확인
- Port 8000이 올바르게 설정되었는지 확인

### 데이터가 사라짐

- 무료 플랜은 ephemeral storage 사용
- 영구 저장이 필요한 경우:
  - Koyeb Postgres 연동
  - 외부 DB 서비스 사용 (Supabase, PlanetScale 등)

## 로컬 테스트

배포 전 로컬에서 Docker로 테스트:

```bash
# Build
docker build -t calzero .

# Run
docker run -p 8000:8000 -e SECRET_KEY=test-key calzero

# Test
curl http://localhost:8000/health
```

## 지속적 배포

- GitHub에 push하면 자동으로 Koyeb에 배포됩니다
- `main` 브랜치를 프로덕션으로 사용하는 것을 권장
