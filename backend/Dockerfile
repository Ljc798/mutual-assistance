FROM python:3.10-bullseye

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# ddddocr / onnxruntime / opencv 需要的系统库
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libgl1 libgomp1 libsm6 libxrender1 libxext6 \
    build-essential gcc g++ \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 先拷依赖清单
COPY requirements.txt .
# 约束文件只放一条：固定 numpy 1.x
# 也可以把这段内容直接写到你的 repo 中的 /backend/constraints.txt 再 COPY
RUN printf "numpy==1.26.4\n" > /app/constraints.txt

# 先装 numpy 1.26.4，再装其余依赖并用约束锁住不要升到 2.x
RUN python -m pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir -c /app/constraints.txt numpy==1.26.4 && \
    pip install --no-cache-dir -c /app/constraints.txt onnxruntime==1.16.3 opencv-python-headless==4.9.0.80 pillow==10.3.0 && \
    pip install --no-cache-dir -c /app/constraints.txt -r requirements.txt && \
    pip check

# 再拷代码
COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]