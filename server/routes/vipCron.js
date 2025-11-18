const cron = require('node-cron');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc);
dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Shanghai');

const db = require('../config/db');

async function scanAndSyncVipLevels() {
  const now = dayjs();
  const [rows] = await db.query(
    `SELECT id, vip_level, vip_expire_time, svip_expire_time FROM users WHERE vip_level <> 0`
  );
  if (!rows?.length) return;
  for (const u of rows) {
    try {
      const svipActive = u.svip_expire_time && dayjs(u.svip_expire_time).isAfter(now);
      const vipActive = u.vip_expire_time && dayjs(u.vip_expire_time).isAfter(now);
      const newLevel = svipActive ? 2 : (vipActive ? 1 : 0);
      if (newLevel !== Number(u.vip_level || 0)) {
        await db.query(`UPDATE users SET vip_level = ? WHERE id = ?`, [newLevel, u.id]);
      }
    } catch (e) {
      console.error('❌ vipCron 更新失败 user_id=', u.id, e?.message || e);
    }
  }
}

function start() {
  // 每天 00:05 运行一次
  cron.schedule('0 5 0 * * *', () => {
    scanAndSyncVipLevels().catch(err => console.error('vipCron error', err));
  }, { timezone: 'Asia/Shanghai' });
  console.log('⏰ vipCron started: daily at 00:05 (Asia/Shanghai)');
}

module.exports = { start, scanAndSyncVipLevels };