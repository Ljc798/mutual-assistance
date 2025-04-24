import jwt
import datetime

SECRET_KEY = "your-secret"
payload = {
    "sub": "admin",
    "exp": datetime.datetime.utcnow() + datetime.timedelta(days=1)  # 1天后过期
}

token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")
print(token)