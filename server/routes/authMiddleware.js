const jwt = require("jsonwebtoken");
const SECRET_KEY = process.env.JWT_SECRET;

function authMiddleware(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ success: false, message: "未携带 token" });
  }

  const token = authHeader.replace("Bearer ", "");
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded;  // 保存 user_id 给后续使用
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: "无效 token 或已过期" });
  }
}

module.exports = authMiddleware;