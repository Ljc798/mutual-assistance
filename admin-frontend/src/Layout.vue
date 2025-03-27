<template>
  <n-layout style="min-height: 100vh;">
    <n-layout-header
      bordered
      style="padding: 0 32px; background-color: #ffffff; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04); height: 64px; display: flex; align-items: center; justify-content: space-between;"
    >
      <!-- 左侧：小程序名 -->
      <div style="font-size: 18px; font-weight: 600;">互助Campus</div>

      <!-- 中间：菜单均分布局 -->
      <div style="display: flex; flex: 1; justify-content: center;">
        <n-space justify="space-between" size="large" style="width: 600px;">
          <n-button text :type="activeKey === '/dashboard' ? 'primary' : 'default'" @click="navigate('/dashboard')">
            <template #icon>
              <n-icon><HomeOutline /></n-icon>
            </template>
            首页
          </n-button>
          <n-button text :type="activeKey === '/users' ? 'primary' : 'default'" @click="navigate('/users')">
            <template #icon>
              <n-icon><PeopleOutline /></n-icon>
            </template>
            用户管理
          </n-button>
          <n-button text :type="activeKey === '/tasks' ? 'primary' : 'default'" @click="navigate('/tasks')">
            <template #icon>
              <n-icon><ClipboardOutline /></n-icon>
            </template>
            任务管理
          </n-button>
          <n-button text :type="activeKey === '/posts' ? 'primary' : 'default'" @click="navigate('/posts')">
            <template #icon>
              <n-icon><ChatboxOutline /></n-icon>
            </template>
            帖子管理
          </n-button>
          <n-button text :type="activeKey === '/timetable' ? 'primary' : 'default'" @click="navigate('/timetable')">
            <template #icon>
              <n-icon><CalendarOutline /></n-icon>
            </template>
            课表管理
          </n-button>
        </n-space>
      </div>

      <!-- 右侧：设置按钮 -->
      <div>
        <n-button text strong @click="logout">
          <template #icon>
            <n-icon>
              <settings-outline />
            </n-icon>
          </template>
          设置
        </n-button>
      </div>
    </n-layout-header>

    <n-layout-content style="padding: 24px; background-color: #f5f7f9;">
      <n-card style="min-height: 100%; box-shadow: 0 2px 8px rgba(0,0,0,0.03);">
        <router-view />
      </n-card>
    </n-layout-content>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, h } from 'vue'
import { useRouter } from 'vue-router'
import {
  NLayout,
  NLayoutHeader,
  NLayoutContent,
  NCard,
  NButton,
  NSpace,
  NIcon
} from 'naive-ui'
import { HomeOutline, ClipboardOutline, PeopleOutline, SettingsOutline, ChatboxOutline, CalendarOutline } from '@vicons/ionicons5'

const router = useRouter()
const activeKey = ref('/dashboard')

function navigate(path: string) {
  activeKey.value = path
  router.push(path)
}

function logout() {
  // 可自定义退出逻辑
  localStorage.removeItem('token')
  router.push('/login')
}
</script>