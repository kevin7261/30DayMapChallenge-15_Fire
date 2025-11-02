# 資料檔案夾 (Data Directory)

這個資料夾用於存放專案中使用的 JSON 資料檔案。

## 檔案組織建議

```
src/data/
├── README.md                 # 本說明檔案
├── sample-data.json         # 示例資料檔案
├── districts/               # 行政區相關資料
│   ├── taipei-districts.json
│   └── population-data.json
├── geojson/                 # 地理資料檔案
│   ├── taipei-boundaries.geojson
│   └── roads-network.geojson
├── statistics/              # 統計資料
│   ├── demographic-data.json
│   └── economic-indicators.json
└── time-series/             # 時間序列資料
    ├── daily-data.json
    └── monthly-summary.json
```

## 檔案命名規範

- 使用小寫字母和連字符 (`-`) 分隔單字
- 檔案名應清楚描述內容
- 日期相關檔案可使用 YYYY-MM-DD 格式

例如：
- `taipei-districts-2024.json`
- `population-data-2023-12.json`
- `traffic-flow-daily-2024-01-15.json`

## 使用方式

### 在 Vue 組件中載入 JSON 檔案

```javascript
// 方法 1: 靜態引入
import sampleData from '@/data/sample-data.json'

// 方法 2: 動態載入
const loadData = async () => {
  try {
    const response = await fetch('/data/sample-data.json')
    const data = await response.json()
    return data
  } catch (error) {
    console.error('載入資料時發生錯誤:', error)
  }
}

// 方法 3: 使用 Vue 的 ref
import { ref, onMounted } from 'vue'
import sampleData from '@/data/sample-data.json'

export default {
  setup() {
    const data = ref(null)
    
    onMounted(() => {
      data.value = sampleData
    })
    
    return { data }
  }
}
```

## JSON 檔案結構建議

### 基本結構
```json
{
  "metadata": {
    "title": "資料標題",
    "description": "資料描述",
    "lastUpdated": "2024-01-15",
    "dataSource": "資料來源",
    "version": "1.0"
  },
  "data": {
    // 實際資料內容
  }
}
```

### 地理資料結構
```json
{
  "type": "FeatureCollection",
  "features": [
    {
      "type": "Feature",
      "properties": {
        "name": "區域名稱",
        "id": "unique-id"
      },
      "geometry": {
        "type": "Point",
        "coordinates": [121.5654, 25.0330]
      }
    }
  ]
}
```

## 注意事項

1. **檔案大小**: 建議單個 JSON 檔案不超過 5MB，過大的檔案應考慮分割或使用壓縮
2. **編碼格式**: 統一使用 UTF-8 編碼
3. **資料驗證**: 建議在載入資料後進行基本的格式驗證
4. **版本控制**: 重要資料檔案建議加入版本資訊
5. **備份**: 定期備份重要的資料檔案

## 效能優化建議

- 對於大型資料集，考慮使用 Web Workers 處理
- 實作資料快取機制避免重複載入
- 使用分頁或虛擬滾動處理大量資料顯示
- 考慮使用 IndexedDB 存放客戶端資料 