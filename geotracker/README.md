# GeoTracker - 实时位置追踪系统

## 项目结构

```
geotracker/
├── server/              # 服务端
│   ├── src/
│   │   ├── server.js    # Express 主入口
│   │   ├── database.js  # SQLite 数据库层
│   │   └── routes.js    # API 路由
│   ├── data/            # SQLite 数据库文件
│   └── package.json
├── mobile/              # 鸿蒙移动端
│   └── hap/
│       └── src/main/ets/
│           ├── MainAbility.ts          # 入口
│           ├── constants/ServerConfig.ts
│           ├── services/LocationService.ts
│           ├── services/ReportService.ts
│           ├── services/BackgroundTaskManager.ts
│           ├── pages/Index.ts
│           └── components/
│               ├── StatusPanel.ets
│               ├── DeviceInfoPanel.ets
│               └── ConfigPanel.ets
└── web/                 # Web 地图展示
    └── index.html
```

## 快速开始

### 服务端

```bash
cd server
npm install
npm start
# Server runs on http://localhost:3000
```

### 移动端

使用 DevEco Studio 打开 `mobile/hap` 目录，编译到鸿蒙设备/模拟器。

### Web 地图

直接用浏览器打开 `web/index.html`，输入服务器地址和设备ID即可查看轨迹。

## API 文档

### 统一数据上报入口

```
POST /api/location/report
Content-Type: application/json

{
  "deviceId": "my-phone-001",
  "apiKey": "optional-key",
  "locations": [
    {
      "latitude": 39.54123,
      "longitude": 121.40234,
      "altitude": 10.5,
      "accuracy": 5.0,
      "speed": 0.0,
      "bearing": 0,
      "address": "大连市长兴岛"
    }
  ]
}
```

响应：
```json
{ "success": true, "inserted": 1 }
```

### 轨迹查询

```
GET /api/trajectory?deviceId=xxx&hours=24
```

时间窗口：1, 6, 12, 24, 48, 168(周), 720(月)

### 设备管理

```
POST /api/device/register   # 注册设备
GET  /api/devices           # 列出所有设备
```

### 归档管理

```
POST /api/archive/run       # 手动触发归档
GET  /api/archive/summary   # 归档统计
GET  /api/archive/query     # 查询归档数据
DELETE /api/archive/cleanup # 清理旧归档
```

## 技术栈

- **移动端**: ArkTS (HarmonyOS NEXT)
- **服务端**: Node.js + Express
- **数据库**: SQLite (better-sqlite3)
- **Web地图**: Leaflet + vanilla JS
