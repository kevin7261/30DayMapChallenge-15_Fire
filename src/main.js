/**
 * 🚀 應用程式主入口文件 (Main Application Entry Point)
 *
 * 本文件是整個 Vue.js 應用程式的啟動入口，負責初始化所有核心系統和第三方依賴。
 * 採用模組化設計，確保各系統間的依賴關係清晰明確。
 *
 * 📋 主要功能模組：
 * 1. 🎨 樣式系統初始化 - Bootstrap 5 + 自定義主題 + 第三方 UI 庫樣式
 * 2. 🧩 Vue 3 應用程式核心 - 使用 Composition API 的現代化 Vue 架構
 * 3. 🗺️ 路由系統配置 - Vue Router 4 單頁應用程式導航管理
 * 4. 📦 狀態管理系統 - Pinia 全域狀態管理和數據持久化
 * 5. 🌍 DOM 掛載與渲染 - 將應用程式掛載到 HTML 容器中
 * 6. 🔧 第三方庫整合 - Leaflet 地圖、Font Awesome 圖示、Bootstrap 組件
 *
 * 🏗️ 技術架構：
 * - Vue 3.3+ (Composition API + <script setup> 語法)
 * - Vue Router 4 (聲明式路由配置)
 * - Pinia 2+ (輕量級狀態管理，替代 Vuex)
 * - Bootstrap 5.3+ (響應式 UI 框架)
 * - Leaflet 1.9+ (開源地圖庫)
 * - Font Awesome 6+ (向量圖示庫)
 *
 * 🔄 初始化流程：
 * 1. 載入所有必要的樣式和 JavaScript 依賴
 * 2. 創建 Vue 應用程式實例
 * 3. 配置並註冊路由系統
 * 4. 配置並註冊狀態管理系統
 * 5. 將應用程式掛載到 DOM 元素
 * 6. 輸出初始化完成日誌
 *
 * 📁 相關文件：
 * - ./App.vue - 根組件
 * - ./router/index.js - 路由配置
 * - ./stores/ - Pinia 狀態管理模組
 * - ./assets/css/ - 自定義樣式文件
 */

// 🔧 Vue 核心模組引入 (Vue Core Module Imports)
import { createApp } from 'vue';
import { createPinia } from 'pinia';

// 🧩 應用程式組件引入 (Application Component Imports)
import App from './App.vue';
import router from './router';

// 🎨 引入第三方樣式文件 (Import Third-Party Style Files)
import 'bootstrap/dist/css/bootstrap.min.css'; // Bootstrap 5 CSS 框架
import 'leaflet/dist/leaflet.css'; // Leaflet 地圖核心樣式
import '@fortawesome/fontawesome-free/css/all.min.css'; // Font Awesome 圖示庫

// 🎨 引入自定義樣式文件 (Import Custom Style Files)
import './assets/css/common.css'; // 共用樣式（已包含變數和主題配置）

// ⚙️ 引入第三方 JavaScript 文件 (Import Third-Party JavaScript Files)
import 'bootstrap/dist/js/bootstrap.bundle.min.js'; // Bootstrap JS（含 Popper.js）
// 提供下拉選單、模態框、工具提示等互動功能

// 🐛 調試資訊輸出 (Debug Information Output)
console.log('🎨 樣式文件載入完成');

// 🚀 創建並配置 Vue 應用程式實例 (Create and Configure Vue Application Instance)
const app = createApp(App);

// 📦 創建 Pinia 狀態管理實例 (Create Pinia State Management Instance)
const pinia = createPinia();

// 🗺️ 註冊 Vue Router 路由系統 (Register Vue Router Navigation System)
app.use(router);

// 📦 註冊 Pinia 狀態管理系統 (Register Pinia State Management System)
app.use(pinia);

// 🌍 掛載應用程式到 DOM 元素 (Mount Application to DOM Element)
// 將 Vue 應用程式掛載到 index.html 中 id="app" 的元素上
app.mount('#app');

// 🐛 應用程式啟動完成的調試資訊 (Application Startup Debug Information)
console.log('🚀 空間分析視覺化平台已啟動');
console.log('📦 Pinia 狀態管理已初始化');
console.log('🗺️ Vue Router 路由系統已就緒');
console.log('🎨 Bootstrap 5 UI 框架已載入');
console.log('🗺️ Leaflet 地圖庫已準備就緒');
console.log('🔤 Font Awesome 圖示庫已載入');
