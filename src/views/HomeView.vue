<script>
  /**
   * 🏠 HomeView.vue - 主頁面組件 (Main Page Component)
   *
   * 這是應用程式的主頁面，整合了地圖顯示和控制面板。
   * 主要功能：
   * - 顯示火災地點地圖
   * - 提供統計資訊面板
   * - 響應式佈局設計
   *
   * 組件結構：
   * - MapTab: 地圖顯示組件
   * - 統計面板: 火災地點統計資訊
   */

  import MapTab from '../tabs/MapTab.vue';
  import { useDataStore } from '@/stores/dataStore.js';
  import { useDefineStore } from '@/stores/defineStore.js';
  import { onMounted } from 'vue';

  export default {
    name: 'HomeView',
    components: { MapTab },
    setup() {
      // 📦 存儲實例
      const dataStore = useDataStore();
      const defineStore = useDefineStore();

      /**
       * 🗺️ 設定地圖實例
       * 將 Leaflet 地圖實例傳遞給 dataStore
       * @param {Object} map - Leaflet 地圖實例
       */
      const setMapInstance = (map) => dataStore.setMapInstance(map);

      // 🚀 初始化應用程式
      onMounted(() => {
        // 火災地點數據將在地圖準備好後自動載入
        console.log('🏠 HomeView 初始化完成');
      });

      return {
        setMapInstance,
        defineStore,
        dataStore,
      };
    },
  };
</script>

<template>
  <!-- 🏠 主應用程式容器 -->
  <div id="app" class="d-flex flex-column vh-100">
    <!-- 🗺️ 地圖區域容器 -->
    <div class="flex-grow-1 overflow-hidden position-relative">
      <!-- 🗺️ 地圖組件 -->
      <MapTab @map-ready="setMapInstance" />
    </div>
  </div>
</template>

<style>
  @import '../assets/css/common.css';
</style>
