/**
 * @description: l7render 模块类型定义
 * @FilePath: \heat-web\src\components\l7render\types\index.ts
 */
import type { Scene } from '@antv/l7';
import type { TopologyLine, LongLine } from '@/dataModel/topologyType';

// ==================== 渲染类型枚举 ====================

/**
 * 支持的渲染图层类型
 */
export type RenderNameType =
  | 'topologyDevices'      // 元件图层
  | 'topologyLines'        // 管道图层
  | 'topologyLinesFlow'    // 管道流向动画图层
  | 'softMeter'            // 软表图层
  | 'checkPoint'           // 校核点图层
  | 'gasBalance'           // 气体汇注点图层
  | 'eventAlarm'           // 事件告警图层
  | 'valveClosingStrategy'  // 关阀策略检查点图层
  | 'temperature'          // 光纤温度图层

// ==================== 渲染数据接口 ====================

/**
 * 管线数据类型
 */
export type LineDataType = 'shortLine' | 'longLine' | 'longLineChild';

/**
 * 管道渲染数据
 */
export interface LineRenderData {
  tpId: string;
  latLng: [number, number][];
  color: string;
  width: number;

  /** 数据类型：短管 / 长管整体 / 长管拆分子管 */
  dataType: LineDataType;
  /** 原始管道对象（用于过滤时查找属性） */
  rawData: TopologyLine | LongLine;
  /** 所属长管ID（拆分子管时使用） */
  longLineTpId?: string;
}

/**
 * 元件渲染数据
 */
export interface DeviceRenderData {
  tpId: string;
  tpType: string;
  latLng: [number, number];
  size: [number, number];
  color: string;
  rotate?: number;
  title?: string;
}

// ==================== 地图实例接口 ====================

/**
 * L7 地图实例（简化版）
 */
export interface L7MapInstance {
  scene: Scene;
}

/**
 * 地图边界
 */
export interface MapBounds {
  xmin: number;
  xmax: number;
  ymin: number;
  ymax: number;
}

// ==================== 图层事件类型 ====================

/**
 * 图层事件数据
 */
export interface LayerEventData {
  /** 元件/管道 ID */
  tpId?: string;
  /** 设备类型: topologyDevices | topologyLines | topologyLinesFlow | softMeter | checkPoint */
  layerName: RenderNameType;

  feature: any; // l7 图层 feature 对象
  featureId: number;
  lnglat: {lng: number; lat: number};
  /** 原始鼠标事件 */
  target: MouseEvent;
  type: 'click' | 'dblclick' | 'contextmenu';
  x: number;
  y: number;
}

// ==================== Props & Emits ====================

/**
 * L7Render 组件 Props
 */
export interface L7RenderProps {
  /** 需要渲染的图层类型列表 */
  renderName: RenderNameType[];
  /** 多拓扑场景下的拓扑标识 */
  topologyKey?: string;
  /** 地图配置 */
  mapConfig?: Record<string, any>;
  /** 地图容器 DOM id，同一页面多地图时必须传不同值 */
  containerId?: string;
  /** 禁用自动自动更新地图中心和等级 */
  disabledAutoUpdateCenterAndZoom?: boolean;
  /** 是否忽略项目配置（自定义底图/隐藏地图），默认 false */
  ignoreProjectConfig?: boolean;
  /** 是否隐藏供回水控制按钮，默认 false */
  hideWaterType?: boolean;
}


/**
 * L7Render 组件 Emits
 */
export interface L7RenderEmits {
  (e: 'sceneReady', instance: L7MapInstance): void;
  (e: 'renderComplete', result: RenderResult): void;
  (e: 'layerClick', data: LayerEventData): void;
  (e: 'layerDoubleClick', data: LayerEventData): void;
  (e: 'layerContextMenu', data: LayerEventData): void;
  (e: 'error', error: Error): void;
}

/**
 * 渲染结果
 */
export interface RenderResult {
  /** 渲染耗时(ms) */
  duration: number;
}

// ==================== Expose ====================

/**
 * L7Render 暴露的方法
 */
export interface L7RenderExpose {
  /** 删除所有图层并重新渲染 */
  referRender: () => void;
  // 触发图层更新
  triggerLayerUpdate: () => void;
  /** 获取 Scene 实例 */
  getScene: () => Scene | null;
  /** 获取图层 Map */
  getLayerMap: () => globalThis.Map<string, { layer: any; filter?: () => void; nameLayer?: any }> | null;
  /** 隐藏指定名称的图层 */
  hideLayers: (layerNames: string[]) => void;
  /** 显示指定名称的图层 */
  showLayers: (layerNames: string[]) => void;
}
