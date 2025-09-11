// jobs/classReminder.js
const cron = require('node-cron');
const dayjs = require('dayjs');
const utc = require('dayjs/plugin/utc');
const timezone = require('dayjs/plugin/timezone');
dayjs.extend(utc); dayjs.extend(timezone);
dayjs.tz.setDefault('Asia/Shanghai');

const db = require('../config/db');
const { sendClassReminder } = require('../utils/wechat');

/**
 * weeks 字段命中判断：支持 "1,3,5" 和 "3-8"
 */
function weekHit(weeksStr, targetWeek) {
  if (!weeksStr) return false;
  const items = String(weeksStr).split(',').map(s => s.trim()).filter(Boolean);
  const w = Number(targetWeek);
  return items.some(seg => {
    if (seg.includes('-')) {
      const [a, b] = seg.split('-').map(x => parseInt(x.replace(/\D/g, ''), 10));
      return Number.isFinite(a) && Number.isFinite(b) && w >= a && w <= b;
    }
    const one = parseInt(seg.replace(/\D/g, ''), 10);
    return Number.isFinite(one) && w === one;
  });
}

/**
 * 计算“第几周”
 * - 优先使用 timetable_config.start_date（每个 user 可不同）
 * - 找不到则退化为学期通用起始日（可在 .env 或常量里配置）
 */
async function getCurrentWeekForUser(userId) {
  // 查用户配置
  const [cfgRows] = await db.query(
    'SELECT start_date, total_weeks FROM timetable_config WHERE user_id = ? LIMIT 1',
    [userId]
  );
  let startDate = cfgRows[0]?.start_date; // e.g. '2025-02-24 00:00:00'
  if (!startDate) {
    // 兜底：全局学期起始日（自行配置）
    startDate = process.env.TERM_START_DATE || dayjs().startOf('week').format('YYYY-MM-DD 00:00:00');
  }
  const diffDays = dayjs().diff(dayjs(startDate), 'day');
  const week = Math.floor(diffDays / 7) + 1;
  return Math.max(1, week);
}

/**
 * 记录已发送，避免重复
 * - 请先建表：
 * CREATE TABLE IF NOT EXISTS class_reminders_sent (
 *   id BIGINT PRIMARY KEY AUTO_INCREMENT,
 *   user_id BIGINT NOT NULL,
 *   course_row_id BIGINT NOT NULL,
 *   week INT NOT NULL,
 *   weekday TINYINT NOT NULL,
 *   time_start TIME NOT NULL,
 *   sent_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
 *   UNIQUE KEY uq_sent (user_id, course_row_id, week, weekday, time_start)
 * );
 */
async function alreadySent(userId, rowId, week, weekday, timeStart) {
  const [rows] = await db.query(
    `SELECT id FROM class_reminders_sent WHERE user_id=? AND course_row_id=? AND week=? AND weekday=? AND time_start=? LIMIT 1`,
    [userId, rowId, week, weekday, timeStart]
  );
  return rows.length > 0;
}
async function markSent(userId, rowId, week, weekday, timeStart) {
  await db.query(
    `INSERT IGNORE INTO class_reminders_sent (user_id, course_row_id, week, weekday, time_start)
     VALUES (?, ?, ?, ?, ?)`,
    [userId, rowId, week, weekday, timeStart]
  );
}

/**
 * 主逻辑：查“15分钟后要上的课”，并发订阅消息
 */
async function checkUpcomingClasses() {
  const now = dayjs();
  const target = now.add(15, 'minute'); // 提前15分钟
  const weekday = ((target.day() + 6) % 7) + 1; // day():0(日)…6(六) → 转成 1..7
  const hhmm = target.format('HH:mm:00');      // 和表里的 time_start 对齐

  // 只扫这个确切时间点（性能非常轻）
  const [rows] = await db.query(
    `SELECT id, user_id, course_name, teacher_name, location, weeks, weekday, TIME_FORMAT(time_start,'%H:%i:00') AS ts, TIME_FORMAT(time_end,'%H:%i') AS te
     FROM timetable_theory
     WHERE weekday = ? AND TIME_FORMAT(time_start,'%H:%i:00') = ?`,
    [weekday, hhmm]
  );
  if (!rows.length) return;

  // 可能每个 user 的“当前周”不同（按其 start_date 计算），逐个处理
  for (const r of rows) {
    try {
      const curWeek = await getCurrentWeekForUser(r.user_id);
      if (!weekHit(r.weeks, curWeek)) continue;

      // 避免重复提醒
      const sent = await alreadySent(r.user_id, r.id, curWeek, weekday, r.ts);
      if (sent) continue;

      // 查 openid
      const [[u]] = await db.query(`SELECT openid FROM users WHERE id = ? LIMIT 1`, [r.user_id]);
      if (!u?.openid) { await markSent(r.user_id, r.id, curWeek, weekday, r.ts); continue; }

      // 组装时间文本 & 页面跳转
      const timeText = `${dayjs(`2000-01-01 ${r.ts}`).format('HH:mm')}-${r.te}`;
      const page = 'pages/timetable/timetable'; // 你的小程序页面，可按需带参数

      await sendClassReminder({
        openid: u.openid,
        courseName: r.course_name,
        address: r.location,
        teacher: r.teacher_name,
        timeText,
        page
      });

      await markSent(r.user_id, r.id, curWeek, weekday, r.ts);
    } catch (e) {
      console.error('📚 上课提醒单条失败 row_id=', r.id, e?.message || e);
    }
  }
}

/**
 * 对外暴露一个启动函数：每天 7:00-22:59 每分钟跑一次
 */
function start() {
  // 秒 分 时 日 月 周
  cron.schedule('* * 7-22 * * *', () => {
    checkUpcomingClasses().catch(err => console.error('classReminder cron error', err));
  });
  console.log('⏰ classReminder cron started: every minute 07:00-22:59');
}

module.exports = { start, checkUpcomingClasses };