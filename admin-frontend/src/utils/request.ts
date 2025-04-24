import axios from 'axios'

const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE,
  timeout: 5000
})

// 请求拦截器：在请求头中添加 token
request.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token') // 你也可以用 Pinia 等状态管理
      if (token) {
        config.headers.Authorization = `Bearer ${token}`
      }
      return config
    },
    (error) => Promise.reject(error)
  )
  
  // 响应拦截器：处理错误和统一的权限逻辑
  request.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response?.status === 401) {
        // 比如 token 失效，跳转登录
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
  )
  

export default request