<template>
  <div class="dashboard-wrapper">
    <!-- ✅ 一、核心信息统计卡片 -->
    <n-grid :cols="6" :x-gap="16" :y-gap="16">
      <n-gi v-for="card in coreStats" :key="card.label">
        <n-card size="small" hoverable>
          <n-statistic :label="card.label" :value="card.value" />
        </n-card>
      </n-gi>
    </n-grid>

    <!-- ✅ 二、图表可视化区 -->
    <n-grid :cols="2" :x-gap="16" :y-gap="16" style="margin-top: 30px;">
      <n-gi>
        <n-card title="用户增长趋势">
          <div ref="userChartRef" style="width: 100%; height: 300px;"></div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="任务发布 vs 完成">
          <div ref="taskChartRef" style="width: 100%; height: 300px;"></div>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- ✅ 四、用户构成与帖子统计 -->
    <n-grid :cols="2" :x-gap="16" :y-gap="16" style="margin-top: 30px;">
      <n-gi>
        <n-card title="用户构成比例">
          <div ref="userPieRef" style="width: 100%; height: 300px;"></div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="帖子类型发布统计">
          <div ref="postChartRef" style="width: 100%; height: 300px;"></div>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { NGrid, NGi, NCard, NStatistic } from 'naive-ui'
import * as echarts from 'echarts'

const userChartRef = ref<HTMLElement | null>(null)
const taskChartRef = ref<HTMLElement | null>(null)
const userPieRef = ref<HTMLElement | null>(null)
const postChartRef = ref<HTMLElement | null>(null)

const coreStats = [
  { label: '今日新增用户', value: 38 },
  { label: '今日发布任务', value: 12 },
  { label: '未完成任务数', value: 34 },
  { label: '今日发布帖子数', value: 134 },
  { label: '总帖子数', value: 1234 },
  { label: '今日收入（元）', value: 53 }
]

onMounted(() => {
  if (userChartRef.value) {
    const chart = echarts.init(userChartRef.value)
    chart.setOption({
      xAxis: { type: 'category', data: ['一', '二', '三', '四', '五', '六', '日'] },
      yAxis: { type: 'value' },
      series: [{ data: [10, 12, 18, 25, 30, 45, 60], type: 'line', smooth: true }],
      tooltip: { trigger: 'axis' }
    })
  }
  if (taskChartRef.value) {
    const chart = echarts.init(taskChartRef.value)
    chart.setOption({
      legend: {},
      tooltip: {},
      xAxis: { type: 'category', data: ['一', '二', '三', '四', '五', '六', '日'] },
      yAxis: {},
      series: [
        { name: '发布任务', type: 'bar', data: [5, 8, 12, 15, 9, 6, 4] },
        { name: '完成任务', type: 'bar', data: [3, 7, 9, 12, 8, 5, 3] }
      ]
    })
  }
  if (userPieRef.value) {
    const chart = echarts.init(userPieRef.value)
    chart.setOption({
      title: {
        text: '总用户数：1258',
        left: 'center',
        top: '5%',
        textStyle: {
          fontSize: 14,
          fontWeight: 'normal'
        }
      },
      tooltip: { trigger: 'item' },
      legend: { top: 'bottom' },
      series: [
        {
          name: '用户构成',
          type: 'pie',
          radius: ['40%', '70%'],
          data: [
            { value: 1120, name: '普通用户' },
            { value: 138, name: 'VIP用户' }
          ]
        }
      ]
    })
  }

  if (postChartRef.value) {
    const chart = echarts.init(postChartRef.value)
    chart.setOption({
      tooltip: {},
      xAxis: { type: 'category', data: ['提问', '分享', '求助', '资源'] },
      yAxis: { type: 'value' },
      series: [
        {
          data: [30, 24, 16, 12],
          type: 'bar',
          name: '帖子数'
        }
      ]
    })
  }
})
</script>

<style scoped>
.dashboard-wrapper {
  padding: 30px;
  background-color: #f7f7f7;
}
ul {
  padding-left: 1em;
  line-height: 1.8;
}
</style>