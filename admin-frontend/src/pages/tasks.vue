<template>
    <div>
        <n-page-header title="任务管理" />
        <div style="margin-bottom: 16px;">
            <n-input v-model:value="searchKeyword" placeholder="请输入任务标题关键词" style="width: 200px; margin-right: 8px;" />
            <n-button type="primary" @click="handleSearch">搜索</n-button>
        </div>
        <n-data-table :columns="columns" :data="filteredTasks" :pagination="pagination" :bordered="false" />

        <!-- 弹窗 -->
        <n-modal v-model:show="showDialog" preset="dialog" title="任务详情" :style="dialogStyle">
            <div class="task-detail">
                <div><strong>任务ID:</strong> {{ selectedTask.id }}</div>
                <div><strong>任务标题:</strong> {{ selectedTask.title }}</div>
                <div><strong>任务分类:</strong> {{ selectedTask.category }}</div>
                <div><strong>发起者ID:</strong> {{ selectedTask.employer_id }}</div>
                <div><strong>接单者ID:</strong> {{ selectedTask.employee_id || '未接单' }}</div>
                <div><strong>任务状态:</strong> {{ selectedTask.status }}</div>
                <div><strong>截止时间:</strong> {{ selectedTask.DDL }}</div>
                <div><strong>薪资:</strong> {{ selectedTask.offer }}</div>
                <div><strong>任务详情:</strong> {{ selectedTask.detail }}</div>
                <div><strong>取件码:</strong> {{ selectedTask.takeaway_code || '无' }}</div>
                <div><strong>取件名称:</strong> {{ selectedTask.takeaway_name || '无' }}</div>
                <div><strong>手机尾号:</strong> {{ selectedTask.takeaway_tel || '无' }}</div>
            </div>
        </n-modal>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import axios from 'axios'
import { NPageHeader, NInput, NButton, NDataTable, NModal } from 'naive-ui'

const searchKeyword = ref('')
const tasks = ref([])  // 改为一个空数组，待后端数据填充
const showDialog = ref(false)  // 控制弹窗显示

const selectedTask = ref({
    id: '',
    title: '',
    category: '',
    employer_id: '',
    employee_id: '',
    status: '',
    DDL: '',
    offer: '',
    detail: '',
    takeaway_code: '',
    takeaway_name: '',
    takeaway_tel: ''
})

// 定义状态映射，后端传入的 0、1、2 转换为具体的文字
const statusMap = {
    0: '待接单',
    1: '进行中',
    2: '已完成'
}

const columns = [
    { title: '任务ID', key: 'id' },
    { title: '任务标题', key: 'title' },
    { title: '任务分类', key: 'category' },
    { title: '发起者', key: 'employer_id' },
    { title: '接单者', key: 'employee_id' },
    { title: '任务状态', key: 'status' },
    { title: '截止时间', key: 'DDL' },
    { title: '薪资', key: 'offer' },
    {
        title: '操作',
        key: 'actions',
        render: (row: any) => {
            return h('div', {}, [
                h('n-button', {
                    type: 'primary',
                    size: 'small',
                    onClick: () => handleShowTaskDetails(row)  // 点击查看详情
                }, '查看详情')
            ])
        }
    }
]

// 格式化任务数据，将状态码转为对应的文本
const formattedTasks = computed(() => {
    return tasks.value.map(task => ({
        ...task,
        status: statusMap[task.status] || '未知状态',  // 使用 statusMap 映射状态
        DDL: formatDate(task.DDL)  // 格式化截止时间
    }))
})

// 格式化日期函数，将日期转为 "月日 时分" 格式
const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    const options: Intl.DateTimeFormatOptions = {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
    }
    return date.toLocaleString('zh-CN', options)
}

const filteredTasks = computed(() =>
    formattedTasks.value.filter(task =>
        task.title.includes(searchKeyword.value)
    )
)

const pagination = {
    pageSize: 10
}

// 获取任务数据的函数
async function fetchTasks() {
    try {
        const response = await axios.get('http://127.0.0.1:8000/tasks')  // 使用你的后端API地址
        tasks.value = response.data
    } catch (error) {
        console.error('获取任务数据失败', error)
    }
}

function handleSearch() {
    // 搜索逻辑已经由 computed 自动处理
}

// 打开弹窗并展示选中的任务详情
function handleShowTaskDetails(task: any) {
    selectedTask.value = { ...task, status: statusMap[task.status] || '未知状态', DDL: formatDate(task.DDL) }
    showDialog.value = true
}

// 页面加载时请求数据
onMounted(() => {
    fetchTasks()
})

// 弹窗的样式
const dialogStyle = {
    width: '500px',
    maxHeight: '80vh',
    overflowY: 'auto',
    padding: '20px',
    borderRadius: '8px',
    backgroundColor: '#ffffff'
}
</script>

<style scoped>
.task-detail {
    padding: 20px;
    font-size: 14px;
    color: #333;
}

.task-detail div {
    margin-bottom: 10px;
}

.task-detail strong {
    color: #0056b3;
}

.n-button {
    margin-top: 10px;
}
</style>