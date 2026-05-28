# 使用 Python 3.11 官方镜像
FROM python:3.11-slim

WORKDIR /app

# 安装依赖
COPY requirements.txt .
RUN pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple

# 复制代码
COPY . .

# 生产模式用 waitress 运行
CMD ["python", "-c", "from waitress import serve; from app import app; import os; serve(app, host='0.0.0.0', port=int(os.environ.get('PORT', 5000)))"]
