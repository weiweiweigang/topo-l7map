# L7 Map Render Component

基于 AntV L7 的 Vue3 地图渲染组件，用于智慧供热、燃气等能源管理系统的管网可视化。

## 特性

- **多图层渲染**：设备图层、管道图层、流向动画图层、校核点图层等
- **短管合并优化**：低缩放级别自动合并短管为长管，大幅减少渲染图元
- **流向动画**：支持管道流向动画展示
- **多维度过滤**：视图范围、渲染等级、业务属性过滤
- **底图灵活切换**：支持高德、百度、天地图、离线瓦片等
- **SVG 编辑层**：在地图上叠加 SVG 层实现拓扑编辑
- **批量编辑**：支持拓扑数据的批量移动、旋转、缩放
- **自定义底图叠加**：支持 CAD 图纸、区域地图叠加到地图上
- **TypeScript**：完整的类型定义

## 安装

```bash
npm install @antv/l7 @antv/l7-maps
```

## 目录结构

```
src/
├── components/
│   ├── l7mapRender/           # 地图渲染组件
│   │   ├── index.vue              # 主组件
│   │   ├── L7MapControlBtn.vue    # 控制按钮组件
│   │   ├── composables/           # 图层渲染逻辑
│   │   ├── draw/                  # SVG 编辑层
│   │   ├── types/                 # TypeScript 类型定义
│   │   └── utils/                 # 工具函数
│   ├── blockWriteL7/          # 批量编辑组件
│   │   ├── index.vue              # 主组件
│   │   └── js/
│   │       ├── index.ts           # 坐标转换、盒子操作
│   │       ├── data.ts            # 数据类型定义
│   │       └── blockHandle.ts     # 批量操作逻辑
│   └── translateBox/          # 变换盒子组件
│       ├── index.vue              # 主组件
│       └── js/
│           ├── data.ts            # 数据类型
│           ├── move.ts            # 移动逻辑
│           ├── rotate.ts          # 旋转逻辑
│           └── spread.ts          # 缩放逻辑
│   └── belowOtherJonConfig/    # 自定义底图配置组件
│       ├── index.vue              # 主组件
│       ├── js/
│       │   ├── pictureMap.ts      # 图片坐标处理
│       │   ├── picture.ts         # 图片上传
│       │   └── customMapInit.ts   # 地图初始化配置
│       └── components/
│           ├── pictureMap/        # 图片叠加预览
│           └── customMapInit/     # 地图中心配置
└── utils/
    └── topologyBlockEdit.ts   # 拓扑批量编辑工具
```

## 核心模块

### 1. L7MapRender - 地图渲染组件

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

### 2. BlockWriteL7 - 批量编辑组件

用于拓扑数据的批量移动、旋转、缩放。解决用户导入数据后坐标不匹配的问题。

```vue
<template>
  <BlockWriteL7
    :scene="scene"
    :render-data-handle="renderDataHandle"
    :on-write="onWrite"
  />
</template>

<script setup lang="ts">
import BlockWriteL7 from './components/blockWriteL7'

const scene = ref<Scene | null>(null)
const onWrite = ref(false)

function renderDataHandle() {
  mapRef.value?.referRender()
}
</script>
```

### 3. TranslateBox - 变换盒子组件

通用的元素变换组件，支持移动、旋转、缩放、翻转。

```vue
<template>
  <TranslateBox
    v-model:hide="hide"
    :width="200"
    :height="150"
    @beginMove="onBeginMove"
    @moving="onMoving"
    @endMove="onEndMove"
  >
    <div>内容区域</div>
  </TranslateBox>
</template>
```

### 4. BelowOtherJonConfig - 自定义底图叠加组件

用于将 CAD 图纸、区域地图等自定义图片叠加到地图上。用户可通过可视化交互确定图片的地理范围。

```vue
<template>
  <BelowOtherJonConfig
    v-model:show="show"
    :other-param="otherParam"
    @submit="onSubmit"
  />
</template>

<script setup lang="ts">
import BelowOtherJonConfig from './components/belowOtherJonConfig'

const show = ref(false)
const otherParam = ref('')

function onSubmit(param: string) {
  // param 包含图片 URL、地理范围、透明度等配置
  const config = JSON.parse(param)
  // config.imgUrl - 图片地址
  // config.imgCoord - 地理范围 { xmin, xmax, ymin, ymax }
  // config.opacity - 透明度
  // config.hideMap - 是否隐藏底图
}
</script>
```

## 性能优化

1. **shallowRef**：L7 对象使用 shallowRef 避免深层响应式
2. **setData 更新**：避免频繁创建销毁图层
3. **WebGL 资源清理**：组件卸载时释放 GPU 资源
4. **短管合并**：低缩放级别合并短管，减少 80%+ 渲染图元
5. **多维度过滤**：只渲染可见区域数据

## 相关文章

- [数万设备流畅渲染：我用 AntV L7 封装 Vue3 地图组件的血泪经验](https://juejin.cn/post/xxx)
- [在 L7 地图上实现拓扑编辑：SVG 叠加层与坐标同步的实战](https://juejin.cn/post/xxx)
- [在 L7 地图上实现拓扑批量编辑：移动、旋转、缩放](https://juejin.cn/post/xxx)
- [在 L7 地图上叠加自定义底图：CAD 图纸与特殊区域地图的实战方案](https://juejin.cn/post/xxx)
- [TranslateBox 组件介绍](https://juejin.cn/post/7175558112189874235)

## License

MIT
