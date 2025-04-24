<template>
  <div class="dashboard-wrapper">
    <!-- ✅ 一、核心信息统计卡片 -->
    <n-grid :cols="gridColsStat" :x-gap="16" :y-gap="16">
      <n-gi v-for="card in coreStats" :key="card.label">
        <n-card size="small" hoverable>
          <n-statistic :label="card.label" :value="card.value" />
        </n-card>
      </n-gi>
    </n-grid>

    <!-- ✅ 二、图表可视化区 -->
    <n-grid :cols="gridColsChart" :x-gap="16" :y-gap="16" style="margin-top: 30px;">
      <n-gi>
        <n-card title="用户增长趋势">
          <div ref="userChartRef" class="chart-container"></div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="任务发布 vs 完成">
          <div ref="taskChartRef" class="chart-container"></div>
        </n-card>
      </n-gi>
    </n-grid>

    <!-- ✅ 三、用户构成与帖子统计 -->
    <n-grid :cols="gridColsChart" :x-gap="16" :y-gap="16" style="margin-top: 30px;">
      <n-gi>
        <n-card title="用户构成比例">
          <div ref="userPieRef" class="chart-container"></div>
        </n-card>
      </n-gi>
      <n-gi>
        <n-card title="帖子类型发布统计">
          <div ref="postChartRef" class="chart-container"></div>
        </n-card>
      </n-gi>
    </n-grid>
  </div>
</template>

<script setup lang="ts">
interface UserGrowthItem {
  date: string
  count: number
}

interface TaskStatsItem {
  date: string
  published: number
  completed: number
}

interface UserStructureItem {
  role: string
  count: number
}

interface PostCategoryItem {
  category: string
  count: number
}

import { ref, onMounted, computed } from 'vue'
import { NGrid, NGi, NCard, NStatistic } from 'naive-ui'
import * as echarts from 'echarts'
import request from '@/utils/request'

const userChartRef = ref<HTMLElement | null>(null)
const taskChartRef = ref<HTMLElement | null>(null)
const userPieRef = ref<HTMLElement | null>(null)
const postChartRef = ref<HTMLElement | null>(null)

const coreStats = ref([
  { label: '今日新增用户', value: 0 },
  { label: '今日发布任务', value: 0 },
  { label: '未完成任务数', value: 0 },
  { label: '今日发布帖子数', value: 0 },
  { label: '总帖子数', value: 0 },
  { label: '今日收入（元）', value: 0 }
])

// ✅ 响应式列数：小屏幕1列，中屏2列，大屏6列
const gridColsStat = computed(() => window.innerWidth < 600 ? 1 : (window.innerWidth < 960 ? 2 : 6))
const gridColsChart = computed(() => window.innerWidth < 600 ? 1 : 2)

const initUserGrowthChart = async () => {
  const res = await request.get<UserGrowthItem[]>('/dashboard/user-growth')
  const data = res.data

  const chart = echarts.init(userChartRef.value!)
  chart.setOption({
    xAxis: { type: 'category', data: data.map(item => item.date) },
    yAxis: { type: 'value' },
    series: [{
      data: data.map(item => item.count),
      type: 'line',
      smooth: true,
      name: '新增用户'
    }],
    tooltip: { trigger: 'axis' }
  })
}

const initTaskChart = async () => {
  const res = await request.get<TaskStatsItem[]>('/dashboard/task-stats')
  const data = res.data

  const chart = echarts.init(taskChartRef.value!)
  chart.setOption({
    xAxis: { type: 'category', data: data.map(item => item.date) },
    yAxis: { type: 'value' },
    series: [
      {
        name: '发布',
        data: data.map(item => item.published),
        type: 'bar'
      },
      {
        name: '完成',
        data: data.map(item => item.completed),
        type: 'bar'
      }
    ],
    tooltip: { trigger: 'axis' },
    legend: { data: ['发布', '完成'] }
  })
}

const initUserPieChart = async () => {
  const res = await request.get<UserStructureItem[]>('/dashboard/user-structure')
  const data = res.data

  const chart = echarts.init(userPieRef.value!)
  chart.setOption({
    tooltip: { trigger: 'item' },
    legend: { top: 'bottom' },
    series: [{
      type: 'pie',
      radius: '60%',
      data: data.map(item => ({ name: item.role, value: item.count }))
    }]
  })
}

const initPostChart = async () => {
  const res = await request.get<PostCategoryItem[]>('/dashboard/post-category')
  const data = res.data

  const chart = echarts.init(postChartRef.value!)
  chart.setOption({
    tooltip: { trigger: 'axis' },
    xAxis: { type: 'category', data: data.map(i => i.category) },
    yAxis: { type: 'value' },
    series: [{
      data: data.map(i => i.count),
      type: 'bar'
    }]
  })
}

onMounted(async () => {
  try {
    const res = await request.get('/dashboard/summary')
    const data = res.data

    coreStats.value = [
      { label: '今日新增用户', value: data.new_users_today },
      { label: '今日发布任务', value: data.new_tasks_today },
      { label: '未完成任务数', value: data.unfinished_tasks },
      { label: '今日发布帖子数', value: data.new_posts_today },
      { label: '总帖子数', value: data.total_posts },
      { label: '今日收入（元）', value: data.income_today }
    ]
  } catch (e) {
    console.error('获取 dashboard 数据失败:', e)
  }

  await initUserGrowthChart()
  await initTaskChart()
  await initUserPieChart()
  await initPostChart()
})
</script>

<style scoped>
.dashboard-wrapper {
  padding: 30px;
  background-color: #f7f7f7;
}

.chart-container {
  width: 100%;
  height: 300px;
}

@media (max-width: 768px) {
  .dashboard-wrapper {
    padding: 12px;
  }

  .chart-container {
    height: 250px;
  }
}
</style>