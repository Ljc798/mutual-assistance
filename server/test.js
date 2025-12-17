const bcrypt = require("bcryptjs");

function generatePasswordHash(plainPassword) {
  const saltRounds = 10;
  const hash = bcrypt.hashSync(plainPassword, saltRounds);
  return hash;
}

const plainPassword = "";
const hash = generatePasswordHash(plainPassword);

console.log("🔐 原密码:", plainPassword);
console.log("🔑 哈希密码:", hash);
