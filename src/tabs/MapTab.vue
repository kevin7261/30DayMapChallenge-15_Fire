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
  import * as d3 from 'd3';
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
      let savedMarkersLayer = null;
      let worldMapLayer = null;
      let heatmapInstance = null;
      // 共享的 D3 投影（供世界地圖和熱力圖使用）
      let sharedProjection = null;

      // 🎛️ 顯示模式控制
      const displayMode = ref('heatmap'); // 'point' 或 'heatmap'

      // 🔥 熱力圖配置 - 火焰風格（從黑到白）
      const heatmapConfig = ref({
        radius: 25, // 熱力圖半徑（像素）- 增大半徑讓火焰更明顯
        maxZoom: 18,
        max: 1.0,
        minOpacity: 0.9, // 中心完全不透明，邊緣會逐漸變透明
        blur: 12, // 適度模糊，讓火焰邊緣更自然
        gradient: {
          0.0: '#000000', // 黑色 - 無火災/最低強度（火焰頂部/消散）
          0.1: '#400000', // 深暗紅色 - 最低溫
          0.2: '#800000', // 深紅色 - 低溫
          0.3: '#B62203', // 紅色 - 中低溫
          0.4: '#D73502', // 橙紅色 - 中低溫
          0.5: '#FC6400', // 橙色 - 中溫
          0.6: '#FF7500', // 亮橙色 - 中高溫
          0.7: '#FFA500', // 橙黃色 - 高溫
          0.8: '#FFD700', // 金黃色 - 高溫
          0.9: '#FFFF00', // 亮黃色 - 極高溫
          0.95: '#FFFFAA', // 淡黃色/接近白色 - 最高溫
          1.0: '#FFFFFF', // 白色 - 最熱/最亮（火焰核心）
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
            zoom: defineStore.mapView.zoom - 1, // 縮小一級
            zoomControl: false, // 禁用縮放控制
            attributionControl: false, // 禁用屬性控制
            dragging: false, // 禁用拖拽
            touchZoom: false, // 禁用觸控縮放
            doubleClickZoom: false, // 禁用雙擊縮放
            scrollWheelZoom: false, // 禁用滾輪縮放
            boxZoom: false, // 禁用框選縮放
            keyboard: false, // 禁用鍵盤控制
          });

          // 確保所有交互功能都被禁用
          mapInstance.dragging.disable();
          mapInstance.touchZoom.disable();
          mapInstance.doubleClickZoom.disable();
          mapInstance.scrollWheelZoom.disable();
          mapInstance.boxZoom.disable();
          mapInstance.keyboard.disable();

          // 創建自定義 pane 來控制圖層順序
          // 世界地圖 pane (最底層)
          const worldPane = mapInstance.createPane('worldPane');
          worldPane.style.zIndex = 200; // 比預設的 overlayPane (400) 低

          // 熱力圖 pane (中間層)
          const heatmapPane = mapInstance.createPane('heatmapPane');
          heatmapPane.style.zIndex = 400; // 和 overlayPane 同層級

          // 標記 pane (最上層)
          const markerPane = mapInstance.createPane('markerPane');
          markerPane.style.zIndex = 600; // 比 overlayPane 高

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
       * 🎨 設定底圖 - 黑色海洋風格
       * 設定黑色海洋背景和世界地圖邊界
       */
      const setBasemap = () => {
        if (!mapInstance) return;

        // 設定地圖容器背景為黑色（海洋區域）
        const mapContainer = document.getElementById(mapContainerId.value);
        if (mapContainer) {
          mapContainer.style.backgroundColor = 'var(--my-color-black)';
        }

        console.log('🗺️ 設定黑色海洋背景和世界地圖邊界');
      };

      /**
       * 🌍 載入世界地圖 - 使用 D3 geoConicEqualArea 投影
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

          // 創建共享的 D3 投影
          if (!sharedProjection) {
            sharedProjection = d3.geoConicEqualArea();
          }

          // 創建自定義 Leaflet 圖層類，使用 D3 geoConicEqualArea 投影
          const D3GeoJSONLayer = L.Layer.extend({
            initialize: function (data, options) {
              L.setOptions(this, options);
              this._data = data;
              // 使用共享投影
              this._projection = sharedProjection;
            },

            onAdd: function (map) {
              this._map = map;
              const pane = map.getPane(this.options.pane || 'overlayPane');

              // 創建 SVG 容器
              this._svg = d3
                .select(pane)
                .append('svg')
                .attr('class', 'd3-geojson-layer')
                .style('position', 'absolute')
                .style('pointer-events', 'none');

              // 創建 countries group
              this._countries = this._svg.append('g').attr('class', 'countries');

              // 綁定事件監聽器
              map.on('viewreset', this._reset, this);
              map.on('move', this._reset, this);
              map.on('zoom', this._reset, this);
              map.on('resize', this._reset, this);

              // 初始渲染
              this._reset();
            },

            onRemove: function (map) {
              map.off('viewreset', this._reset, this);
              map.off('move', this._reset, this);
              map.off('zoom', this._reset, this);
              map.off('resize', this._reset, this);

              if (this._svg) {
                this._svg.remove();
              }
            },

            _reset: function () {
              if (!this._map || !this._svg) return;

              const map = this._map;
              const size = map.getSize();

              // 計算投影參數
              const center = map.getCenter();
              const zoom = map.getZoom();

              // 設定投影的中心、scale 和 translate
              this._projection
                .center([center.lng, center.lat])
                .scale(Math.pow(2, zoom) * 100)
                .translate([size.x / 2, size.y / 2]);

              // 更新 SVG 尺寸
              this._svg
                .attr('width', size.x)
                .attr('height', size.y)
                .style('left', 0)
                .style('top', 0);

              // 渲染地圖
              this._render();
            },

            _render: function () {
              if (!this._data || !this._countries) return;

              // 創建 geoPath 生成器
              const path = d3.geoPath().projection(this._projection);

              // 綁定數據
              const countriesData = this._countries.selectAll('path').data(this._data.features);

              // 進入新元素
              const enter = countriesData
                .enter()
                .append('path')
                .attr('fill', 'var(--my-color-gray-900)');

              // 合併並更新所有元素
              enter.merge(countriesData).attr('d', path);

              // 移除不需要的元素
              countriesData.exit().remove();
            },
          });

          // 創建圖層實例
          worldMapLayer = new D3GeoJSONLayer(worldData, {
            pane: 'worldPane',
          });

          // 添加到地圖
          worldMapLayer.addTo(mapInstance);

          console.log('🌍 世界地圖載入完成 (使用 D3 geoConicEqualArea 投影)');
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
       * 📍 顯示點位 - 使用 D3 geoConicEqualArea 投影
       */
      const displayPoints = () => {
        // 移除現有點位圖層
        if (savedMarkersLayer) {
          mapInstance.removeLayer(savedMarkersLayer);
        }

        // 確保共享投影已創建
        if (!sharedProjection) {
          sharedProjection = d3.geoConicEqualArea();
        }

        // 準備點位數據
        const pointsData = dataStore.savedLocations.map((location) => {
          const [lng, lat] = location.geometry.coordinates;
          const properties = location.properties;

          // 創建 tooltip 文本內容
          const tooltipText = properties.location?.name || '未知地點';

          return { lng, lat, properties, tooltipText };
        });

        // 創建自定義 D3 點位圖層類
        const D3PointLayer = L.Layer.extend({
          initialize: function (data, projection, options) {
            L.setOptions(this, options);
            this._data = data;
            this._projection = projection;
            this._tooltips = {};
          },

          onAdd: function (map) {
            this._map = map;
            const pane = map.getPane(this.options.pane || 'overlayPane');

            // 獲取地圖尺寸
            const size = map.getSize();

            // 創建 SVG 容器（允許子元素交互）
            this._svg = d3
              .select(pane)
              .append('svg')
              .attr('class', 'd3-point-layer')
              .attr('width', size.x)
              .attr('height', size.y)
              .style('position', 'absolute')
              .style('left', 0)
              .style('top', 0)
              .style('pointer-events', 'none')
              .style('z-index', '1000');

            // 創建 points group
            this._points = this._svg.append('g').attr('class', 'points');

            // 綁定事件監聽器
            map.on('viewreset', this._reset, this);
            map.on('move', this._reset, this);
            map.on('zoom', this._reset, this);
            map.on('resize', this._reset, this);

            // 初始渲染
            this._reset();
          },

          onRemove: function (map) {
            map.off('viewreset', this._reset, this);
            map.off('move', this._reset, this);
            map.off('zoom', this._reset, this);
            map.off('resize', this._reset, this);

            // 移除所有 tooltip
            Object.values(this._tooltips).forEach((tooltip) => {
              if (tooltip) {
                map.removeLayer(tooltip);
              }
            });

            if (this._svg) {
              this._svg.remove();
            }
          },

          _reset: function () {
            if (!this._map || !this._svg) return;

            const map = this._map;
            const size = map.getSize();

            // 計算投影參數
            const center = map.getCenter();
            const zoom = map.getZoom();

            // 設定投影的中心、scale 和 translate
            this._projection
              .center([center.lng, center.lat])
              .scale(Math.pow(2, zoom) * 100)
              .translate([size.x / 2, size.y / 2]);

            // 更新 SVG 尺寸
            this._svg.attr('width', size.x).attr('height', size.y).style('left', 0).style('top', 0);

            // 渲染點位
            this._render();
          },

          _render: function () {
            if (!this._data || !this._points) return;

            const pointsGroup = this._points;

            // 綁定數據
            const pointsData = pointsGroup.selectAll('circle.point').data(this._data);

            // 進入新元素
            const enter = pointsData
              .enter()
              .append('circle')
              .attr('class', 'point')
              .attr('r', 6)
              .attr('fill', '#ff0000')
              .attr('stroke', '#ffffff')
              .attr('stroke-width', 2)
              .style('pointer-events', 'all')
              .style('cursor', 'pointer');

            // 合併並更新所有點位
            const projection = this._projection;
            const layerInstance = this;

            enter.merge(pointsData).each(function (d) {
              // 使用投影將地理座標轉換為畫布座標
              const projected = projection([d.lng, d.lat]);
              if (!projected || !isFinite(projected[0]) || !isFinite(projected[1])) {
                d3.select(this).style('display', 'none');
                return;
              }
              const [x, y] = projected;
              const circle = d3.select(this);
              circle.attr('cx', x).attr('cy', y).style('display', null);

              // 綁定鼠標懸停事件顯示 tooltip
              circle
                .on('mouseenter', function () {
                  layerInstance._showTooltip(d);
                })
                .on('mouseleave', function () {
                  layerInstance._hideTooltip(d);
                });
            });

            // 移除不需要的元素
            pointsData.exit().remove();
          },

          _showTooltip: function (data) {
            const map = this._map;

            // 使用投影獲取點位的屏幕座標
            const projected = this._projection([data.lng, data.lat]);
            if (!projected || !isFinite(projected[0]) || !isFinite(projected[1])) return;

            const [x, y] = projected;

            // 將屏幕座標轉換為地圖座標
            const containerPoint = L.point(x, y);
            const latlng = map.containerPointToLatLng(containerPoint);

            // 移除舊的 tooltip
            const tooltipId = `${data.lng}_${data.lat}`;
            if (this._tooltips[tooltipId]) {
              map.removeLayer(this._tooltips[tooltipId]);
            }

            // 創建新的 tooltip
            const tooltip = L.tooltip({
              permanent: false,
              direction: 'top',
              offset: [0, -10],
            })
              .setLatLng(latlng)
              .setContent(data.tooltipText)
              .addTo(map);

            this._tooltips[tooltipId] = tooltip;
          },

          _hideTooltip: function (data) {
            const map = this._map;
            const tooltipId = `${data.lng}_${data.lat}`;
            if (this._tooltips[tooltipId]) {
              map.removeLayer(this._tooltips[tooltipId]);
              delete this._tooltips[tooltipId];
            }
          },
        });

        // 創建點位圖層實例
        savedMarkersLayer = new D3PointLayer(pointsData, sharedProjection, {
          pane: 'markerPane',
        });

        // 添加到地圖
        savedMarkersLayer.addTo(mapInstance);

        console.log(`📍 已在地圖上顯示 ${dataStore.savedLocations.length} 個點位（D3 投影）`);
      };

      /**
       * 🔥 顯示熱力圖 - 使用 D3 geoConicEqualArea 投影
       */
      const displayHeatmap = () => {
        // 移除現有熱力圖
        if (heatmapInstance) {
          mapInstance.removeLayer(heatmapInstance);
        }

        // 確保共享投影已創建
        if (!sharedProjection) {
          sharedProjection = d3.geoConicEqualArea();
        }

        // 準備熱力圖數據
        const heatData = dataStore.savedLocations.map((location, index) => {
          const [lng, lat] = location.geometry.coordinates;
          // 計算強度值（0-1之間）
          const intensity = Math.min(1, (index + 1) / dataStore.savedLocations.length);
          return { lng, lat, intensity };
        });

        // 創建自定義 D3 熱力圖圖層類
        const D3HeatmapLayer = L.Layer.extend({
          initialize: function (data, projection, config, options) {
            L.setOptions(this, options);
            this._data = data;
            this._projection = projection;
            this._config = config;
          },

          onAdd: function (map) {
            this._map = map;
            const pane = map.getPane(this.options.pane || 'overlayPane');

            // 創建 Canvas 容器（性能更好）
            this._canvas = document.createElement('canvas');
            this._canvas.className = 'd3-heatmap-layer';
            this._canvas.style.position = 'absolute';
            this._canvas.style.pointerEvents = 'none';
            this._canvas.style.left = '0';
            this._canvas.style.top = '0';
            pane.appendChild(this._canvas);

            // 獲取 2D 上下文
            this._ctx = this._canvas.getContext('2d');

            // 綁定事件監聽器
            map.on('viewreset', this._reset, this);
            map.on('move', this._reset, this);
            map.on('zoom', this._reset, this);
            map.on('resize', this._reset, this);

            // 初始渲染
            this._reset();
          },

          onRemove: function (map) {
            map.off('viewreset', this._reset, this);
            map.off('move', this._reset, this);
            map.off('zoom', this._reset, this);
            map.off('resize', this._reset, this);

            if (this._canvas && this._canvas.parentNode) {
              this._canvas.parentNode.removeChild(this._canvas);
            }
          },

          _reset: function () {
            if (!this._map || !this._canvas) return;

            const map = this._map;
            const size = map.getSize();

            // 計算投影參數
            const center = map.getCenter();
            const zoom = map.getZoom();

            // 設定投影的中心、scale 和 translate
            this._projection
              .center([center.lng, center.lat])
              .scale(Math.pow(2, zoom) * 100)
              .translate([size.x / 2, size.y / 2]);

            // 更新 Canvas 尺寸
            this._canvas.width = size.x;
            this._canvas.height = size.y;
            this._canvas.style.width = size.x + 'px';
            this._canvas.style.height = size.y + 'px';

            // 渲染熱力圖
            this._render();
          },

          _render: function () {
            if (!this._data || !this._ctx) return;

            const ctx = this._ctx;
            const config = this._config;
            const canvas = this._canvas;

            // 清除畫布
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // 顏色轉換函數（根據強度值獲取漸變色，支持平滑插值）
            const hexToRgb = (hex) => {
              const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
              return result
                ? {
                    r: parseInt(result[1], 16),
                    g: parseInt(result[2], 16),
                    b: parseInt(result[3], 16),
                  }
                : null;
            };

            const rgbToHex = (r, g, b) => {
              return (
                '#' + [r, g, b].map((x) => Math.round(x).toString(16).padStart(2, '0')).join('')
              );
            };

            const interpolateColor = (color1, color2, factor) => {
              const rgb1 = hexToRgb(color1);
              const rgb2 = hexToRgb(color2);
              if (!rgb1 || !rgb2) return color1;

              const r = rgb1.r + (rgb2.r - rgb1.r) * factor;
              const g = rgb1.g + (rgb2.g - rgb1.g) * factor;
              const b = rgb1.b + (rgb2.b - rgb1.b) * factor;

              return rgbToHex(r, g, b);
            };

            const getColor = (intensity) => {
              const stops = Object.keys(config.gradient)
                .map((k) => ({ stop: parseFloat(k), color: config.gradient[k] }))
                .sort((a, b) => a.stop - b.stop);

              if (intensity <= 0) return stops[0].color;
              if (intensity >= 1) return stops[stops.length - 1].color;

              // 找到強度值所在的區間並進行插值
              for (let i = 0; i < stops.length - 1; i++) {
                if (intensity >= stops[i].stop && intensity <= stops[i + 1].stop) {
                  const range = stops[i + 1].stop - stops[i].stop;
                  const factor = (intensity - stops[i].stop) / range;
                  return interpolateColor(stops[i].color, stops[i + 1].color, factor);
                }
              }
              return stops[0].color;
            };

            // 繪製每個熱力點
            this._data.forEach((point) => {
              // 使用投影將地理座標轉換為畫布座標
              const projected = this._projection([point.lng, point.lat]);
              if (!projected || !isFinite(projected[0]) || !isFinite(projected[1])) return;

              const [x, y] = projected;

              // 計算半徑
              const radius = config.radius;

              // 獲取顏色
              const color = getColor(point.intensity);

              // 創建徑向漸變（從中心到邊緣，從不透明到透明）- 像真實火焰
              const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);

              // 轉換顏色為 RGBA 格式（支援十六進制）
              const colorToRgba = (colorStr, alphaValue) => {
                // 如果已經是 rgba 格式，提取 RGB 並使用新的 alpha
                if (colorStr.startsWith('rgba(')) {
                  const match = colorStr.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
                  if (match) {
                    return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alphaValue})`;
                  }
                }

                // 如果是 rgb 格式（無 alpha），添加 alpha
                if (colorStr.startsWith('rgb(')) {
                  const match = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
                  if (match) {
                    return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alphaValue})`;
                  }
                }

                // 處理十六進制顏色
                if (colorStr.startsWith('#')) {
                  const r = parseInt(colorStr.slice(1, 3), 16);
                  const g = parseInt(colorStr.slice(3, 5), 16);
                  const b = parseInt(colorStr.slice(5, 7), 16);
                  if (!isNaN(r) && !isNaN(g) && !isNaN(b)) {
                    return `rgba(${r}, ${g}, ${b}, ${alphaValue})`;
                  }
                }

                // 如果無法解析，使用默認顏色
                console.warn(`無法解析顏色: ${colorStr}，使用默認顏色`);
                return `rgba(255, 0, 0, ${alphaValue})`;
              };

              // 火焰風格的漸變：中心最亮完全不透明，邊緣逐漸透明
              // 中心：完全不透明（最亮的火焰）
              gradient.addColorStop(0, colorToRgba(color, config.minOpacity));
              // 內圈：保持高透明度
              gradient.addColorStop(0.3, colorToRgba(color, config.minOpacity * 0.9));
              // 中圈：開始變透明
              gradient.addColorStop(0.6, colorToRgba(color, config.minOpacity * 0.6));
              // 外圈：較透明
              gradient.addColorStop(0.85, colorToRgba(color, config.minOpacity * 0.3));
              // 邊緣：完全透明（火焰邊緣消失）
              gradient.addColorStop(1, colorToRgba(color, 0));

              // 繪製圓形
              ctx.beginPath();
              ctx.fillStyle = gradient;
              ctx.arc(x, y, radius, 0, Math.PI * 2);
              ctx.fill();
            });

            // 應用整體模糊效果（如果配置了）
            if (config.blur > 0) {
              // 創建臨時畫布來應用模糊
              const tempCanvas = document.createElement('canvas');
              tempCanvas.width = canvas.width;
              tempCanvas.height = canvas.height;
              const tempCtx = tempCanvas.getContext('2d');

              // 先應用模糊效果到臨時畫布
              tempCtx.filter = `blur(${config.blur}px)`;
              tempCtx.drawImage(canvas, 0, 0);

              // 清除原畫布並繪製模糊後的圖像
              ctx.clearRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(tempCanvas, 0, 0);
            }

            console.log(`🔥 已在地圖上顯示 ${this._data.length} 個地點的熱力圖（D3 投影）`);
          },
        });

        // 創建熱力圖圖層實例
        heatmapInstance = new D3HeatmapLayer(heatData, sharedProjection, heatmapConfig.value, {
          pane: 'heatmapPane',
        });

        // 添加到地圖
        heatmapInstance.addTo(mapInstance);
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

  /* 📍 點位標記樣式 - 小紅圓 */
  .location-marker {
    background: transparent;
    border: none;
  }

  .location-marker-icon {
    width: 12px;
    height: 12px;
    background-color: #ff0000;
    border-radius: 50%;
    border: 2px solid #ffffff;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
  }

  /* 🌑 黑色海洋背景 */
  .leaflet-container {
    background-color: var(--my-color-black) !important;
  }

  /* 🌑 地圖容器黑色背景 */
  #map-container {
    background-color: var(--my-color-black);
  }

  /* 🌑 黑色海洋背景 */
  .leaflet-tile-container {
    background-color: var(--my-color-black) !important;
  }
</style>
