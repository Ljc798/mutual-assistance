<template>
  <div class="login-wrapper">
    <n-card title="后台登录" style="max-width: 360px; margin: 100px auto;">
      <n-input v-model:value="username" placeholder="用户名" />
      <n-input v-model:value="password" type="password" placeholder="密码" style="margin-top: 12px;"
        @keyup.enter="login" />
      <n-button type="primary" block style="margin-top: 20px;" @click="login">
        登录
      </n-button>
    </n-card>
  </div>
  <div class="footer">
    <img class="beiantubiao" src="../assets/备案图标.png" alt="">
    <a class="beian" href="https://beian.mps.gov.cn/#/query/webSearch?code=36042102000223" rel="noreferrer"
      target="_blank">赣公网安备36042102000223号</a>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useMessage } from 'naive-ui'
import request from '@/utils/request' // 你自己的封装 axios 文件路径，确保这行没写错

const username = ref('')
const password = ref('')
const router = useRouter()
const message = useMessage()

async function login() {
  try {
    const res = await request.post('/login', {
      username: username.value,
      password: password.value
    })

    localStorage.setItem('token', res.data.token)
    message.success('登录成功')
    router.push('/dashboard')
  } catch (err) {
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

.footer {
  width: 100%;
  background-color: #aaa;
  text-align: center;
}

.beiantubiao {
  height: 15px;
  width: 15px;
}

.beian {
  margin-left: 10px;
  text-decoration: none;
  color: #000;
  height: 40px;
  line-height: 40px;
}
</style>