# CalZero 배포 가이드

## 추천 플랫폼: Railway

[Railway](https://railway.app)는 GitHub 연동 자동 배포, Persistent Volume, Docker 지원을 제공하여 CalZero에 가장 적합하다.

---

## Railway 배포 절차

### 1. 사전 준비

- [Railway 계정](https://railway.app) 생성 (GitHub 계정으로 가입 가능)
- CalZero GitHub 저장소 준비

### 2. 프로젝트 생성

1. Railway Dashboard → **New Project**
2. **Deploy from GitHub repo** 선택
3. CalZero 저장소 선택
4. Railway가 `Dockerfile`을 자동 감지하여 빌드 시작

### 3. 환경변수 설정

Railway Dashboard → **Variables** 탭에서 추가:

| 변수 | 값 | 필수 |
|------|-----|:---:|
| `SECRET_KEY` | 강력한 랜덤 키 | O |
| `DATA_DIR` | `/data` | O |
| `PORT` | `8000` | - (기본값) |

**SECRET_KEY 생성 방법**:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

### 4. Persistent Volume 생성

데이터 영속성을 위해 Volume을 연결한다.

1. Railway Dashboard → 서비스 클릭 → **Volumes** 탭
2. **Add Volume** 클릭
3. 설정:
   - **Mount Path**: `/data`
   - **Size**: 1GB (충분)
4. **Create** 클릭

> Volume이 `/data`에 마운트되면, `DATA_DIR=/data` 환경변수와 연동되어 재배포 후에도 데이터가 유지된다.

### 5. 배포 확인

1. Railway가 자동으로 빌드 및 배포 진행
2. 배포 완료 후 제공되는 URL 확인
3. Health check: `https://your-app.up.railway.app/api/health`
4. 프론트엔드: `https://your-app.up.railway.app/`

### 6. 자동 배포

- `main` 브랜치에 push → Railway 자동 재배포
- PR 머지 시에도 자동 트리거

---

## 로컬 Docker 테스트

배포 전 로컬에서 테스트:

```bash
# 빌드
docker build -t calzero .

# 실행 (Volume 마운트 포함)
docker run -p 8000:8000 \
  -v $(pwd)/backend/data:/data \
  -e SECRET_KEY=test-secret-key \
  -e DATA_DIR=/data \
  calzero

# 확인
curl http://localhost:8000/api/health
```

---

## 비용

| 항목 | Railway |
|------|---------|
| 무료 크레딧 | $5/월 |
| 컴퓨팅 | $0.000463/min (vCPU) |
| 메모리 | $0.000231/min (GB) |
| Volume | $0.25/GB/월 |
| 예상 월 비용 | **$0 ~ $3** (소규모 앱) |

---

## 대안 플랫폼

### Fly.io (2순위)

- 무료 Volume 3GB, Tokyo 리전
- CLI 기반 배포 (`flyctl deploy`)
- 설정: `fly.toml` 필요

```bash
# 설치
curl -L https://fly.io/install.sh | sh

# 배포
fly launch
fly volumes create calzero_data --size 1 --region nrt
fly deploy
```

### Render (3순위)

- GitHub 연동 자동 배포
- 무료 티어: 15분 비활성 시 sleep
- Persistent Disk: 유료 플랜($7/월+)만 지원

### AWS Lightsail

- Seoul 리전, $3.50/월
- 자동 배포 없음 (GitHub Actions 설정 필요)
- 내장 SSD 스토리지

---

## 트러블슈팅

### 빌드 실패

| 증상 | 해결 |
|------|------|
| `styleText` import 에러 | Dockerfile에서 `node:22-alpine` 사용 확인 |
| npm install 실패 | `frontend/package-lock.json` 포함 확인 |
| Python 의존성 에러 | `requirements.txt` 확인 |

### 데이터 초기화됨

- **Volume이 마운트되었는지 확인**: Railway Dashboard → Volumes
- **DATA_DIR 환경변수 확인**: `/data`로 설정되어 있는지
- Volume 없이 배포하면 컨테이너 재시작 시 데이터 소실

### 포트 에러

- Railway는 `PORT` 환경변수를 자동 설정
- `backend/main.py`에서 `PORT` 환경변수를 사용 중 (기본 8000)
