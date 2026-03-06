# ============================================
# Stage 1: Build Frontend
# ============================================
FROM node:22-alpine AS frontend-builder

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

# Install Python dependencies
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend code
COPY backend/main.py ./main.py

# Copy initial data (default; overridden by Volume mount in production)
COPY backend/data ./data

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port (Railway sets PORT env var)
EXPOSE ${PORT:-8000}

# Run application (use Railway's PORT or default 8000)
CMD uvicorn main:app --host 0.0.0.0 --port ${PORT:-8000}
