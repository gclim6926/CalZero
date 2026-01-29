# ============================================
# Stage 1: Build Frontend
# ============================================
FROM node:18-alpine AS frontend-builder

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
COPY main.py ./

# Copy initial data
# NOTE: Koyeb uses ephemeral storage - data resets on restart
# For persistent data, use Koyeb Database Add-ons or external storage
COPY backend/data ./data

# Copy built frontend from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Expose port
EXPOSE 8000

# Health check (optional - Koyeb has built-in health checks)
# HEALTHCHECK --interval=30s --timeout=3s --start-period=5s \
#   CMD curl -f http://localhost:8000/ || exit 1

# Run application
# Set SECRET_KEY environment variable in Koyeb for production
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
