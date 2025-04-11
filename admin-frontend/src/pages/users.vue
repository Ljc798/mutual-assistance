<template>
  <div class="user-wrapper">
    <!-- 顶部筛选栏 -->
    <n-space vertical :size="16">
      <n-form :inline="true" :model="filters" label-placement="left">
        <n-form-item label="用户名">
          <n-input v-model:value="filters.username" placeholder="请输入用户名关键词" />
        </n-form-item>
        <n-form-item>
          <n-button type="primary" @click="handleSearch">搜索</n-button>
        </n-form-item>
      </n-form>

      <!-- 用户数据表格 -->
      <n-data-table :columns="columns" :data="userList" :pagination="pagination" :bordered="false" :scroll-x="1200" />
    </n-space>

    <n-modal v-model:show="showEditModal" title="编辑用户信息" preset="dialog">
      <n-form :model="currentUser" label-placement="top">
        <n-form-item label="用户名">
          <n-input v-model:value="currentUser.username" />
        </n-form-item>
        <n-form-item label="用户id">
          <n-input v-model:value="currentUser.wxid" />
        </n-form-item>
        <n-form-item label="免佣金次数">
          <n-input v-model:value="currentUser.free_counts"/>
        </n-form-item>
        <n-form-item label="积分余额">
          <n-input v-model:value="currentUser.points"/>
        </n-form-item>
        <n-form-item label="钱包余额">
          <n-input v-model:value="currentUser.balance"/>
        </n-form-item>
        <n-form-item label="VIP到期时间">
          <n-input v-model:value="currentUser.vip_expire_time" />
        </n-form-item>
        <n-space justify="end">
          <n-button @click="showEditModal = false">取消</n-button>
          <n-button type="primary" @click="saveUserEdit">保存</n-button>
        </n-space>
      </n-form>
    </n-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { h } from 'vue'
import axios from 'axios'
import { useMessage } from 'naive-ui'
import {
  NButton,
  NSpace,
  NInput,
  NSelect,
  NDataTable,
  NForm,
  NFormItem,
  NModal
} from 'naive-ui'

const filters = ref({
  id: null,
  username: '',
  avatar_url: '',
  wxid: '',
  free_counts: 0,
  points: 0,
  vip_expire_time: null,
  created_time: null
})

const userTypeOptions = [
  { label: '普通用户', value: 'normal' },
  { label: 'VIP用户', value: 'vip' }
]

const statusOptions = [
  { label: '正常', value: 'active' },
  { label: '封禁', value: 'banned' }
]

const userList = ref([])

const showEditModal = ref(false)
const currentUser = ref<any>({})
const message = useMessage()

async function fetchUsers() {
  try {
    const res = await axios.get('http://localhost:8000/users')
    userList.value = res.data
  } catch (err) {
    console.error('获取用户数据失败:', err)
  }
}

onMounted(fetchUsers)

const pagination = {
  pageSize: 10
}

const columns = [
  { title: '用户ID', key: 'id' },
  {
    title: '头像', key: 'avatar', render(row: any) {
      return h('img', {
        src: row.avatar_url,
        alt: 'avatar',
        style: 'width: 32px; height: 32px; border-radius: 50%; object-fit: cover;'
      })
    }
  },
  { title: '用户名', key: 'username' },
  { title: '用户id', key: 'wxid' },
  { title: '免佣金次数', key: 'free_counts' },
  { title: '积分余额', key: 'points' },
  { title: '钱包余额', key: 'balance' },
  { title: 'VIP', key: 'vip_expire_time' },
  {
    title: '注册时间',
    key: 'created_time',
    render(row: any) {
      return row.created_time?.split('T')[0] || ''
    }
  },
  {
    title: '操作',
    key: 'actions',
    render(row: any) {
      return h('div', { style: 'display: flex; gap: 12px;' }, [
        h(NButton, {
          secondary: true,
          size: 'small',
          type: 'primary',
          onClick: () => openEditModal(row)
        }, { default: () => '编辑' })
      ])
    }
  }
]

function openEditModal(row: any) {
  currentUser.value = { ...row }
  showEditModal.value = true
}

async function saveUserEdit() {
  try {
    await axios.put(`http://localhost:8000/users/${currentUser.value.id}`, currentUser.value)
    showEditModal.value = false
    fetchUsers()
    message.success('用户信息已成功更新')
  } catch (err) {
    console.error('更新用户失败:', err)
    message.error('更新失败，请检查网络或数据格式')
  }
}

function handleSearch() {
  console.log('搜索过滤条件:', filters.value)
  fetchUsers()
}
</script>

<style scoped>
.user-wrapper {
  padding: 30px;
  background-color: #f7f7f7;
}
</style>