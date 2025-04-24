<template>
    <div style="display: flex; flex-direction: column; height: 100%; padding: 24px;">
        <n-data-table :columns="columns" :data="reportList" :pagination="{ pageSize: 10 }" :bordered="false"
            style="flex: 1;" />
    </div>

    <n-modal v-model:show="showModal" title="帖子详情" preset="dialog" style="width: 600px;">
        <n-card>
            <template #header>
                <div style="display: flex; justify-content: space-between; align-items: center;">
                    <span>帖子详情</span>
                    <n-button size="small" @click="showModal = false">关闭</n-button>
                </div>
            </template>

            <p><strong>帖子 ID：</strong>{{ currentPost?.id }}</p>
            <p><strong>作者 ID：</strong>{{ currentPost?.user_id }}</p>
            <p><strong>是否置顶：</strong>{{ currentPost?.is_pinned ? '是' : '否' }}</p>
            <p><strong>内容：</strong></p>
            <n-input type="textarea" :value="currentPost?.content" readonly autosize />

            <template v-if="currentPost?.images?.length">
                <p style="margin-top: 16px"><strong>图片：</strong></p>
                <div style="display: flex; gap: 8px; flex-wrap: wrap">
                    <img v-for="img in currentPost.images" :src="img.image_url" :key="img.id"
                        style="width: 100px; height: auto; border-radius: 4px;" />
                </div>
            </template>
        </n-card>
    </n-modal>
</template>

<script setup lang="ts">
import { ref, h, onMounted } from 'vue'
import { NButton, useMessage, NModal, NCard, NInput, NPopconfirm } from 'naive-ui'
import request from '@/utils/request'

const message = useMessage()

const showModal = ref(false)
const currentPost = ref<any>(null)
const reportList = ref([])

const fetchReports = async () => {
    try {
        const res = await request.get('reports')
        reportList.value = res.data
    } catch (err) {
        console.error('举报数据获取失败', err)
    }
}

const openPostDetail = async (row: any) => {
    try {
        const res = await request.get(`posts/${row.post.id}`)
        currentPost.value = res.data
        showModal.value = true
    } catch (err) {
        console.error('帖子详情获取失败', err)
        message.error('帖子详情获取失败')
    }
}

const deletePost = async (postId: number) => {
    try {
        await request.delete(`posts/${postId}`)
        message.success('帖子已彻底删除')
        fetchReports()
    } catch (err) {
        console.error('帖子删除失败', err)
        message.error('帖子删除失败')
    }
}

const handleAction = async (id: number, action: 'approve' | 'reject') => {
    try {
        await request.put(`report/${id}`, { action })
        message.success(`已${action === 'approve' ? '通过' : '忽略'}举报`)
        fetchReports()
    } catch (err) {
        console.error('操作失败', err)
        message.error('操作失败')
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
                h(
                    'span',
                    {
                        style: {
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '200px'
                        }
                    },
                    row.post?.content || '（已删除）'
                ),
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
                    NPopconfirm,
                    {
                        onPositiveClick: () => deletePost(row.post.id),
                        positiveText: '删除',
                        negativeText: '取消'
                    },
                    {
                        trigger: () =>
                            h(
                                NButton,
                                { type: 'error', size: 'small' },
                                { default: () => '彻底删除帖子' }
                            ),
                        default: () => '确定删除此帖子及相关内容？'
                    }
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