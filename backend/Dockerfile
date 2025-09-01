# 使用更完整的镜像，而不是 slim
FROM python:3.10-bullseye

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# 安装 ddddocr 所需的系统库（图像处理和 ONNX 加速）
RUN apt-get update && apt-get install -y --no-install-recommends \
    libglib2.0-0 libgl1 libgomp1 libsm6 libxrender1 libxext6 \
    build-essential gcc g++ \
 && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# 拷贝依赖
COPY requirements.txt .

# 强制安装 ddddocr 及其依赖
RUN pip install --upgrade pip setuptools wheel && \
    pip install --no-cache-dir numpy pillow && \
    pip install --no-cache-dir onnxruntime==1.16.3 opencv-python-headless==4.9.0.80 && \
    pip install --no-cache-dir -r requirements.txt && \
    pip install --no-cache-dir ddddocr==1.5.6

# 拷贝代码
COPY . .

EXPOSE 8000
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]