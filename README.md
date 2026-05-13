# L7 Map Render Component

基于 AntV L7 的 Vue3 地图渲染组件，用于智慧供热、燃气等能源管理系统的管网可视化。

## 特性

- **多图层渲染**：设备图层、管道图层、流向动画图层、校核点图层等
- **短管合并优化**：低缩放级别自动合并短管为长管，大幅减少渲染图元
- **流向动画**：支持管道流向动画展示
- **多维度过滤**：视图范围、渲染等级、业务属性过滤
- **底图灵活切换**：支持高德、百度、天地图、离线瓦片等
- **TypeScript**：完整的类型定义

## 安装

```bash
npm install @antv/l7 @antv/l7-maps
```

## 使用

```vue
<template>
  <L7MapRender
    ref="mapRef"
    :render-name="['topologyDevices', 'topologyLinesFlow']"
    :map-config="{ center: [116.4, 39.9], zoom: 12 }"
    @layer-click="onDeviceClick"
  />
</template>

<script setup lang="ts">
import { L7MapRender } from './components/l7mapRender'

const mapRef = ref()

function onDeviceClick(data) {
  console.log('点击了设备:', data.tpId)
}
</script>
```

## 目录结构

```
src/components/l7mapRender/
├── index.vue              # 主组件
├── L7MapControlBtn.vue    # 控制按钮组件
├── index.ts               # 模块导出
├── shapeImg.ts            # 自定义图标注册
├── composables/           # 图层渲染逻辑
│   ├── useDeviceRender.ts      # 设备图层
│   ├── useLineRender.ts        # 管道图层（含流向动画）
│   └── ...
├── types/                 # TypeScript 类型定义
└── utils/                 # 工具函数
    ├── filter.ts          # 过滤逻辑
    └── color.ts           # 颜色计算
```

## 性能优化

1. **shallowRef**：L7 对象使用 shallowRef 避免深层响应式
2. **setData 更新**：避免频繁创建销毁图层
3. **WebGL 资源清理**：组件卸载时释放 GPU 资源
4. **短管合并**：低缩放级别合并短管，减少 80%+ 渲染图元
5. **多维度过滤**：只渲染可见区域数据

## 相关文章

[数万设备流畅渲染：我用 AntV L7 封装 Vue3 地图组件的血泪经验](https://juejin.cn/post/xxx)

## License

MIT
