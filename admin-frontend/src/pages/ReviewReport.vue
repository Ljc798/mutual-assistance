<template>
    <div style="padding: 24px">
        <n-data-table :columns="columns" :data="reportList" :pagination="{ pageSize: 10 }" :bordered="false" />
    </div>
    <n-modal v-model:show="showModal" title="帖子详情" preset="dialog" style="width: 500px;">
  <n-card>
    <p><strong>帖子 ID：</strong>{{ currentPost?.id }}</p>
    <p><strong>作者 ID：</strong>{{ currentPost?.author_id }}</p>
    <p><strong>内容：</strong></p>
    <n-input
      type="textarea"
      :value="currentPost?.content"
      readonly
      autosize
    />
  </n-card>
</n-modal>
</template>

<script setup lang="ts">
import { ref, h, onMounted } from 'vue'
import axios from 'axios'
import { NButton } from 'naive-ui'
import { NModal, NCard } from 'naive-ui'

const showModal = ref(false)
const currentPost = ref<any>(null)

function openPostDetail(row: any) {
  currentPost.value = row.post
  showModal.value = true
}
const reportList = ref([])

const fetchReports = async () => {
    try {
        const res = await axios.get('http://localhost:8000/reports')
        reportList.value = res.data
    } catch (err) {
        console.error('举报数据获取失败', err)
    }
}

const handleAction = async (id: number, action: 'approve' | 'reject') => {
    try {
        await axios.put(`http://localhost:8000/reports/${id}/action`, {
            action
        })
        fetchReports()
    } catch (err) {
        console.error('操作失败', err)
    }
}

const columns = [
    { title: 'ID', key: 'id' },
    { title: '举报理由', key: 'reason' },
    {
        title: '帖子',
        key: 'post',
        render(row: any) {
            return h('div', { style: { display: 'flex', alignItems: 'center' } }, [
                h('span', { style: { flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '200px' } }, row.post?.content || '（已删除）'),
                h(
                    NButton,
                    {
                        size: 'tiny',
                        style: { marginLeft: '8px' },
                        onClick: () => openPostDetail(row)
                    },
                    { default: () => '查看详情' }
                )
            ])
        }
    },
    {
        title: '操作',
        key: 'actions',
        render(row: any) {
            return [
                h(
                    NButton,
                    {
                        type: 'error',
                        size: 'small',
                        onClick: () => handleAction(row.id, 'approve')
                    },
                    { default: () => '删除帖子' }
                ),
                h(
                    NButton,
                    {
                        size: 'small',
                        style: { marginLeft: '8px' },
                        onClick: () => handleAction(row.id, 'reject')
                    },
                    { default: () => '忽略举报' }
                )
            ]
        }
    }
]

onMounted(fetchReports)
</script>

<style scoped></style>