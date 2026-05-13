/**
 * @Description: L7 地图 custom-map-layer 移动/缩放同步工具
 * @FilePath: \heat-web\src\components\l7mapRender\utils\customMapLayerSync.ts
 *
 * 功能：监听 L7 Scene 事件，在地图缩放时隐藏/显示 custom-map-layer 元素，
 *       在地图平移时通过 left/top 实时偏移跟随，平移结束后重置偏移。
 *
 * 参考：echarts3Layer.js（ArcGIS 版）、l7AndDraw2d.ts（L7 draw2d 版）
 */
import type { Scene } from '@antv/l7';

const DEFAULT_SELECTOR = '.custom-map-layer';
const DEBOUNCE_MS = 200;

// ==================== 模块级状态 ====================
let isMoving = false;
let isZooming = false;
let moveStartLngLat: [number, number] | null = null;
let moveStartScreen: { x: number; y: number } | null = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

// 当前注册的 selector，用于防止重复注册和销毁时使用
let registeredSelector: string | null = null;
let registeredScene: Scene | null = null;

// ==================== 内部事件处理 ====================

function onZoomStart(selector: string) {
  isZooming = true;
  hideAll(selector);
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

function onZoomEnd(selector: string) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    isZooming = false;
    resetOffsetAll(selector);
    showAll(selector);
  }, DEBOUNCE_MS);
}

function onMapMove(scene: Scene, selector: string) {
  if (!isMoving) {
    // 首次触发相当于 movestart：记录起始坐标
    isMoving = true;
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
    }
    const center = scene.getCenter();
    moveStartLngLat = [center.lng, center.lat];
    moveStartScreen = scene.lngLatToContainer(moveStartLngLat);
    return;
  }

  if (!moveStartLngLat || !moveStartScreen) return;

  // 同一经纬度点在当前视口下的屏幕坐标变化量 = 视口偏移量
  const currentScreen = scene.lngLatToContainer(moveStartLngLat);
  const deltaX = currentScreen.x - moveStartScreen.x;
  const deltaY = currentScreen.y - moveStartScreen.y;

  setOffsetAll(selector, deltaX, deltaY);
}

function onMoveEnd(selector: string) {
  isMoving = false;
  moveStartLngLat = null;
  moveStartScreen = null;

  // 缩放期间 moveend 先触发，等 zoomend 统一处理显示
  if (isZooming) return;

  resetOffsetAll(selector);
}

// ==================== DOM 操作辅助 ====================

function hideAll(selector: string) {
  const elements = document.querySelectorAll<HTMLElement>(selector);
  elements.forEach((el) => {
    el.style.visibility = 'hidden';
  });
}

function showAll(selector: string) {
  const elements = document.querySelectorAll<HTMLElement>(selector);
  elements.forEach((el) => {
    el.style.visibility = 'visible';
  });
}

function setOffsetAll(selector: string, deltaX: number, deltaY: number) {
  const elements = document.querySelectorAll<HTMLElement>(selector);
  elements.forEach((el) => {
    el.style.left = deltaX + 'px';
    el.style.top = deltaY + 'px';
  });
}

function resetOffsetAll(selector: string) {
  const elements = document.querySelectorAll<HTMLElement>(selector);
  elements.forEach((el) => {
    el.style.left = '0px';
    el.style.top = '0px';
  });
}

// ==================== 对外接口 ====================

/**
 * 注册 L7 地图 custom-map-layer 同步事件
 * @param scene L7 Scene 实例
 * @param selector CSS 选择器，默认 '.custom-map-layer'
 */
export function registerCustomMapLayerSync(scene: Scene, selector: string = DEFAULT_SELECTOR): void {
  // 防止重复注册：先销毁旧的
  if (registeredScene) {
    unregisterCustomMapLayerSync(registeredScene, registeredSelector ?? DEFAULT_SELECTOR);
  }

  registeredScene = scene;
  registeredSelector = selector;

  const zoomStartHandler = () => onZoomStart(selector);
  const zoomEndHandler = () => onZoomEnd(selector);
  const mapMoveHandler = () => onMapMove(scene, selector);
  const moveEndHandler = () => onMoveEnd(selector);

  scene.on('zoomstart', zoomStartHandler);
  scene.on('zoomend', zoomEndHandler);
  scene.on('mapmove', mapMoveHandler);
  scene.on('moveend', moveEndHandler);

  // 将 handler 存到 scene 上以便销毁时取回
  (scene as any).__customMapLayerHandlers = {
    zoomStartHandler,
    zoomEndHandler,
    mapMoveHandler,
    moveEndHandler,
  };
}

/**
 * 销毁 L7 地图 custom-map-layer 同步事件
 * @param scene L7 Scene 实例
 * @param selector CSS 选择器，默认 '.custom-map-layer'
 */
export function unregisterCustomMapLayerSync(scene: Scene, selector: string = DEFAULT_SELECTOR): void {
  const handlers = (scene as any).__customMapLayerHandlers;
  if (handlers) {
    scene.off('zoomstart', handlers.zoomStartHandler);
    scene.off('zoomend', handlers.zoomEndHandler);
    scene.off('mapmove', handlers.mapMoveHandler);
    scene.off('moveend', handlers.moveEndHandler);
    delete (scene as any).__customMapLayerHandlers;
  }

  // 清理防抖定时器
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  // 重置状态
  isMoving = false;
  isZooming = false;
  moveStartLngLat = null;
  moveStartScreen = null;

  // 重置 DOM 样式
  showAll(selector);
  resetOffsetAll(selector);

  if (registeredScene === scene) {
    registeredScene = null;
    registeredSelector = null;
  }
}
