<template>
  <div class="login-wrapper">
    <n-card title="后台登录" style="max-width: 360px; margin: 100px auto;">
      <n-input v-model:value="username" placeholder="用户名" />
      <n-input
        v-model:value="password"
        type="password"
        placeholder="密码"
        style="margin-top: 12px;"
        @keyup.enter="login"
      />
      <n-button type="primary" block style="margin-top: 20px;" @click="login">
        登录
      </n-button>
    </n-card>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'

const username = ref('')
const password = ref('')
const router = useRouter()
const message = useMessage()
const envUsername = import.meta.env.VITE_ADMIN_USERNAME
const envPassword = import.meta.env.VITE_ADMIN_PASSWORD

function login() {
  if (username.value === envUsername && password.value === envPassword) {
    localStorage.setItem('token', 'mock-token')
    message.success('登录成功')
    router.push('/dashboard')
  } else {
    message.error('用户名或密码错误')
  }
}
</script>

<style scoped>
.login-wrapper {
  min-height: 100vh;
  background-color: #f5f7fa;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>