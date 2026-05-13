/*
 * @Description: L7 和 draw2d 结合的插件（替代原 arcgisAndDraw2d.js）
 * @FilePath: \heat-web\src\components\l7mapRender\draw\l7AndDraw2d.ts
 */
import type { Scene } from '@antv/l7';
import { webMercatorToScreen } from './coordHelper';
import Notice from '@/tools/notice';

let overlayEl: HTMLDivElement | null = null;
let canvasObj: any = null;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let isMoving = false;
let isZooming = false;
let moveStartLngLat: [number, number] | null = null;
let moveStartScreen: { x: number; y: number } | null = null;
let onMouseUp: (() => void) | null = null;
const OFFSET_VALUE = 12; // 经过多次测试12是最好的偏移值

/** 创建 L7 地图上的 draw2d 画布叠加层 */
export default function createL7DrawLayer(scene: Scene): Promise<{ canvas: any; overlay: HTMLDivElement }> {
  return new Promise((resolve, reject) => {
    try {
      // 1. 清理可能残留的旧叠加层
      const oldOverlay = document.getElementById('l7-draw2d-overlay');
      if (oldOverlay) oldOverlay.remove();

      // 2. 创建叠加层 div
      const container = scene.getContainer();
      if (!container) {
        console.error('创建 L7 draw2d 叠加层失败: 找不到地图容器');
        Notice.message('创建编辑图层失败: 找不到地图容器', 'error');
        return;
      }
      overlayEl = document.createElement('div');
      overlayEl.id = 'l7-draw2d-overlay';
      overlayEl.className = 'l7-draw2d-overlay-layer';
      overlayEl.style.cssText =
        'position:absolute;top:0;left:0;width:100%;height:100%;z-index:10;pointer-events:none;';
      container?.appendChild(overlayEl);

      // 注入 CSS：仅 figure 元素响应鼠标，空白区域透传到地图
      const styleId = 'l7-draw2d-pointer-events-style';
      if (!document.getElementById(styleId)) {
        const style = document.createElement('style');
        style.id = styleId;
        style.textContent = `
          .l7-draw2d-overlay-layer svg { pointer-events: none; }
          .l7-draw2d-overlay-layer .draw2d_Connection,
          .l7-draw2d-overlay-layer [class*="draw2d_shape_icon_mlight"],
          .l7-draw2d-overlay-layer [class*="draw2d_shape_basic_Line"],
          .l7-draw2d-overlay-layer [class*="draw2d_HybridPort"],
          .l7-draw2d-overlay-layer [class*="draw2d_OutputPort"],
          .l7-draw2d-overlay-layer [class*="draw2d_InputPort"] {
            pointer-events: auto;
            cursor: pointer;
          }
        `;
        document.head.appendChild(style);
      }

      // 拖拽期间临时将 overlay 设为 pointer-events:auto，
      // 防止鼠标快速移出 figure 后丢失 mousemove/mouseup 导致拖拽中断
      overlayEl.addEventListener('mousedown', (e: MouseEvent) => {
        if ((e.target as HTMLElement).classList?.length) {
          overlayEl!.style.pointerEvents = 'auto';
        }
      });
      onMouseUp = () => {
        if (overlayEl) {
          overlayEl.style.pointerEvents = 'none';
        }
      };
      document.addEventListener('mouseup', onMouseUp);

      // 禁止浏览器默认右键菜单，使用自定义菜单
      overlayEl.addEventListener('contextmenu', (e: Event) => {
        e.preventDefault();
      });

      // 3. 初始化 draw2d Canvas
      const canvas = new (window as any).draw2d.Canvas(overlayEl.id);
      canvasObj = canvas;

      // 4. 监听 L7 地图事件
      scene.on('zoomstart', onZoomStart);
      scene.on('zoomend', onZoomEnd);
      scene.on('mapmove', onMapMove);
      scene.on('moveend', onMoveEnd);

      resolve({ canvas, overlay: overlayEl });
    } catch (error) {
      console.error('创建 L7 draw2d 叠加层失败:', error);
      reject(error);
    }
  });
}

// ==================== L7 / 高德 地图事件处理 ====================

/** 防抖延迟（ms）：用户停止缩放 200ms 后才恢复图层 */
const DEBOUNCE_MS = 200;

function onZoomStart() {
  // 立即隐藏图层，并取消可能已排队的恢复
  isZooming = true;
  hideDrawLayer();
  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
}

function onZoomEnd() {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    isZooming = false;
    updatePositions();
  }, DEBOUNCE_MS);
}

/** L7 地图平移中：实时更新 overlay 偏移，让 draw2d 层跟随地图移动 */
function onMapMove() {
  const scene = getSceneFromContainer();
  if (!scene || !overlayEl) return;

  if (!isMoving) {
    // 首次触发相当于 movestart：记录起始坐标，不隐藏图层
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

  // 同一个经纬度点在当前视口下的屏幕坐标变化量 = 视口偏移量
  const currentScreen = scene.lngLatToContainer(moveStartLngLat);
  const deltaX = currentScreen.x - moveStartScreen.x;
  const deltaY = currentScreen.y - moveStartScreen.y;

  // 移动过程中 SVG 保持可见，通过 transform 偏移跟随地图
  overlayEl.style.transform = `translate(${deltaX}px, ${deltaY}px)`;
}

/** L7 地图平移结束：重置偏移，重新计算元件精确位置 */
function onMoveEnd() {
  isMoving = false;
  moveStartLngLat = null;
  moveStartScreen = null;
  // 缩放期间 moveend 先触发，等 zoomend 统一处理显示
  if (isZooming) return;
  updatePositions();
}

/** 隐藏 draw2d 图层（缩放/平移期间） */
function hideDrawLayer() {
  const svgLayer = document.getElementById('svg_graphics_layer');
  if (svgLayer) {
    (svgLayer as HTMLElement).style.display = 'none';
  }
}

/** 显示 draw2d 图层 */
function showDrawLayer() {
  const svgLayer = document.getElementById('svg_graphics_layer');
  if (svgLayer) {
    (svgLayer as HTMLElement).style.display = '';
  }
}

/** 地图移动/缩放后，重新计算所有元件和管道的屏幕位置 */
function updatePositions() {
  if (!canvasObj) return;

  const scene = getSceneFromContainer();
  if (!scene) return;

  showDrawLayer();

  // 重置 SVG transform
  const svgLayer = document.getElementById('svg_graphics_layer');
  if (svgLayer) {
    svgLayer.setAttribute('transform', 'matrix(1,0,0,1,0,0)');
  }

  const figures = canvasObj.getFigures().clone().data;
  const lines = canvasObj.getLines().clone().data;
  const allFigures = figures.concat(lines);

  requestAnimationFrame(() => {
    // 在同一帧内清空 transform + 更新元件位置，避免闪烁
    if (overlayEl) {
      overlayEl.style.transform = '';
    }

    allFigures.forEach((item: any) => {
      if (item.cssClass !== 'draw2d_Connection') {
        // 元件：用 Web Mercator 坐标重新定位
        try {
          const coord = item.userData?.writer?.coord;
          if (coord) {
            const screenPoint = webMercatorToScreen(scene, coord);
            item.setPosition(screenPoint.x - OFFSET_VALUE, screenPoint.y - OFFSET_VALUE);
          }
        } catch (e) {
          console.warn('更新元件位置失败:', item, e);
        }
      } else {
        // 管道：用 Web Mercator 坐标数组重新定位
        try {
          const coords = item.userData?.writer?.coord;
          if (coords && coords.length > 0) {
            const vertices: { x: number; y: number }[] = [];
            coords.forEach((mv: [number, number]) => {
              const screenPoint = webMercatorToScreen(scene, mv);
              vertices.push({ x: screenPoint.x, y: screenPoint.y });
            });
            item.setVertices(vertices);
          }
        } catch (e) {
          console.warn('更新管道位置失败:', item, e);
        }
      }
    });

    showDrawLayer();
  });
}

/** 从容器上找到关联的 Scene 实例 */
function getSceneFromContainer(): Scene | null {
  // 通过 l7mapRender 组件暴露的方式获取 Scene
  // 这里通过自定义属性存储
  const container = document.getElementById('l7-draw2d-overlay');
  if (container && (container as any).__l7Scene__) {
    return (container as any).__l7Scene__;
  }
  return null;
}

/** 将 Scene 实例绑定到 overlay 元素上（供内部事件使用） */
export function bindSceneToOverlay(scene: Scene) {
  const container = document.getElementById('l7-draw2d-overlay');
  if (container) {
    (container as any).__l7Scene__ = scene;
  }
}

/** 销毁叠加层，移除所有事件监听 */
export function destroyL7DrawLayer(scene: Scene) {
  scene.off('zoomstart', onZoomStart);
  scene.off('zoomend', onZoomEnd);
  scene.off('mapmove', onMapMove);
  scene.off('moveend', onMoveEnd);

  isMoving = false;
  isZooming = false;
  moveStartLngLat = null;
  moveStartScreen = null;

  if (onMouseUp) {
    document.removeEventListener('mouseup', onMouseUp);
    onMouseUp = null;
  }

  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }

  if (overlayEl) {
    overlayEl.remove();
    overlayEl = null;
  }
  canvasObj = null;
}
