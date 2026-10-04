FROM python:3.12-slim

WORKDIR /app
RUN pip install --no-cache-dir \
    fastapi==0.115.* "uvicorn[standard]==0.32.*" httpx==0.27.* psnawp-api legendary-gl

ENV DB_PATH=/data/inventory.db \
    XDG_CONFIG_HOME=/data

VOLUME /data
EXPOSE 8000
CMD ["uvicorn", "app:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]