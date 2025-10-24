/**
 * 📦 數據存儲模組 (Data Store Module)
 *
 * 管理火災地點數據和地圖顯示功能
 * 使用 Pinia 狀態管理系統和 Vue 3 Composition API
 */

// 核心依賴
import { defineStore } from 'pinia';
import { ref, computed } from 'vue';

/**
 * 🏪 數據存儲商店定義 (Data Store Definition)
 *
 * 使用 Pinia 的 defineStore 創建一個名為 'data' 的狀態管理商店。
 * 採用 Composition API 語法，提供更好的 TypeScript 支援和代碼組織。
 *
 * @returns {Object} 包含所有狀態和方法的商店對象
 */
export const useDataStore = defineStore(
  'data', // 商店唯一標識符
  () => {
    // 📍 儲存的地點數據
    const savedLocations = ref([]);
    const loading = ref(false);
    const error = ref(null);

    // 🗺️ 地圖實例
    const mapInstance = ref(null);
    const selectedFeature = ref(null);

    /**
     * 📥 載入儲存的地點數據
     *
     * 從 public/data/已儲存的地點.json 載入所有儲存的地點數據
     */
    const loadSavedLocations = async () => {
      loading.value = true;
      error.value = null;

      try {
        console.log('📍 開始載入 JSON 文件...');
        const response = await fetch('/30DayMapChallenge-15_Fire/data/已儲存的地點.json');
        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        savedLocations.value = data.features || [];
        console.log(`📍 成功載入 ${savedLocations.value.length} 個儲存的地點`);
      } catch (err) {
        error.value = err.message;
        console.error('❌ 載入儲存的地點數據失敗:', err);
      } finally {
        loading.value = false;
      }
    };

    /**
     * 🗺️ 設定地圖實例
     */
    const setMapInstance = (map) => {
      mapInstance.value = map;
    };

    /**
     * 🎯 設定選中的要素
     */
    const setSelectedFeature = (feature) => {
      selectedFeature.value = feature;
    };

    /**
     * 🔍 根據屬性搜尋地點
     */
    const searchLocations = (query) => {
      if (!query) return savedLocations.value;

      return savedLocations.value.filter((location) => {
        const name = location.properties?.location?.name || '';
        const address = location.properties?.location?.address || '';
        return (
          name.toLowerCase().includes(query.toLowerCase()) ||
          address.toLowerCase().includes(query.toLowerCase())
        );
      });
    };

    /**
     * 📊 獲取統計資訊
     */
    const getStatistics = computed(() => {
      const total = savedLocations.value.length;
      const countries = [
        ...new Set(
          savedLocations.value.map((loc) => loc.properties?.location?.country_code || 'Unknown')
        ),
      ];

      return {
        total,
        countries: countries.length,
        countryList: countries,
      };
    });

    return {
      // 狀態
      savedLocations,
      loading,
      error,
      mapInstance,
      selectedFeature,

      // 方法
      loadSavedLocations,
      setMapInstance,
      setSelectedFeature,
      searchLocations,
      getStatistics,
    };
  },
  {
    persist: true,
  }
);
