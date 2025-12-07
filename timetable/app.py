from fastapi import HTTPException, APIRouter
from pydantic import BaseModel
from sqlalchemy import create_engine, Column, Integer, String, text
from sqlalchemy.orm import sessionmaker, declarative_base
from sqlalchemy.exc import SQLAlchemyError
from datetime import datetime, timedelta
import requests
import ddddocr
import time
import json
from Crypto.PublicKey import RSA
from Crypto.Cipher import PKCS1_v1_5
import base64
import re

router = APIRouter()

# 数据库配置（请填写你的数据库信息）
DB_USERNAME = "root"
DB_PASSWORD = "926552ljc"
DB_HOST = "mysql"
DB_PORT = 3306
DB_NAME = "mutual_assistance"

DATABASE_URL = f"mysql+pymysql://{DB_USERNAME}:{DB_PASSWORD}@{DB_HOST}/{DB_NAME}"
engine = create_engine(DATABASE_URL, echo=True)
SessionLocal = sessionmaker(bind=engine)

# 定义 Base
Base = declarative_base()

# 📌 课程表（理论课）
class TimetableTheory(Base):
    __tablename__ = "timetable_theory"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    course_id = Column(Integer)
    course_name = Column(String(100))
    teacher_name = Column(String(30))
    weeks = Column(String(255))
    weekday = Column(Integer)
    class_period = Column(String(20))
    location = Column(String(100))

# 📌 课程表（实训课）
class TimetablePractice(Base):
    __tablename__ = "timetable_practice"
    id = Column(Integer, primary_key=True, autoincrement=True)
    user_id = Column(Integer, nullable=False)
    course_name = Column(String(100))
    teacher_name = Column(String(30))
    weeks = Column(String(255))

# 创建表
Base.metadata.create_all(engine)

# 教务系统 URL
base_url = "https://zhjw1.jju.edu.cn"
login_url = f"{base_url}/jwglxt/xtgl/login_slogin.html"
captcha_url = f"{base_url}/jwglxt/kaptcha"
public_key_url = f"{base_url}/jwglxt/xtgl/login_getPublicKey.html"

# 数据模型
class Credentials(BaseModel):
    username: str
    password: str
    user_id: int

def parse_weeks(text: str) -> str:
    """把 '1-12周(单)', '2-16周(双)', '5,7,9周' 转成 CSV 格式: '1,3,5,7,9,11' """
    if not text:
        return ""

    text = text.replace('（', '(').replace('）', ')').replace('，', ',').replace('周', '').strip()
    is_odd = '单' in text
    is_even = '双' in text
    text = re.sub(r'\(.*?\)', '', text)  # 去掉 (单)/(双)

    weeks = set()
    for part in re.split(r'[,\s]+', text):
        if not part:
            continue
        if '-' in part:
            try:
                a, b = map(int, part.split('-', 1))
                rng = range(a, b + 1)
                if is_odd:
                    weeks.update([w for w in rng if w % 2 == 1])
                elif is_even:
                    weeks.update([w for w in rng if w % 2 == 0])
                else:
                    weeks.update(rng)
            except ValueError:
                continue
        else:
            try:
                w = int(part)
                if is_odd and w % 2 == 0:
                    continue
                if is_even and w % 2 == 1:
                    continue
                weeks.add(w)
            except ValueError:
                continue

    return ",".join(str(w) for w in sorted(weeks))

# 🔍 课表数据转换函数
def transform_schedule_data(raw_data, user_id):
    formatted_data = []
    for item in raw_data:
        formatted_data.append({
            "user_id": user_id,
            "course_id": item.get("cd_id", None),
            "course_name": item.get("kcmc", "未知")[:100],
            "teacher_name": item.get("xm", "未知")[:30],
            "weeks": parse_weeks(item.get("zcd", "")),
            "weekday": item.get("xqj", ""),
            "class_period": item.get("jcs", "")[:20],
            "location": item.get("cdmc", "未知")[:100]
        })
    return formatted_data

def transform_practice_schedule_data(raw_data, user_id):
    formatted_data = []
    for item in raw_data:
        formatted_data.append({
            "user_id": user_id,
            "course_name": item.get("kcmc", "未知")[:100],  # 防止超长
            "teacher_name": item.get("jsxm", "未知")[:30],
            "weeks": parse_weeks(item.get("qsjsz", ""))
        })
    return formatted_data

# 🛠 数据存储函数
def save_schedule_to_db(user_id, theory_data, practice_data):
    db = SessionLocal()
    try:
        # 删除旧记录
        db.query(TimetableTheory).filter_by(user_id=user_id).delete()
        db.query(TimetablePractice).filter_by(user_id=user_id).delete()

        # 插入新记录
        for item in theory_data:
            db.add(TimetableTheory(**item))
        for item in practice_data:
            db.add(TimetablePractice(**item))

        # 判断是否首次绑定
        result = db.execute(text("SELECT has_bound_timetable, vip_expire_time, points FROM users WHERE id = :uid"), {"uid": user_id}).fetchone()
        if not result:
            raise HTTPException(status_code=404, detail="用户不存在")

        has_bound = result[0]
        vip_expire = result[1]
        points = result[2] or 0

        reward_message = None
        if not has_bound:
            reward_message = "🎁 首次绑定课表，已奖励 50 积分 + VIP 3 天！"

            now = datetime.now()
            if not vip_expire or vip_expire < now.date():
                new_vip = now + timedelta(days=3)
            else:
                new_vip = datetime.combine(vip_expire, datetime.min.time()) + timedelta(days=3)

            db.execute(text("""
                UPDATE users 
                SET has_bound_timetable = 1,
                    points = :points,
                    vip_expire_time = :vip_time
                WHERE id = :uid
            """), {
                "points": points + 50,
                "vip_time": new_vip,
                "uid": user_id
            })

        db.commit()
        return reward_message

    except SQLAlchemyError as e:
        db.rollback()
        raise HTTPException(status_code=500, detail="课表存储失败：" + str(e))

    finally:
        db.close()
        
# 📌 课表查询 API
@router.post("/get_schedule/")
async def get_schedule(credentials: Credentials):
    session = requests.Session()

    # 🔍 访问登录页面
    login_page = session.get(login_url)
    csrftoken = session.cookies.get("csrftoken")

    # 🔍 获取验证码
    captcha_response = session.get(captcha_url, params={"time": int(time.time() * 1000)})
    ocr = ddddocr.DdddOcr()
    captcha_code = ocr.classification(captcha_response.content)
    print(f"🎯 识别验证码: {captcha_code}")

    # 🔍 获取 RSA 公钥
    public_key_response = session.get(public_key_url)
    public_key_data = public_key_response.json()
    public_key_str = public_key_data.get("modulus", "")
    modulus_bytes = base64.b64decode(public_key_str)
    modulus_int = int.from_bytes(modulus_bytes, byteorder='big')
    rsa_key = RSA.construct((modulus_int, 65537))

    cipher = PKCS1_v1_5.new(rsa_key)
    encrypted_password = base64.b64encode(cipher.encrypt(credentials.password.encode())).decode()
    print(f"🔑 加密后的密码: {encrypted_password}")

    # 📌 发送登录请求
    login_payload = {
        "yhm": credentials.username,
        "mm": encrypted_password,
        "yzm": captcha_code,
        "csrftoken": csrftoken,
        "language": "zh_CN"
    }

    login_headers = {
        "User-Agent": "Mozilla/5.0",
        "Referer": login_url,
        "Content-Type": "application/x-www-form-urlencoded"
    }

    login_response = session.post(login_url, data=login_payload, headers=login_headers)

    if "用户名或密码错误" in login_response.text or "验证码错误" in login_response.text:
        raise HTTPException(status_code=400, detail="登录失败，请检查用户名、密码或验证码")

    if "JSESSIONID" in session.cookies.get_dict():
        schedule_home_url = f"{base_url}/jwglxt/kbcx/xskbcx_cxXskbcxIndex.html?gnmkdm=N2151"
        session.get(schedule_home_url, headers={"Referer": base_url}, cookies=session.cookies)

        schedule_api_url = f"{base_url}/jwglxt/kbcx/xskbcx_cxXsgrkb.html?gnmkdm=N2151"
        payload = {
            "xnm": "2025",
            "xqm": "3",
            "kzlx": "ck",
            "xsdm": "",
            "kclbdm": ""
        }

        headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/114.0.0.0 Safari/537.36",
            "Referer": schedule_home_url,
            "X-Requested-With": "XMLHttpRequest",
            "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8"
        }

        response = session.post(schedule_api_url, data=payload, headers=headers, cookies=session.cookies)

        try:
            data = response.json()
            theory_data = transform_schedule_data(data.get("kbList", []), credentials.user_id)
            practice_data = transform_practice_schedule_data(data.get("sjkList", []), credentials.user_id)

            # 存入数据库
            save_schedule_to_db(credentials.user_id, theory_data, practice_data)

            reward_msg = save_schedule_to_db(credentials.user_id, theory_data, practice_data)
            return {
                "message": reward_msg or "课表已更新成功",
                "theory_schedule": theory_data,
                "practice_schedule": practice_data
            }

        except json.JSONDecodeError:
            raise HTTPException(status_code=500, detail="无法解析返回数据，请检查API接口")
    else:
        raise HTTPException(status_code=400, detail="登录失败，无法获取正确的 cookies")
