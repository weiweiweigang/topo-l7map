/*
 * @Description: 拓扑数据转为 draw 画布数据（L7 版本）
 * @FilePath: \heat-web\src\components\l7mapRender\draw\topologyDrawL7\index.ts
 */
import type { Scene } from '@antv/l7';
import { GetTopologyDataOfArea } from '@/Data/topologyData';
import { getLinesCanvasL7 } from './line';
import { TopologyDevice, TopologyLine } from '@/dataModel/topologyType';
import { GetDevicesCanvasL7 } from './device';
import { getDraw2dManager } from '../createDrawCanvas';

/**
 * @description: 开始编辑拓扑数据（L7 版本）
 * @param {Scene} scene L7 Scene 实例
 * @param {string} writeArea 坐标范围
 * @param {any} canvas draw2d 画布实例
 */
// eslint-disable-next-line
export function DrawDataL7(scene: Scene, writeArea: string, canvas: any): void {
  canvas.clear(); // 清空 canvas 画布
  // 获取可以添加到画布上的拓扑数据
  const [devicesCanvas, linesCanvas] = GetTopologyDataOfArea(writeArea);
  addDataToCanvas(scene, devicesCanvas, linesCanvas, canvas);
}

// eslint-disable-next-line
/**
 * @description: 把筛选好的拓扑数据渲染到画布
 */
function addDataToCanvas(
  scene: Scene,
  devices: Array<TopologyDevice>,
  lines: Array<TopologyLine>,
  canvas: any
) {
  const manager = getDraw2dManager();
  const offsetValue = manager?.getOffsetOfCanvas() ?? [0, 0];

  const devicesCanvas = GetDevicesCanvasL7(scene, devices, lines, offsetValue);
  const linesCanvas = getLinesCanvasL7(scene, lines, offsetValue);
  const canvasData = [...devicesCanvas, ...linesCanvas];

  const reader = new (window as any).draw2d.io.json.Reader();
  reader.unmarshal(canvas, canvasData); // 将文档导入画布模板

  // 把元件弄到上层
  setTopDevice(document.getElementById('svg_graphics_layer'));

  // 触发位置更新
  if (manager) {
    manager.bindEventOfEquipment();
  }
}

/**
 * @description: 把元件置于所有其他元素的上面
 */
function setTopDevice(element: HTMLElement | null) {
  if (!element) return;
  const childList = [...element.children];
  element.innerHTML = '';
  const devices: any[] = [];
  const others: any[] = [];

  for (let i = 0; i < childList.length; i++) {
    if (
      (childList[i].className as any)?.animVal &&
      (childList[i].className as any)?.animVal?.match(/draw2d_shape_icon_mlight/)
    ) {
      devices.push(childList[i]);
    } else others.push(childList[i]);
  }
  for (const item of others) {
    element.appendChild(item);
  }
  for (const item of devices) {
    element.appendChild(item);
  }
}
