<script>
  /**
   * 🏠 HomeView.vue - 主頁面組件 (Main Page Component)
   *
   * 這是應用程式的主頁面，整合了地圖顯示和控制面板。
   * 主要功能：
   * - 顯示世界城市地圖
   * - 提供城市導航按鈕
   * - 提供底圖切換功能
   * - 響應式佈局設計
   *
   * 組件結構：
   * - MapTab: 地圖顯示組件
   * - 控制面板: 城市導航和底圖選擇
   */

  import MapTab from '../tabs/MapTab.vue';
  import { useDataStore } from '@/stores/dataStore.js';
  import { useDefineStore } from '@/stores/defineStore.js';
  import { ref, onMounted, computed } from 'vue';

  export default {
    name: 'HomeView',
    components: { MapTab },
    setup() {
      // 📦 存儲實例
      const dataStore = useDataStore();
      const defineStore = useDefineStore();

      /**
       * 🗺️ 設定地圖實例
       * 將 Leaflet 地圖實例傳遞給 dataStore 以便城市導航使用
       * @param {Object} map - Leaflet 地圖實例
       */
      const setMapInstance = (map) => dataStore.setMapInstance(map);

      /**
       * 🌍 導航到指定國家
       * 將地圖視圖移動到選定國家的中心位置
       * @param {string} countryId - 國家 ID
       */
      const navigateToCountry = (countryId) => {
        // 更新當前國家名稱
        const country = countries.value?.find((c) => c.layerId === countryId);
        if (country) {
          console.log('🌍 切換到國家:', country.layerName);
          currentCountry.value = country.layerName;
        }
        dataStore.navigateToCountry(countryId);
      };

      // 移除底圖切換功能，使用預設的標準地圖

      // 📊 獲取國家列表
      const countries = computed(() => dataStore.layers[0].groupLayers);

      // 🌍 當前選中的國家（預設為台灣）
      const currentCountry = ref('TAIWAN');

      // 🚀 初始化應用程式
      onMounted(() => {
        // 直接導航到台灣
        navigateToCountry('Taiwan');
      });

      return {
        setMapInstance,
        navigateToCountry,
        countries,
        defineStore,
        currentCountry,
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
      <MapTab @map-ready="setMapInstance" :current-country="currentCountry" />

      <!-- 🎛️ 左側中間控制面板 -->
      <div
        class="position-absolute"
        style="top: 50%; left: 0; transform: translateY(-50%); z-index: 1000; padding: 1rem"
      >
        <div class="bg-dark bg-opacity-75 rounded-3 p-3">
          <!-- 🌍 國家導航區域 -->
          <div class="">
            <div class="d-flex flex-column gap-1">
              <button
                v-for="country in countries"
                :key="country.layerId"
                class="btn border-0 my-country-btn my-font-sm-white px-4 py-3"
                :class="[currentCountry === country.layerName ? 'active' : '']"
                @click="navigateToCountry(country.layerId)"
              >
                {{ country.layerName }}
              </button>
            </div>
          </div>

          <!-- 移除底圖選擇區域，使用預設的標準地圖 -->
        </div>
      </div>
    </div>
  </div>
</template>

<style>
  @import '../assets/css/common.css';
</style>
