<template>
  <n-layout style="min-height: 100vh;">
    <!-- 顶部导航 -->
    <n-layout-header
      class="layout-header"
      bordered
    >
      <!-- 左侧标题 -->
      <div class="header-left">
        <div class="header-title">互助Campus</div>
      </div>

      <!-- PC端菜单 -->
      <div class="nav-buttons desktop-only">
        <n-space justify="space-between" size="large" style="width: 600px;">
          <n-button text :type="activeKey === '/dashboard' ? 'primary' : 'default'" @click="navigate('/dashboard')">
            <template #icon><n-icon><HomeOutline /></n-icon></template>
            首页
          </n-button>
          <n-button text :type="activeKey === '/users' ? 'primary' : 'default'" @click="navigate('/users')">
            <template #icon><n-icon><PeopleOutline /></n-icon></template>
            用户管理
          </n-button>
          <n-button text :type="activeKey === '/tasks' ? 'primary' : 'default'" @click="navigate('/tasks')">
            <template #icon><n-icon><ClipboardOutline /></n-icon></template>
            任务管理
          </n-button>
          <n-button text :type="activeKey === '/posts' ? 'primary' : 'default'" @click="navigate('/posts')">
            <template #icon><n-icon><ChatboxOutline /></n-icon></template>
            帖子管理
          </n-button>
          <n-button text :type="activeKey === '/timetable' ? 'primary' : 'default'" @click="navigate('/timetable')">
            <template #icon><n-icon><CalendarOutline /></n-icon></template>
            课表管理
          </n-button>
        </n-space>
      </div>

      <!-- 移动端菜单按钮 -->
      <div class="mobile-only">
        <n-button text @click="drawerVisible = true">
          <n-icon><MenuOutline /></n-icon>
        </n-button>
      </div>

      <!-- 设置按钮 -->
      <div class="header-right">
        <n-button text strong @click="logout">
          <template #icon><n-icon><SettingsOutline /></n-icon></template>
          设置
        </n-button>
      </div>
    </n-layout-header>

    <!-- 移动端抽屉菜单 -->
    <n-drawer v-model:show="drawerVisible" placement="left" :width="200" resizable>
      <n-drawer-content title="导航菜单">
        <n-button block quaternary @click="navigate('/dashboard')">首页</n-button>
        <n-button block quaternary @click="navigate('/users')">用户管理</n-button>
        <n-button block quaternary @click="navigate('/tasks')">任务管理</n-button>
        <n-button block quaternary @click="navigate('/posts')">帖子管理</n-button>
        <n-button block quaternary @click="navigate('/timetable')">课表管理</n-button>
      </n-drawer-content>
    </n-drawer>

    <!-- 主内容区 -->
    <n-layout-content class="layout-content">
      <n-card class="layout-card">
        <router-view />
      </n-card>
    </n-layout-content>
  </n-layout>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter, useRoute } from 'vue-router'

import {
  NLayout,
  NLayoutHeader,
  NLayoutContent,
  NCard,
  NButton,
  NSpace,
  NIcon,
  NDrawer,
  NDrawerContent
} from 'naive-ui'

import {
  HomeOutline,
  ClipboardOutline,
  PeopleOutline,
  SettingsOutline,
  ChatboxOutline,
  CalendarOutline,
  MenuOutline
} from '@vicons/ionicons5'

const router = useRouter()
const route = useRoute()
const activeKey = ref(route.path)
const drawerVisible = ref(false)

watch(() => route.path, (newPath) => {
  activeKey.value = newPath
  drawerVisible.value = false // 关闭抽屉
})

function navigate(path: string) {
  router.push(path)
}

function logout() {
  localStorage.removeItem('token')
  router.push('/login')
}
</script>

<style scoped>
.layout-header {
  padding: 0 16px;
  background-color: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.header-left {
  font-size: 18px;
  font-weight: 600;
}

.header-title {
  white-space: nowrap;
}

.header-right {
  margin-left: auto;
}

.nav-buttons {
  flex: 1;
  display: flex;
  justify-content: center;
}

.layout-content {
  padding: 24px;
  background-color: #f5f7f9;
}

.layout-card {
  min-height: 100%;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.03);
}

/* 响应式调整 */
@media (max-width: 768px) {
  .desktop-only {
    display: none !important;
  }

  .mobile-only {
    display: block;
  }

  .layout-content {
    padding: 12px;
  }
}

@media (min-width: 769px) {
  .mobile-only {
    display: none;
  }
}
</style>