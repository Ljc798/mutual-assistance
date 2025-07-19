const express = require("express");
const router = express.Router();

const taskHelperRouter = require("./taskHelper");

// 所有 AI 路由挂载在对应路径下
router.use("/", taskHelperRouter);

module.exports = router;