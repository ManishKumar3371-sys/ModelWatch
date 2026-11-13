# ==============================================================================
# ModelWatch Production Multi-Stage Dockerfile
# Stage 1: Build the React 19 Frontend
# Stage 2: Serve FastAPI Backend & Pre-built SPA Assets
# ==============================================================================

# --- Stage 1: Node.js Frontend Builder ---
FROM node:20-slim AS frontend-builder
WORKDIR /app/frontend

COPY frontend/package*.json ./
RUN npm ci

COPY frontend/ ./
RUN npm run build

# --- Stage 2: Python Backend & Runtime ---
FROM python:3.12-slim AS runtime
WORKDIR /app

# Install system dependencies for scipy / numpy runtime if needed
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

# Copy backend, datasets, models, and docs
COPY backend/ ./backend/
COPY datasets/ ./datasets/
COPY experiments/ ./experiments/
COPY trained_models/ ./trained_models/
COPY docs/ ./docs/
COPY scripts/ ./scripts/
COPY .env.example ./.env.example

# Copy compiled frontend from Stage 1 into frontend/dist
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Set production environment variables
ENV PYTHONUNBUFFERED=1
ENV ENVIRONMENT=production
ENV DISABLE_EMAIL_ALERT=1
ENV HOST=0.0.0.0
ENV PORT=8000

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "8000"]
