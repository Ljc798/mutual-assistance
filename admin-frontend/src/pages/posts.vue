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
                <div class="label">帖子ID：</div>
                <div>{{ selectedPost.id }}</div>
                <div class="label">内容：</div>
                <div class="post-content">{{ selectedPost.content }}</div>
                <div class="label">分类：</div>
                <div>{{ selectedPost.category || '无' }}</div>
                <div class="label">用户ID：</div>
                <div>{{ selectedPost.user_id }}</div>
                <div class="label">点赞数：</div>
                <div>{{ selectedPost.likes_count }}</div>
                <div class="label">评论数：</div>
                <div>
                    {{ selectedPost.comments_count }}
                    <n-button size="tiny" type="primary" secondary strong style="margin-left: 8px"
                        @click="showCommentModal = true">查看评论</n-button>
                </div>
                <div class="label">发布时间：</div>
                <div>{{ selectedPost.created_time }}</div>

                <template v-if="selectedPost.images?.length">
                    <div class="label">图片预览：</div>
                    <div class="image-list">
                        <n-image-group>
                            <n-image v-for="(img, index) in selectedPost.images" :key="index" width="100"
                                :src="img.image_url" />
                        </n-image-group>
                    </div>
                </template>

                <div class="label">操作：</div>
                <div>
                    <n-button size="tiny" type="warning" secondary strong @click="togglePin">
                        {{ selectedPost.is_pinned ? '取消置顶' : '设为置顶' }}
                    </n-button>
                </div>
            </div>
        </n-modal>
    </div>

    <n-modal v-model:show="showCommentModal" title="评论列表" :style="modalStyle">
        <div v-if="selectedPost.comments?.length">
            <div v-for="comment in selectedPost.comments" :key="comment.id" class="comment-item">
                <div class="comment-meta">
                    <span><strong>用户 {{ comment.user_id }}</strong></span>
                    <span class="comment-date">{{ formatDate(comment.created_time) }}</span>
                </div>
                <div class="comment-content">{{ comment.content }}</div>
                <div style="text-align: right; margin-top: 4px;">
                    <n-popconfirm @positive-click="() => handleDeleteComment(comment.id)">
                        <template #trigger>
                            <n-button size="tiny" type="error">删除评论</n-button>
                        </template>
                        <template #default>确定要删除这条评论吗？</template>
                    </n-popconfirm>
                </div>
            </div>
        </div>
        <div v-else>暂无评论</div>
    </n-modal>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, h, resolveComponent } from 'vue'
import axios from 'axios'
import { NPageHeader, NInput, NButton, NDataTable, NModal, NImage, NImageGroup } from 'naive-ui'

interface Comment {
    id: number
    user_id: number
    content: string
    parent_id?: number | null
    root_parent_id?: number | null
    created_time: string
    likes_count: number
}

interface PostImage {
    id: number
    image_url: string
}

interface Post {
    id: number
    title?: string
    content: string
    created_time: string
    category?: string
    user_id: number
    likes_count: number
    comments_count: number
    school_id?: number
    images: PostImage[]
    comments: Comment[]
    is_pinned: number
}

const selectedPost = ref<Partial<Post>>({})

const searchKeyword = ref('')
const posts = ref<Post[]>([])
const showModal = ref(false)
const showCommentModal = ref(false)

const columns = [
    { title: '帖子ID', key: 'id' },
    {
        title: '内容',
        key: 'content',
        ellipsis: {
            tooltip: true // 鼠标悬停显示全部内容
        },
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
            const NButton = resolveComponent('n-button')
            return h('div', {}, [
                h(NButton, {
                    type: 'info',
                    size: 'small',
                    strong: true,
                    secondary: true,
                    style: { marginRight: '8px' },
                    onClick: () => handleShowPostDetail(row.id)
                }, { default: () => '查看详情' }),
                h(resolveComponent('n-popconfirm'), {
                    onPositiveClick: () => handleDeletePost(row.id),
                }, {
                    trigger: () =>
                        h(NButton, {
                            type: 'error',
                            size: 'small',
                            strong: true,
                            secondary: true
                        }, { default: () => '删除' }),
                    default: () => '确定要删除这条帖子吗？这会一并删除图片、评论、点赞等相关数据'
                })
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
        const res = await axios.get(`http://localhost:8000/posts/${postId}`)
        selectedPost.value = res.data
        selectedPost.value.created_time = formatDate(res.data.created_time)
        showModal.value = true
    } catch (err) {
        console.error('获取详情失败', err)
    }
}

async function handleDeleteComment(commentId: number) {
    if (!window.confirm('你确定要删除这条评论吗？')) return

    try {
        await axios.delete(`http://localhost:8000/comments/${commentId}`)
        selectedPost.value.comments = selectedPost.value.comments?.filter(c => c.id !== commentId)
        selectedPost.value.comments_count = (selectedPost.value.comments_count || 1) - 1
    } catch (err) {
        console.error('删除评论失败', err)
    }
}

async function handleDeletePost(postId: number) {
    if (!window.confirm('确定删除？包括图片、评论、点赞、举报都将永久清除')) return
    try {
        await axios.delete(`http://localhost:8000/posts/${postId}`)
        posts.value = posts.value.filter(post => post.id !== postId)
    } catch (err) {
        console.error('删除帖子失败', err)
    }
}

async function togglePin() {
    try {
        const res = await axios.post(`http://localhost:8000/posts/${selectedPost.value.id}/pin`)
        selectedPost.value.is_pinned = res.data.is_pinned
    } catch (err) {
        console.error('置顶失败', err)
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
    white-space: nowrap;
    /* ← 这个是关键，没有它不会省略 */
    vertical-align: middle;
}

.post-content {
    white-space: pre-wrap;
    line-height: 1.5;
    max-height: 200px;
    overflow-y: auto;
}

.image-list {
    display: flex;
    flex-wrap: wrap;
}

.comment-item {
    margin-bottom: 16px;
    padding: 10px;
    border-bottom: 1px solid #eee;
}

.comment-meta {
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: #999;
    margin-bottom: 4px;
}

.comment-content {
    font-size: 14px;
    color: #333;
    line-height: 1.4;
}
</style>
