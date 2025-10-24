<script>
  /**
   * 🏠 App.vue - 應用程式主組件
   *
   * 功能說明：
   * 1. 🏗️ 提供應用程式整體框架和佈局結構
   * 2. ⏳ 管理全域載入狀態和進度顯示
   * 3. 🚀 管理 Vue Router 的路由導航系統
   * 4. 📱 實現響應式滿版佈局，無邊距和空隙
   *
   * 架構說明：
   * - 內容層：路由視圖容器，動態顯示不同頁面組件
   *
   * 設計理念：
   * - 滿版無邊距佈局設計
   * - 模組化組件架構
   */

  // 🔧 Vue Composition API 引入
  import { ref } from 'vue';

  export default {
    name: 'App',

    /**
     * 🧩 組件註冊 (Component Registration)
     * 註冊應用程式層級使用的組件
     */
    components: {},

    /**
     * 🔧 組件設定函數 (Component Setup)
     * 使用 Composition API 設定應用程式層級的狀態管理
     */
    setup() {
      // ⏳ 全域載入狀態管理 (Global Loading State Management)
      /** ⏳ 是否顯示載入覆蓋層 */
      const isLoading = ref(false);
      /** 📝 載入文字提示 */
      const loadingText = ref('載入中...');
      /** 📊 載入進度百分比 (0-100) */
      const loadingProgress = ref(0);
      /** 📊 是否顯示進度條 */
      const showLoadingProgress = ref(false);
      /** 📝 載入子文字說明 */
      const loadingSubText = ref('');

      // 📤 返回響應式數據和函數給模板使用 (Return Reactive Data and Functions)
      return {
        // ⏳ 載入狀態
        isLoading, // 載入狀態開關
        loadingText, // 載入主要文字
        loadingProgress, // 載入進度
        showLoadingProgress, // 是否顯示進度條
        loadingSubText, // 載入輔助文字
      };
    },
  };
</script>

<template>
  <!-- 🏠 App.vue - 主應用程式組件 (Main Application Component) -->
  <!-- 提供應用程式整體框架，使用 Bootstrap 實現滿版無空隙佈局 -->
  <div id="app" class="d-flex flex-column vh-100">
    <!-- 📱 主要內容區域 (Main Content Area) -->
    <div class="d-flex flex-column overflow-hidden">
      <router-view />
    </div>
  </div>
</template>

<style>
  /**
 * 🎨 應用程式全域樣式 (Application Global Styles)
 *
 * 引入共用 CSS 並定義應用程式層級的樣式
 * 注意：大部分樣式已移至 common.css 中統一管理
 */

  /* 📦 引入共用樣式表 (Import Common Stylesheets) */
  @import './assets/css/common.css';

  /* 📱 應用程式特定樣式 (App-Specific Styles) */
  /* 其他樣式已整合至 common.css 中，避免重複定義 */
</style>
