FROM python:3.11-slim

WORKDIR /app

# Install system dependencies including GDAL and curl for healthchecks
RUN apt-get update && apt-get install -y \
    build-essential \
    libgdal-dev \
    gdal-bin \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python ML dependencies
COPY ml/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy ML application code, configs, models, and contracts
COPY ml/ /app/ml/
COPY configs/ /app/configs/
COPY models/ /app/models/

ENV PORT=5000
ENV HOST=0.0.0.0
ENV PYTHONPATH=/app

EXPOSE 5000

CMD ["python", "ml/inference/server.py"]
