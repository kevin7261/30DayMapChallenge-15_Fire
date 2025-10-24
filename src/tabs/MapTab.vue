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
  import 'leaflet.heat';
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
      let worldMapLayer = null;
      let heatmapInstance = null;

      // 🎛️ 顯示模式控制
      const displayMode = ref('heatmap'); // 'point' 或 'heatmap'

      // 🔥 熱力圖配置
      const heatmapConfig = ref({
        radius: 25, // 熱力圖半徑（像素）
        maxZoom: 18,
        max: 1.0,
        minOpacity: 0.4,
        blur: 15,
        gradient: {
          0.4: 'red',
          0.6: 'orange',
          0.8: 'yellow',
          1.0: 'green',
        },
      });

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
            zoomControl: false, // 禁用縮放控制
            attributionControl: false, // 禁用屬性控制
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
       * 不使用任何底圖，只顯示世界地圖邊界和熱力圖
       */
      const setBasemap = () => {
        if (!mapInstance) return;

        // 移除現有底圖
        if (currentTileLayer) {
          mapInstance.removeLayer(currentTileLayer);
          currentTileLayer = null;
        }

        // 不添加任何底圖，只使用世界地圖邊界作為背景
        console.log('🗺️ 不使用底圖，只顯示世界地圖邊界和熱力圖');
      };

      /**
       * 🌍 載入世界地圖
       */
      const loadWorldMap = async () => {
        try {
          console.log('🌍 開始載入世界地圖...');
          const response = await fetch(
            '/30DayMapChallenge-15_Fire/data/ne_110m_admin_0_countries.geojson'
          );
          if (!response.ok) {
            console.warn('⚠️ 世界地圖文件不存在，跳過載入');
            return;
          }
          const worldData = await response.json();

          // 移除現有的世界地圖
          if (worldMapLayer) {
            mapInstance.removeLayer(worldMapLayer);
          }

          // 創建世界地圖圖層作為主要背景
          worldMapLayer = L.geoJSON(worldData, {
            style: {
              fillColor: '#ffffff',
              weight: 2,
              opacity: 1,
              color: '#333333',
              fillOpacity: 0.8,
            },
          });

          // 先添加到地圖
          worldMapLayer.addTo(mapInstance);

          // 使用多種方法確保世界地圖在最底層
          setTimeout(() => {
            if (worldMapLayer) {
              worldMapLayer.bringToBack();
              // 強制設置 z-index
              const worldMapElement = worldMapLayer.getElement();
              if (worldMapElement) {
                worldMapElement.style.zIndex = '1';
              }
            }
          }, 100);

          console.log('🌍 世界地圖載入完成');
        } catch (error) {
          console.warn('⚠️ 載入世界地圖失敗，繼續載入儲存的地點:', error);
        }
      };

      /**
       * 📍 載入並顯示儲存的地點
       */
      const loadSavedLocations = async () => {
        try {
          console.log('📍 開始載入儲存的地點...');
          console.log('📍 當前 dataStore:', dataStore);
          await dataStore.loadSavedLocations();
          console.log('📍 儲存的地點載入完成，數量:', dataStore.savedLocations.length);
          console.log('📍 前3個地點:', dataStore.savedLocations.slice(0, 3));
          displaySavedLocations();
        } catch (error) {
          console.error('❌ 載入儲存的地點失敗:', error);
        }
      };

      /**
       * 🔥 在地圖上顯示儲存的地點
       */
      const displaySavedLocations = () => {
        console.log(
          '🔥 嘗試顯示儲存的地點，模式:',
          displayMode.value,
          '地圖實例:',
          !!mapInstance,
          '地點數量:',
          dataStore.savedLocations.length
        );
        if (!mapInstance || !dataStore.savedLocations.length) {
          console.log('❌ 無法顯示儲存的地點：地圖未準備好或沒有數據');
          return;
        }

        // 清除現有圖層
        if (savedMarkersLayer) {
          mapInstance.removeLayer(savedMarkersLayer);
        }
        if (heatmapInstance) {
          mapInstance.removeLayer(heatmapInstance);
        }

        if (displayMode.value === 'point') {
          displayPoints();
        } else {
          displayHeatmap();
        }
      };

      /**
       * 📍 顯示點位
       */
      const displayPoints = () => {
        savedMarkersLayer = L.layerGroup();

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

        mapInstance.addLayer(savedMarkersLayer);

        // 確保世界地圖在最底層
        setTimeout(() => {
          if (worldMapLayer) {
            worldMapLayer.bringToBack();
            // 強制設置 z-index
            const worldMapElement = worldMapLayer.getElement();
            if (worldMapElement) {
              worldMapElement.style.zIndex = '1';
            }
          }
        }, 50);

        console.log(`📍 已在地圖上顯示 ${dataStore.savedLocations.length} 個點位`);
      };

      /**
       * 🔥 顯示熱力圖
       */
      const displayHeatmap = () => {
        // 移除現有熱力圖
        if (heatmapInstance) {
          mapInstance.removeLayer(heatmapInstance);
        }

        // 準備熱力圖數據
        const heatData = dataStore.savedLocations.map((location, index) => {
          const [lng, lat] = location.geometry.coordinates;
          // 計算強度值（0-1之間）
          const intensity = Math.min(1, (index + 1) / dataStore.savedLocations.length);
          return [lat, lng, intensity];
        });

        // 創建熱力圖圖層
        heatmapInstance = L.heatLayer(heatData, heatmapConfig.value);

        // 添加到地圖
        mapInstance.addLayer(heatmapInstance);

        // 確保世界地圖在最底層
        setTimeout(() => {
          if (worldMapLayer) {
            worldMapLayer.bringToBack();
            // 強制設置 z-index
            const worldMapElement = worldMapLayer.getElement();
            if (worldMapElement) {
              worldMapElement.style.zIndex = '1';
            }
          }
        }, 50);

        console.log(`🔥 已在地圖上顯示 ${dataStore.savedLocations.length} 個地點的熱力圖`);
      };

      /**
       * 🔄 切換顯示模式
       */
      const toggleDisplayMode = (mode) => {
        displayMode.value = mode;
        displaySavedLocations();
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
            // 延遲載入世界地圖和儲存的地點，確保地圖完全準備好
            setTimeout(async () => {
              await loadWorldMap();
              await loadSavedLocations();
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
        worldMapLayer = null;
        heatmapInstance = null;
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
        displayMode,
        toggleDisplayMode,
      };
    },
  };
</script>

<template>
  <!-- 🗺️ 地圖主容器 -->
  <div id="map-container" class="h-100 w-100 position-relative bg-transparent z-0">
    <!-- 🎛️ 左側中間控制面板 -->
    <div
      class="position-absolute"
      style="top: 50%; left: 0; transform: translateY(-50%); z-index: 1000; padding: 1rem"
    >
      <div class="bg-dark bg-opacity-75 rounded-3 p-3">
        <!-- 🎛️ 顯示模式選擇區域 -->
        <div class="">
          <div class="d-flex flex-column gap-1">
            <button
              type="button"
              class="btn border-0 my-country-btn my-font-sm-white px-4 py-3"
              :class="[displayMode === 'point' ? 'active' : '']"
              @click="toggleDisplayMode('point')"
            >
              POINT
            </button>
            <button
              type="button"
              class="btn border-0 my-country-btn my-font-sm-white px-4 py-3"
              :class="[displayMode === 'heatmap' ? 'active' : '']"
              @click="toggleDisplayMode('heatmap')"
            >
              HEATMAP
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- 🗺️ Leaflet 地圖容器 -->
    <div :id="mapContainerId" ref="mapContainer" class="h-100 w-100"></div>
  </div>
</template>

<style>
  @import '../assets/css/common.css';

  /* 🔥 熱力圖樣式 */
  .heatmap-circle {
    border-radius: 50%;
    box-shadow: 0 0 15px rgba(0, 0, 0, 0.3);
    filter: blur(1px);
    transition: all 0.3s ease;
  }

  .heatmap-circle:hover {
    filter: blur(0px);
    box-shadow: 0 0 20px rgba(0, 0, 0, 0.5);
    transform: scale(1.05);
  }

  /* 📍 點位標記樣式 */
  .location-marker {
    background: transparent;
    border: none;
  }

  .location-marker-icon {
    font-size: 20px;
    text-align: center;
    line-height: 20px;
  }

  /* 📍 彈出窗口樣式 */
  .location-popup {
    min-width: 200px;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
  }

  .location-popup h6 {
    color: #333;
    font-weight: 600;
    margin-bottom: 8px;
  }

  .location-popup p {
    margin-bottom: 4px;
    font-size: 14px;
    color: #666;
  }

  .location-popup .btn {
    margin-top: 8px;
    font-size: 12px;
    padding: 4px 8px;
  }

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
