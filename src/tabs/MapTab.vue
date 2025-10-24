<script>
  /**
   * 🗺️ MapTab.vue - 簡化版地圖組件 (Simplified Map Component)
   *
   * 這是一個簡化的地圖組件，專為世界城市地圖展示設計。
   * 主要功能：
   * - 顯示世界六大城市的 GeoJSON 數據
   * - 提供城市導航功能
   * - 支援多種底圖切換
   * - 響應式設計
   *
   * 技術架構：
   * - Vue 3 Composition API
   * - Leaflet 地圖庫
   * - Pinia 狀態管理
   * - Bootstrap 5 樣式
   */

  import { ref, onMounted, onUnmounted, watch, nextTick, computed } from 'vue';
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  import { useDataStore } from '@/stores/dataStore.js';
  import { useDefineStore } from '@/stores/defineStore.js';

  export default {
    name: 'MapTab',
    props: {
      currentCountry: { type: String, default: '國家名稱' },
    },
    emits: ['map-ready'],
    setup(props, { emit }) {
      // 📦 存儲實例
      const dataStore = useDataStore();
      const defineStore = useDefineStore();

      // 🗺️ 地圖相關變數
      const mapContainer = ref(null);
      let mapInstance = null;
      let currentTileLayer = null;

      // 🎛️ 地圖控制狀態
      const isMapReady = ref(false);
      const mapContainerId = ref(`leaflet-map-${Math.random().toString(36).substr(2, 9)}`);

      // 📊 計算屬性：檢查是否有任何圖層可見（現在所有圖層都直接可見）
      const isAnyLayerVisible = computed(() => dataStore.getAllLayers().length > 0);

      // 🏙️ 當前國家信息
      const currentCountryInfo = computed(() => {
        if (!props.currentCountry) {
          console.log('❌ currentCountryInfo: 沒有當前國家');
          return null;
        }

        // 從dataStore中獲取國家信息
        const allLayers = dataStore.getAllLayers();
        console.log(
          '🔍 查找國家:',
          props.currentCountry,
          '可用圖層:',
          allLayers.map((l) => l.layerName)
        );

        const countryLayer = allLayers.find((layer) => layer.layerName === props.currentCountry);
        if (countryLayer) {
          console.log('✅ 找到國家圖層:', countryLayer.layerName);
          return {};
        } else {
          console.log('❌ 未找到國家圖層:', props.currentCountry);
          return null;
        }
      });

      /**
       * 🏗️ 創建地圖實例
       * 初始化 Leaflet 地圖並設定基本配置
       */
      const createMap = () => {
        if (!mapContainer.value) return false;

        const rect = mapContainer.value.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          console.warn('[MapTab] 容器尺寸為零，延遲初始化');
          return false;
        }

        try {
          mapInstance = L.map(mapContainer.value, {
            center: defineStore.mapView.center,
            zoom: defineStore.mapView.zoom,
            zoomControl: false,
            attributionControl: false,
            dragging: false, // 禁用拖拽
            touchZoom: false, // 禁用觸控縮放
            doubleClickZoom: false, // 禁用雙擊縮放
            scrollWheelZoom: false, // 禁用滾輪縮放
            boxZoom: false, // 禁用框選縮放
            keyboard: false, // 禁用鍵盤控制
          });

          // 綁定地圖事件
          mapInstance.on('zoomend', handleZoomEnd);
          mapInstance.on('moveend', handleMoveEnd);

          // 移除地圖點擊事件處理

          // 設定 popup 面板的 z-index
          mapInstance.getPane('popupPane').style.zIndex = 2200;

          isMapReady.value = true;
          emit('map-ready', mapInstance);

          console.log('[MapTab] 地圖創建成功');
          return true;
        } catch (error) {
          console.error('[MapTab] 地圖創建失敗:', error);
          return false;
        }
      };

      /**
       * 📡 處理縮放結束事件
       * 更新地圖視圖狀態到存儲中
       */
      const handleZoomEnd = () => {
        if (mapInstance) {
          const zoom = mapInstance.getZoom();
          const center = mapInstance.getCenter();
          defineStore.setMapView([center.lat, center.lng], zoom);
          emit('update:zoomLevel', zoom);
        }
      };

      /**
       * 📡 處理移動結束事件
       * 更新地圖中心座標
       */
      const handleMoveEnd = () => {
        if (mapInstance) {
          const center = mapInstance.getCenter();
          defineStore.setMapView([center.lat, center.lng], mapInstance.getZoom());
          emit('update:currentCoords', { lat: center.lat, lng: center.lng });
        }
      };

      /**
       * 🎨 設定底圖
       * 根據存儲中的設定載入對應的底圖圖層
       */
      const setBasemap = () => {
        if (!mapInstance) return;

        // 移除現有底圖
        if (currentTileLayer) {
          mapInstance.removeLayer(currentTileLayer);
        }

        const config = defineStore.basemaps.find((b) => b.value === defineStore.selectedBasemap);

        // 添加底圖圖層
        if (config && config.url) {
          currentTileLayer = L.tileLayer(config.url, {
            attribution: '© Google',
            maxZoom: 20,
            subdomains: ['mt0', 'mt1', 'mt2', 'mt3'],
          });
          mapInstance.addLayer(currentTileLayer);
        }

        // 使用預設的透明背景，不設定任何特殊背景色
      };

      // 移除地圖標記功能，改為在 HTML 上顯示中心點

      /**
       * 🎯 高亮顯示特定要素
       * 當用戶點擊地圖要素時高亮顯示
       */
      const highlightFeature = (feature) => {
        // 重置所有圖層樣式
        resetAllLayerStyles();

        // 高亮選中的要素
        if (feature && feature._leaflet_id) {
          // 這裡可以添加高亮邏輯
          console.log('高亮要素:', feature.properties.name);
        }
      };

      /**
       * 🔄 重置所有圖層樣式
       * 清除所有高亮效果
       */
      const resetAllLayerStyles = () => {
        // 這裡可以添加重置樣式的邏輯
        console.log('重置圖層樣式');
      };

      /**
       * 🔄 同步圖層（已移除標記功能）
       * 不再在地圖上創建標記，改為在 HTML 上顯示
       */
      const syncLayers = () => {
        // 移除地圖標記功能，不需要同步任何圖層
        console.log('圖層同步已禁用，使用 HTML 中心點顯示');
      };

      /**
       * 📏 刷新地圖尺寸
       * 當容器大小改變時重新計算地圖尺寸
       */
      const invalidateSize = () => {
        if (mapInstance) {
          setTimeout(() => {
            mapInstance.invalidateSize();
          }, 100);
        }
      };

      /**
       * 🚀 初始化地圖
       * 創建地圖並載入初始數據
       */
      const initMap = () => {
        let attempts = 0;
        const maxAttempts = 20;

        const tryCreateMap = () => {
          if (attempts >= maxAttempts) {
            console.error('[MapTab] 地圖初始化失敗，已達到最大嘗試次數');
            return;
          }

          attempts++;
          console.log(`[MapTab] 嘗試創建地圖 (${attempts}/${maxAttempts})`);

          if (createMap()) {
            console.log('[MapTab] 地圖創建成功，開始初始化');
            setBasemap();
            syncLayers();
          } else {
            console.log('[MapTab] 地圖創建失敗，100ms 後重試');
            setTimeout(tryCreateMap, 100);
          }
        };

        tryCreateMap();
      };

      // 📏 設置 ResizeObserver 監聽容器大小變化
      let resizeObserver = null;
      let resizeTimeout = null;

      const setupResizeObserver = () => {
        if (!mapContainer.value || !window.ResizeObserver) return;

        resizeObserver = new ResizeObserver(() => {
          if (resizeTimeout) {
            clearTimeout(resizeTimeout);
          }

          resizeTimeout = setTimeout(() => {
            console.log('🔄 容器大小變化，刷新地圖');
            invalidateSize();
          }, 200);
        });

        resizeObserver.observe(mapContainer.value);
        console.log('✅ ResizeObserver 已設置');
      };

      // 🧹 生命週期：組件掛載
      onMounted(() => {
        nextTick(() => {
          initMap();
          setupResizeObserver();
        });
      });

      // 🧹 生命週期：組件卸載
      onUnmounted(() => {
        if (resizeTimeout) {
          clearTimeout(resizeTimeout);
        }

        if (resizeObserver) {
          resizeObserver.disconnect();
        }

        if (mapInstance) {
          mapInstance.remove();
          mapInstance = null;
        }

        currentTileLayer = null;
        isMapReady.value = false;
      });

      // 👀 監聽器：監聽資料存儲中的圖層變化
      watch(() => dataStore.layers, syncLayers, { deep: true });

      // 👀 監聽器：監聽底圖變化
      watch(
        () => defineStore.selectedBasemap,
        () => {
          if (isMapReady.value) {
            setBasemap();
          }
        }
      );

      // 📤 返回組件公開的屬性和方法
      return {
        mapContainer,
        mapContainerId,
        isAnyLayerVisible,
        currentCountryInfo,
        highlightFeature,
        invalidateSize,
        defineStore,
      };
    },
  };
</script>

<template>
  <!-- 🗺️ 地圖主容器 -->
  <div id="map-container" class="h-100 w-100 position-relative bg-transparent z-0">
    <!-- 🗺️ Leaflet 地圖容器 -->
    <div :id="mapContainerId" ref="mapContainer" class="h-100 w-100"></div>
  </div>
</template>

<style>
  @import '../assets/css/common.css';
</style>
