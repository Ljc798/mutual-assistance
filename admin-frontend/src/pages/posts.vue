<template>
    <div>
        <n-page-header title="帖子管理" />
        <div style="margin-bottom: 16px;">
            <n-input v-model:value="searchKeyword" placeholder="请输入内容关键词" style="width: 200px; margin-right: 8px;" />
            <n-button type="primary" @click="handleSearch">搜索</n-button>
        </div>

        <n-data-table :columns="columns" :data="filteredPosts" :pagination="pagination" :bordered="false" />

        <!-- 帖子详情弹窗 -->
        <n-modal v-model:show="showModal" title="帖子详情" :style="modalStyle">
            <div class="post-detail-grid">
                <div class="label">内容：</div>
                <div>{{ selectedPost.content }}</div>
                <div class="label">分类：</div>
                <div>{{ selectedPost.category }}</div>
                <div class="label">用户ID：</div>
                <div>{{ selectedPost.user_id }}</div>
                <div class="label">发布时间：</div>
                <div>{{ selectedPost.created_time }}</div>
                <template v-if="selectedPost.images?.length">
                    <div class="label">图片预览：</div>
                    <div>
                        <n-image-group>
                            <n-image v-for="(url, index) in selectedPost.images" :key="index" width="100" :src="url"
                                style="margin-right: 8px; margin-bottom: 8px;" />
                        </n-image-group>
                    </div>
                </template>
            </div>
        </n-modal>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h } from 'vue'
import axios from 'axios'
import { NPageHeader, NInput, NButton, NDataTable, NModal, NImage, NImageGroup } from 'naive-ui'

interface Post {
    id: number
    title: string
    content: string
    images?: string[]
    created_time: string
    category?: string
    user_id?: string
    likes_count?: number
    comments_count?: number
    school_id?: string
}

const selectedPost = ref<Partial<Post>>({})

const searchKeyword = ref('')
interface Post {
    id: number
    title: string
    content: string
    created_time: string
    images?: string[]
}

const posts = ref<Post[]>([])
const showModal = ref(false)


const columns = [
    { title: '帖子ID', key: 'id' },
    {
        title: '内容',
        key: 'content',
        width: 300,
        render: (row: any) =>
            h(
                'div',
                {},
                h(
                    'span',
                    {
                        class: 'ellipsis-text',
                        title: row.content
                    },
                    row.content
                )
            )
    },
    { title: '分类', key: 'category' },
    { title: '用户ID', key: 'user_id' },
    { title: '点赞数', key: 'likes_count' },
    { title: '评论数', key: 'comments_count' },
    { title: '学校ID', key: 'school_id' },
    { title: '发布时间', key: 'created_time' },
    {
        title: '操作',
        key: 'actions',
        render: (row: any) => {
            return h('div', {}, [
                h('n-button', {
                    type: 'primary',
                    size: 'small',
                    onClick: () => handleShowPostDetail(row.id)
                }, '查看详情')
            ])
        }
    }
]

const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
}

const formattedPosts = computed(() => {
    return posts.value.map(post => ({
        ...post,
        created_time: formatDate(post.created_time)
    }))
})

const filteredPosts = computed(() =>
    formattedPosts.value.filter(post => post.content.includes(searchKeyword.value))
)

const pagination = { pageSize: 10 }

async function fetchPosts() {
    try {
        const res = await axios.get('http://localhost:8000/posts')
        posts.value = res.data
    } catch (err) {
        console.error('获取帖子失败', err)
    }
}

function handleSearch() { }

async function handleShowPostDetail(postId: number) {
    try {
        const res = await axios.get(`https://adminmutualcampus.top/api/posts/${postId}`)
        selectedPost.value = res.data
        selectedPost.value.created_time = formatDate(res.data.created_time)
        showModal.value = true
    } catch (err) {
        console.error('获取详情失败', err)
    }
}

onMounted(fetchPosts)

const modalStyle = {
    width: '650px',
    maxHeight: '80vh',
    overflowY: 'auto',
    padding: '24px',
    borderRadius: '12px',
    backgroundColor: '#fff'
}
</script>

<style scoped>
.post-detail-grid {
    display: grid;
    grid-template-columns: 120px 1fr;
    row-gap: 12px;
    column-gap: 10px;
    padding: 10px 5px;
    font-size: 14px;
    color: #333;
}

.label {
    font-weight: bold;
    color: #0072c6;
    text-align: right;
}

.n-image {
    border-radius: 8px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.ellipsis-text {
  display: inline-block;
  max-width: 300px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap; /* ← 这个是关键，没有它不会省略 */
  vertical-align: middle;
}
</style>
