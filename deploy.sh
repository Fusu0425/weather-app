#!/bin/bash
# ============================================
# 厦门天气 - 服务器部署脚本
# 使用方法: bash deploy.sh
# ============================================

set -e

APP_DIR="/opt/weather-app"
SERVICE_NAME="weather-app"
PYTHON_BIN="${PYTHON_BIN:-python3}"

echo "=== 厦门天气小程序部署 ==="

# 1. 安装系统依赖 (Ubuntu/Debian)
if command -v apt &>/dev/null; then
    echo "[1/5] 安装系统依赖..."
    sudo apt update -qq
    sudo apt install -y -qq python3 python3-pip python3-venv nginx
elif command -v yum &>/dev/null; then
    echo "[1/5] 安装系统依赖 (CentOS)..."
    sudo yum install -y -q python3 python3-pip nginx
else
    echo "请手动安装: python3, python3-pip, nginx"
fi

# 2. 创建应用目录
echo "[2/5] 部署代码到 $APP_DIR..."
sudo mkdir -p "$APP_DIR"
sudo cp -r . "$APP_DIR/"
sudo chown -R $USER:$USER "$APP_DIR"

# 3. 安装 Python 依赖
echo "[3/5] 安装 Python 依赖..."
cd "$APP_DIR"
$PYTHON_BIN -m pip install -r requirements.txt -i https://pypi.tuna.tsinghua.edu.cn/simple -q

# 4. 创建 systemd 服务
echo "[4/5] 配置 systemd 服务..."
sudo tee /etc/systemd/system/${SERVICE_NAME}.service > /dev/null << EOF
[Unit]
Description=Xiamen Weather App
After=network.target

[Service]
Type=simple
User=$USER
WorkingDirectory=$APP_DIR
ExecStart=$PYTHON_BIN -c "from waitress import serve; from app import app; import os; serve(app, host='127.0.0.1', port=5000)"
Restart=always
RestartSec=3
Environment=AUTO_BROWSER=0

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable ${SERVICE_NAME}
sudo systemctl restart ${SERVICE_NAME}

# 5. 配置 nginx 反向代理
echo "[5/5] 配置 nginx..."
SERVER_NAME="${SERVER_NAME:-_}"
sudo tee /etc/nginx/sites-available/${SERVICE_NAME}.conf > /dev/null << EOF
server {
    listen 80;
    server_name ${SERVER_NAME};

    client_max_body_size 2m;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
    }
}
EOF

# 启用站点 (Ubuntu/Debian 风格)
if [ -d /etc/nginx/sites-enabled ]; then
    sudo ln -sf /etc/nginx/sites-available/${SERVICE_NAME}.conf /etc/nginx/sites-enabled/
    # 移除默认站点
    sudo rm -f /etc/nginx/sites-enabled/default
fi

# CentOS 风格
if [ -d /etc/nginx/conf.d ]; then
    sudo cp /etc/nginx/sites-available/${SERVICE_NAME}.conf /etc/nginx/conf.d/
fi

# Test and reload nginx
sudo nginx -t && sudo systemctl reload nginx

echo ""
echo "=== 部署完成! ==="
echo "通过以下地址访问:"
echo "  http://$(curl -s ifconfig.me 2>/dev/null || echo 'YOUR_SERVER_IP')"
echo ""
echo "管理命令:"
echo "  查看状态: sudo systemctl status ${SERVICE_NAME}"
echo "  查看日志: sudo journalctl -u ${SERVICE_NAME} -f"
echo "  重启服务: sudo systemctl restart ${SERVICE_NAME}"
