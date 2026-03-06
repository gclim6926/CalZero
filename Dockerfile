# ============================================
# Stage 1: Build Frontend
# ============================================
FROM node:22 AS frontend-builder

WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm install
COPY frontend/ ./
RUN npm run build

# ============================================
# Stage 2: Python Backend + Frontend Static
# ============================================
FROM python:3.11-slim

WORKDIR /app

# Python stdout/stderr 즉시 출력 (Docker 로그 버퍼링 방지)
ENV PYTHONUNBUFFERED=1

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/main.py ./main.py

# Copy initial data (default; overridden by Volume mount in production)
COPY backend/data ./data

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Default port (Railway overrides via PORT env var)
EXPOSE 8000

# Run application
CMD ["sh", "-c", "exec uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}"]
