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
                   <!-- 替换为你的二维码图片 -->
                  <img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=https://mutualcampus.top" alt="App QR Code" width="150" height="150" />
                  <p style="text-align: center; margin-top: 8px; color: #666;">扫码立即体验</p>
                </div>
              </n-popover>
              
              <n-button ghost size="large" round class="action-btn">
                了解更多
              </n-button>
            </div>
          </n-gi>
          <n-gi class="hero-image-container">
             <div class="app-mockup">
               <n-carousel autoplay show-dots style="height: 100%; border-radius: 32px; overflow: hidden;">
                 <!-- 这里放你的 App 截图 -->
                 <div class="carousel-item">
                    <div class="mockup-screen">
                      <n-icon size="80" color="#e0e0e0">
                        <phone-portrait-outline />
                      </n-icon>
                      <span>App 预览 1</span>
                    </div>
                 </div>
                 <div class="carousel-item" style="background-color: #f5f5f5;">
                    <div class="mockup-screen">
                      <n-icon size="80" color="#e0e0e0">
                        <phone-portrait-outline />
                      </n-icon>
                      <span>App 预览 2</span>
                    </div>
                 </div>
                 <div class="carousel-item" style="background-color: #fafafa;">
                    <div class="mockup-screen">
                      <n-icon size="80" color="#e0e0e0">
                        <phone-portrait-outline />
                      </n-icon>
                      <span>App 预览 3</span>
                    </div>
                 </div>
               </n-carousel>
            </div>
          </n-gi>
        </n-grid>
      </div>
    </n-layout-content>

    <!-- Features Section -->
    <n-layout-content class="section features-section">
      <h2 class="section-title">核心功能</h2>
      <n-grid x-gap="32" y-gap="32" cols="1 600:2 900:4" responsive="screen">
        <n-gi>
          <n-card hoverable class="feature-card">
            <template #header>
              <n-icon size="40" color="#18a058">
                <bicycle-outline />
              </n-icon>
            </template>
            <h3 class="feature-title">跑腿代办</h3>
            <p>代取快递、代买零食、食堂带饭，足不出户享受便利生活。</p>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card hoverable class="feature-card">
            <template #header>
              <n-icon size="40" color="#2080f0">
                <book-outline />
              </n-icon>
            </template>
            <h3 class="feature-title">学习互助</h3>
            <p>寻找自习搭子、难题求助、笔记分享，共同进步。</p>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card hoverable class="feature-card">
            <template #header>
              <n-icon size="40" color="#f0a020">
                <chatbubbles-outline />
              </n-icon>
            </template>
            <h3 class="feature-title">校园广场</h3>
            <p>分享校园趣事、失物招领、二手闲置，信息互通。</p>
          </n-card>
        </n-gi>
        <n-gi>
          <n-card hoverable class="feature-card">
            <template #header>
              <n-icon size="40" color="#d03050">
                <shield-checkmark-outline />
              </n-icon>
            </template>
            <h3 class="feature-title">安全可靠</h3>
            <p>实名认证、信誉评分体系，保障每一次互助的安全。</p>
          </n-card>
        </n-gi>
      </n-grid>
    </n-layout-content>

    <!-- Footer -->
    <n-layout-footer class="footer">
      <div class="footer-content">
        <p>&copy; 2025 Mutual Campus. All Rights Reserved.</p>
        <p>联系我们: contact@mutualcampus.top</p>
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
  PhonePortraitOutline
} from '@vicons/ionicons5'
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
  /* 增加左侧 padding */
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
  width: 280px;
  height: 560px;
  background: white;
  border-radius: 40px;
  box-shadow: 0 20px 40px rgba(0,0,0,0.1);
  border: 8px solid #333;
  /* 去掉 flex 居中，让 Carousel 撑满 */
  position: relative;
  background-color: #000; /* 边框内部背景 */
}

.carousel-item {
  width: 100%;
  height: 100%;
  background-color: white;
  display: flex;
  justify-content: center;
  align-items: center;
}

.mockup-screen {
  display: flex;
  flex-direction: column;
  align-items: center;
  color: #ccc;
  gap: 16px;
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
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-title {
  margin: 16px 0;
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
    /* 移动端重置 padding */
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
