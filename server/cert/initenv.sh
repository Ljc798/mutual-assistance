#!/bin/sh

certFile="server/cert/certificate.crt"
certLog="server/cert/cert.log"

# 确保 cert.log 存在
mkdir -p "$(dirname "$certLog")"
touch "$certLog"

srcIp="169.254.10.1"
srcHost="api.weixin.qq.com"
checkFileCnt=0

echo "[I]: os release is debian" >> "$certLog"

if [ -f "$certFile" ]; then
    cp "$certFile" /usr/local/share/ca-certificates/
    update-ca-certificates
fi