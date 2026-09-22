FROM python:3.10-slim AS runtime
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /app
RUN useradd --system --create-home appuser
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY app app
USER appuser
EXPOSE 8100
CMD ["uvicorn","app.main:app","--host","0.0.0.0","--port","8100"]
