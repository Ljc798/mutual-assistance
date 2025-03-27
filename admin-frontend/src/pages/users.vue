<template>
    <div class="user-wrapper">
      <!-- 顶部筛选栏 -->
      <n-space vertical :size="16">
        <n-form :inline="true" :model="filters" label-placement="left">
          <n-form-item label="用户名">
            <n-input v-model:value="filters.username" placeholder="请输入用户名关键词" />
          </n-form-item>
          <n-form-item label="用户类型">
            <n-select v-model:value="filters.type" :options="userTypeOptions" placeholder="全部" clearable />
          </n-form-item>
          <n-form-item label="状态">
            <n-select v-model:value="filters.status" :options="statusOptions" placeholder="全部" clearable />
          </n-form-item>
          <n-form-item>
            <n-button type="primary" @click="handleSearch">搜索</n-button>
          </n-form-item>
        </n-form>
  
        <!-- 用户数据表格 -->
        <n-data-table
          :columns="columns"
          :data="userList"
          :pagination="pagination"
          :bordered="false"
          :scroll-x="1200"
        />
      </n-space>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue'
  import { h } from 'vue'
  import {
    NButton,
    NSpace,
    NInput,
    NSelect,
    NDataTable,
    NForm,
    NFormItem
  } from 'naive-ui'
  
  const filters = ref({
    username: '',
    type: null,
    status: null
  })
  
  const userTypeOptions = [
    { label: '普通用户', value: 'normal' },
    { label: 'VIP用户', value: 'vip' }
  ]
  
  const statusOptions = [
    { label: '正常', value: 'active' },
    { label: '封禁', value: 'banned' }
  ]
  
  const userList = ref([
    { id: 1, username: 'Alice', status: 'active', type: 'vip', createdAt: '2025-03-27' },
    { id: 2, username: 'Bob', status: 'banned', type: 'normal', createdAt: '2025-03-26' }
  ])
  
  const pagination = {
    pageSize: 10
  }
  
  const columns = [
    { title: '用户ID', key: 'id' },
    { title: '用户名', key: 'username' },
    { title: '状态', key: 'status' },
    { title: '注册时间', key: 'createdAt' },
    { title: '用户类型', key: 'type' },
    {
      title: '操作',
      key: 'actions',
      render(row: any) {
        return h('div', { style: 'display: flex; gap: 12px;' }, [
          h(NButton, { secondary: true, size: 'small', type: 'warning' }, { default: () => '封禁用户' }),
          h(NButton, { secondary: true, size: 'small', disabled: true, style: 'cursor: default; pointer-events: none;' }, { default: () => '|' }),
          h(NButton, { secondary: true, size: 'small', type: 'success' }, { default: () => '设为 VIP' })
        ])
      }
    }
  ]
  
  function handleSearch() {
    console.log('搜索过滤条件:', filters.value)
    // TODO: 请求后端接口过滤数据
  }
  </script>
  
  <style scoped>
  .user-wrapper {
    padding: 30px;
    background-color: #f7f7f7;
  }
  </style>