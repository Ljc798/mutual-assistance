<template>
  <div style="display: flex; flex-direction: column; height: 100%; padding: 24px;">
    <n-data-table :columns="columns" :data="feedbackList" :pagination="{ pageSize: 10 }" :bordered="false"
      style="flex: 1;" />

    <n-modal v-model:show="showModal" title="反馈详情" preset="dialog" style="width: 600px;">
      <n-card>
        <template #header>
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <span>反馈详情</span>
            <n-button size="small" @click="showModal = false">关闭</n-button>
          </div>
        </template>

        <p><strong>反馈 ID：</strong>{{ currentFeedback?.id }}</p>
        <p><strong>用户 ID：</strong>{{ currentFeedback?.user_id }}</p>
        <p><strong>标题：</strong>{{ currentFeedback?.title }}</p>
        <p><strong>内容：</strong></p>
        <n-input type="textarea" :value="currentFeedback?.content" readonly autosize />

        <n-form-item label="奖励积分" style="margin-top: 16px;">
          <n-input-number v-model:value="editablePoints" :min="0" />
        </n-form-item>

        <div style="margin-top: 16px; display: flex; justify-content: flex-end;">
          <n-button type="success" @click="resolveFeedback">奖励并通知用户</n-button>
        </div>
      </n-card>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, h, onMounted } from 'vue'
import { NButton, useMessage, NModal, NCard, NInput, NTag } from 'naive-ui'
import request from '@/utils/request'

const message = useMessage()

const showModal = ref(false)
const feedbackList = ref([])
const currentFeedback = ref<any>(null)
const editablePoints = ref(0)
const fetchFeedbacks = async () => {
  try {
    const res = await request.get('feedbacks')
    feedbackList.value = res.data
  } catch (err) {
    console.error('反馈获取失败', err)
    message.error('反馈获取失败')
  }
}

const openFeedbackDetail = async (row: any) => {
  try {
    const res = await request.get(`feedbacks/${row.id}`)
    currentFeedback.value = res.data
    editablePoints.value = res.data.reward_points || 0
    showModal.value = true
  } catch (err) {
    console.error('反馈详情获取失败', err)
    message.error('反馈详情获取失败')
  }
}

const resolveFeedback = async () => {
  try {
    await request.post(`feedbacks/${currentFeedback.value.id}/resolve`, {
      reward_points: editablePoints.value
    })
    message.success('用户已奖励并通知')
    showModal.value = false
    fetchFeedbacks()
  } catch (err) {
    console.error('反馈处理失败', err)
    message.error('处理失败')
  }
}
const columns = [
  { title: 'ID', key: 'id' },
  { title: '标题', key: 'title' },
  {
    title: '内容',
    key: 'content',
    render(row: any) {
      return h(
        'div',
        {
          style: {
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            maxWidth: '200px'
          }
        },
        row.content
      )
    }
  },
  {
    title: '状态', key: 'is_resolved', render(row: any) {
      return h(
        NTag,
        { type: row.is_resolved ? 'success' : 'warning', bordered: false },
        { default: () => row.is_resolved ? '已处理' : '未处理' }
      )
    }
  },
  {
    title: '操作',
    key: 'actions',
    render(row: any) {
      return h(
        NButton,
        {
          size: 'small',
          onClick: () => openFeedbackDetail(row)
        },
        { default: () => '查看详情' }
      )
    }
  }
]

onMounted(fetchFeedbacks)
</script>

<style scoped></style>