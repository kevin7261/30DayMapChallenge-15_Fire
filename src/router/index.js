/**
 * 🚀 Vue Router 路由配置
 *
 * 長照空間分析系統的路由管理
 * 使用 Vue Router 4 進行單頁應用程式路由控制
 *
 * @author 長照空間分析團隊
 * @version 1.0.0
 */

import { createRouter, createWebHistory } from 'vue-router';
import HomeView from '../views/HomeView.vue';

/**
 * 📍 路由配置陣列
 * 定義應用程式的所有路由規則
 */
const routes = [
  {
    path: '/', // 🏠 根路徑
    name: 'Home', // 路由名稱
    component: HomeView, // 對應的 Vue 組件
  },
];

/**
 * 🛣️ 路由器實例創建
 *
 * 配置說明：
 * - history: 使用 HTML5 History API 模式
 * - base: 設定應用程式的基礎路徑為 '/30DayMapChallenge-15_Fire/'
 * - routes: 路由配置陣列
 */
const router = createRouter({
  history: createWebHistory('/30DayMapChallenge-15_Fire/'),
  routes,
});

export default router;
