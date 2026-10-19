FROM python:3.12-slim AS base

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8081

CMD ["uvicorn", "api:app", "--host", "0.0.0.0", "--port", "8081", "--workers", "2"]
