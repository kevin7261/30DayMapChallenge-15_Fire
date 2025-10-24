<script>
  /**
   * 🗺️ MapTab.vue - 火災地圖組件 (Fire Map Component)
   *
   * 這是一個火災地圖組件，專為顯示火災地點數據設計。
   * 主要功能：
   * - 顯示火災地點的 GeoJSON 數據
   * - 支援自由縮放和拖拽
   * - 支援多種底圖切換
   * - 響應式設計
   *
   * 技術架構：
   * - Vue 3 Composition API
   * - Leaflet 地圖庫
   * - Pinia 狀態管理
   * - Bootstrap 5 樣式
   */

  import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue';
  import L from 'leaflet';
  import 'leaflet/dist/leaflet.css';
  import { useDataStore } from '@/stores/dataStore.js';
  import { useDefineStore } from '@/stores/defineStore.js';

  export default {
    name: 'MapTab',
    emits: ['map-ready'],
    setup(props, { emit }) {
      // 📦 存儲實例
      const dataStore = useDataStore();
      const defineStore = useDefineStore();

      // 🗺️ 地圖相關變數
      const mapContainer = ref(null);
      let mapInstance = null;
      let currentTileLayer = null;
      let savedMarkersLayer = null;

      // 🎛️ 地圖控制狀態
      const isMapReady = ref(false);
      const mapContainerId = ref(`leaflet-map-${Math.random().toString(36).substr(2, 9)}`);

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
            zoomControl: true, // 啟用縮放控制
            attributionControl: true, // 啟用屬性控制
            dragging: true, // 啟用拖拽
            touchZoom: true, // 啟用觸控縮放
            doubleClickZoom: true, // 啟用雙擊縮放
            scrollWheelZoom: true, // 啟用滾輪縮放
            boxZoom: true, // 啟用框選縮放
            keyboard: true, // 啟用鍵盤控制
          });

          // 綁定地圖事件
          mapInstance.on('zoomend', handleZoomEnd);
          mapInstance.on('moveend', handleMoveEnd);

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
      };

      /**
       * 📍 載入並顯示儲存的地點
       */
      const loadSavedLocations = async () => {
        try {
          console.log('📍 開始載入儲存的地點...');
          await dataStore.loadSavedLocations();
          console.log('📍 儲存的地點載入完成，數量:', dataStore.savedLocations.length);
          displaySavedLocations();
        } catch (error) {
          console.error('❌ 載入儲存的地點失敗:', error);
        }
      };

      /**
       * 🗺️ 在地圖上顯示儲存的地點
       */
      const displaySavedLocations = () => {
        console.log(
          '🗺️ 嘗試顯示儲存的地點，地圖實例:',
          !!mapInstance,
          '地點數量:',
          dataStore.savedLocations.length
        );
        if (!mapInstance || !dataStore.savedLocations.length) {
          console.log('❌ 無法顯示儲存的地點：地圖未準備好或沒有數據');
          return;
        }

        // 移除現有的標記
        if (savedMarkersLayer) {
          mapInstance.removeLayer(savedMarkersLayer);
        }

        // 創建新的標記圖層
        savedMarkersLayer = L.layerGroup();

        // 為每個儲存的地點創建標記
        dataStore.savedLocations.forEach((location) => {
          const [lng, lat] = location.geometry.coordinates;
          const properties = location.properties;

          // 創建地點標記
          const locationIcon = L.divIcon({
            className: 'location-marker',
            html: '<div class="location-marker-icon">📍</div>',
            iconSize: [20, 20],
            iconAnchor: [10, 10],
          });

          const marker = L.marker([lat, lng], { icon: locationIcon });

          // 創建彈出窗口內容
          const popupContent = `
            <div class="location-popup">
              <h6 class="mb-2">${properties.location?.name || '未知地點'}</h6>
              <p class="mb-1"><strong>地址:</strong> ${properties.location?.address || '無地址資訊'}</p>
              <p class="mb-1"><strong>國家:</strong> ${properties.location?.country_code || 'Unknown'}</p>
              <p class="mb-1"><strong>日期:</strong> ${new Date(properties.date).toLocaleDateString()}</p>
              ${properties.google_maps_url ? `<a href="${properties.google_maps_url}" target="_blank" class="btn btn-sm btn-primary">查看 Google 地圖</a>` : ''}
            </div>
          `;

          marker.bindPopup(popupContent);
          savedMarkersLayer.addLayer(marker);
        });

        // 將標記圖層添加到地圖
        mapInstance.addLayer(savedMarkersLayer);

        console.log(`📍 已在地圖上顯示 ${dataStore.savedLocations.length} 個儲存的地點`);
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
            // 延遲載入儲存的地點，確保地圖完全準備好
            setTimeout(() => {
              loadSavedLocations();
            }, 500);
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
        savedMarkersLayer = null;
        isMapReady.value = false;
      });

      // 👀 監聽器：監聽儲存的地點數據變化
      watch(() => dataStore.savedLocations, displaySavedLocations, { deep: true });

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
        invalidateSize,
        defineStore,
        dataStore,
      };
    },
  };
</script>

<template>
  <!-- 🗺️ 地圖主容器 -->
  <div id="map-container" class="h-100 w-100 position-relative bg-transparent z-0">
    <!-- 🗺️ Leaflet 地圖容器 -->
    <div :id="mapContainerId" ref="mapContainer" class="h-100 w-100"></div>

    <!-- 📊 統計資訊面板 -->
    <div class="position-absolute top-0 end-0 m-3">
      <div class="card shadow-sm" style="min-width: 200px">
        <div class="card-body p-3">
          <h6 class="card-title mb-2">📍 儲存的地點統計</h6>
          <div v-if="dataStore.loading" class="text-muted">
            <small>載入中...</small>
          </div>
          <div v-else-if="dataStore.error" class="text-danger">
            <small>載入失敗: {{ dataStore.error }}</small>
          </div>
          <div v-else>
            <p class="mb-1"><strong>總數:</strong> {{ dataStore.getStatistics.total }}</p>
            <p class="mb-1"><strong>國家數:</strong> {{ dataStore.getStatistics.countries }}</p>
            <p class="mb-0">
              <strong>國家:</strong> {{ dataStore.getStatistics.countryList.join(', ') }}
            </p>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style>
  @import '../assets/css/common.css';

  /* 📍 地點標記樣式 */
  .location-marker {
    background: transparent;
    border: none;
  }

  .location-marker-icon {
    font-size: 16px;
    text-align: center;
    line-height: 20px;
    filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3));
  }

  /* 📍 彈出窗口樣式 */
  .location-popup {
    min-width: 200px;
  }

  .location-popup h6 {
    color: #007bff;
    font-weight: bold;
  }

  .location-popup p {
    margin-bottom: 0.5rem;
    font-size: 0.9rem;
  }

  .location-popup .btn {
    margin-top: 0.5rem;
  }
</style>
