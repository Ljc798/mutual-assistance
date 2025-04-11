<template>
    <div style="display: flex; justify-content: center; margin-top: 20px;">
      <div style="width: fit-content;">
        <n-tabs type="line" v-model:value="tab" animated>
          <n-tab-pane name="report" tab="举报处理">
            <ReviewReport />
          </n-tab-pane>
          <n-tab-pane name="feedback" tab="用户反馈">
            <ReviewFeedback />
          </n-tab-pane>
        </n-tabs>
      </div>
    </div>
  </template>
  
  <script setup lang="ts">
  import { ref } from 'vue'
  import ReviewReport from './ReviewReport.vue'
  import ReviewFeedback from './ReviewFeedback.vue'
  
  const tab = ref('report')
  </script>