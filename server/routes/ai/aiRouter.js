const express = require("express");
const router = express.Router();

const taskHelperRouter = require("./taskHelper");
const timetableAIRouter = require("./timetableAI");

// 所有 AI 路由挂载在对应路径下
router.use("/", taskHelperRouter);
router.use("/timetable", timetableAIRouter);

module.exports = router;