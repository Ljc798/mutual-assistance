<template>
  <div class="home-container">
    <!-- Hero Section -->
    <n-layout-content>
      <div class="hero-section">
        <n-grid x-gap="24" y-gap="24" cols="1 800:2" class="hero-grid">
          <n-gi class="hero-text">
            <h1 class="title">Mutual Campus</h1>
            <h2 class="subtitle">让校园互助更简单</h2>
            <p class="description">
              连接每一位同学，解决校园生活中的大小事。
              跑腿、代拿快递、二手交易、学习辅导，一站式搞定。
            </p>
            <div class="actions">
              <n-popover trigger="hover" placement="bottom">
                <template #trigger>
                  <n-button type="primary" size="large" round color="#18a058" class="action-btn">
                    立即浏览
                  </n-button>
                </template>
                <div class="qr-code-container">
                  <img src="https://mutual-campus-1348081197.cos.ap-nanjing.myqcloud.com/web/miniprogram.png" alt="App QR Code" width="150" height="150" />
                  <p style="text-align: center; margin-top: 8px; color: #666;">扫码立即体验</p>
                </div>
              </n-popover>
              
              <n-button ghost size="large" round class="action-btn" @click="scrollToFeatures">
                了解更多
              </n-button>
            </div>
          </n-gi>
          <n-gi class="hero-image-container">
             <div class="app-mockup">
               <!-- 添加 draggable 属性支持手动滑动 -->
               <n-carousel autoplay show-dots draggable style="height: 100%; border-radius: 32px; overflow: hidden;">
                 <img class="carousel-img" src="https://mutual-campus-1348081197.cos.ap-nanjing.myqcloud.com/web/IMG_7184.PNG" alt="App Preview 1">
                 <img class="carousel-img" src="https://mutual-campus-1348081197.cos.ap-nanjing.myqcloud.com/web/IMG_7185.PNG" alt="App Preview 2">
                 <img class="carousel-img" src="https://mutual-campus-1348081197.cos.ap-nanjing.myqcloud.com/web/IMG_7186.PNG" alt="App Preview 3">
                 <img class="carousel-img" src="https://mutual-campus-1348081197.cos.ap-nanjing.myqcloud.com/web/IMG_7187.PNG" alt="App Preview 4">
                 <img class="carousel-img" src="https://mutual-campus-1348081197.cos.ap-nanjing.myqcloud.com/web/IMG_7188.PNG" alt="App Preview 5">
                 <img class="carousel-img" src="https://mutual-campus-1348081197.cos.ap-nanjing.myqcloud.com/web/IMG_7189.PNG" alt="App Preview 6">
               </n-carousel>
            </div>
          </n-gi>
        </n-grid>
      </div>
    </n-layout-content>

    <!-- Features Section -->
    <n-layout-content id="features" class="section features-section">
      <h2 class="section-title">核心功能</h2>
      <n-grid x-gap="32" y-gap="32" cols="1 600:2 900:3" responsive="screen">
        <n-gi>
          <n-card hoverable class="feature-card">
            <div class="feature-icon-wrapper">
              <n-icon size="48" color="#18a058">
                <bicycle-outline />
              </n-icon>
            </div>
            <h3 class="feature-title">跑腿代办</h3>
            <p>代取快递、代买零食、食堂带饭，足不出户享受便利生活。</p>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card hoverable class="feature-card">
            <div class="feature-icon-wrapper">
              <n-icon size="48" color="#2080f0">
                <book-outline />
              </n-icon>
            </div>
            <h3 class="feature-title">学习互助</h3>
            <p>寻找自习搭子、难题求助、笔记分享，共同进步。</p>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card hoverable class="feature-card">
            <div class="feature-icon-wrapper">
              <n-icon size="48" color="#f0a020">
                <chatbubbles-outline />
              </n-icon>
            </div>
            <h3 class="feature-title">校园广场</h3>
            <p>分享校园趣事、失物招领、二手闲置，信息互通。</p>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card hoverable class="feature-card">
            <div class="feature-icon-wrapper">
              <n-icon size="48" color="#d03050">
                <shield-checkmark-outline />
              </n-icon>
            </div>
            <h3 class="feature-title">安全可靠</h3>
            <p>实名认证、信誉评分体系，保障每一次互助的安全。</p>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card hoverable class="feature-card">
            <div class="feature-icon-wrapper">
              <n-icon size="48" color="#8a2be2">
                <calendar-outline />
              </n-icon>
            </div>
            <h3 class="feature-title">课表查看</h3>
            <p>随时随地查看课程安排，智能提醒上课时间，不再错过每一节课。</p>
          </n-card>
        </n-gi>
      </n-grid>
    </n-layout-content>

    <!-- Footer -->
    <n-layout-footer class="footer">
      <div class="footer-content">
        <p>&copy; 2025 Mutual Campus. All Rights Reserved.</p>
        <p>联系我们: loujiachen6@gmail.com</p>
        <p style="margin-top: 10px;">
          <img class="beiantubiao" src="../assets/备案图标.png" alt="">
          <a href="https://beian.mps.gov.cn/#/query/webSearch?code=36042102000223" rel="noreferrer" target="_blank" style="color: rgba(255,255,255,0.6); text-decoration: none; font-size: 0.9em;">
            赣公网安备36042102000223号
          </a>
        </p>
      </div>
    </n-layout-footer>
  </div>
</template>

<script setup lang="ts">
import { 
  NLayoutContent, 
  NLayoutFooter, 
  NGrid, 
  NGi, 
  NButton, 
  NCard, 
  NIcon,
  NPopover,
  NCarousel
} from 'naive-ui'
import { 
  BicycleOutline, 
  BookOutline, 
  ChatbubblesOutline, 
  ShieldCheckmarkOutline,
  CalendarOutline
} from '@vicons/ionicons5'

const scrollToFeatures = () => {
  const featuresSection = document.getElementById('features')
  if (featuresSection) {
    featuresSection.scrollIntoView({ behavior: 'smooth' })
  }
}

</script>

<style scoped>
.home-container {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.hero-section {
  padding: 80px 24px;
  background: linear-gradient(135deg, #f0f9eb 0%, #e1f3d8 100%);
  min-height: 500px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.hero-grid {
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  align-items: center;
}

.hero-text {
  text-align: left;
  padding-left: 48px;
}

.title {
  font-size: 3.5rem;
  font-weight: 800;
  margin-bottom: 16px;
  color: #333;
}

.subtitle {
  font-size: 2rem;
  font-weight: 500;
  margin-bottom: 24px;
  color: #555;
}

.description {
  font-size: 1.2rem;
  color: #666;
  margin-bottom: 40px;
  line-height: 1.6;
  max-width: 500px;
}

.actions {
  display: flex;
  gap: 16px;
}

.action-btn {
  font-weight: 600;
  padding: 0 32px;
}

.hero-image-container {
  display: flex;
  justify-content: center;
  align-items: center;
}

.app-mockup {
  width: 276px;
  height: 600px;
  background: white;
  border-radius: 40px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  border: 8px solid #333;
  position: relative;
  background-color: #000;
}

.carousel-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.qr-code-container {
  padding: 8px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.beiantubiao {
  height: 15px;
  width: 15px;
  vertical-align: middle;
  margin-right: 5px;
}

.section {
  padding: 80px 24px;
  max-width: 1200px;
  margin: 0 auto;
  width: 100%;
}

.section-title {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 60px;
  color: #333;
}

.feature-card {
  height: 100%;
  text-align: center;
  transition: transform 0.3s ease;
  border-radius: 16px;
  /* 调整卡片内边距，使其更紧凑 */
  padding-top: 10px; 
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-icon-wrapper {
  margin-bottom: 8px; /* 进一步控制图标和标题的间距 */
  display: flex;
  justify-content: center;
  align-items: center;
}

.feature-title {
  margin: 0 0 12px 0; /* 移除顶部 margin，只保留底部 */
  font-size: 1.25rem;
  font-weight: 600;
}

.footer {
  background: #333;
  color: white;
  padding: 40px 24px;
  margin-top: auto;
}

.footer-content {
  max-width: 1200px;
  margin: 0 auto;
  text-align: center;
}

.footer p {
  margin: 8px 0;
  opacity: 0.8;
}

.footer a:hover {
  color: #fff !important;
  text-decoration: underline !important;
}

@media (max-width: 800px) {
  .hero-grid {
    text-align: center;
  }
  
  .hero-text {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding-left: 0;
  }

  .title {
    font-size: 2.5rem;
  }
  
  .subtitle {
    font-size: 1.5rem;
  }
}
</style>
