/*
 * @Description: L7 + draw2d 坐标转换工具
 * @FilePath: \heat-web\src\components\l7mapRender\draw\coordHelper.ts
 */
import type { Scene } from '@antv/l7';
import { webMercatorToCoord, coordToWebMercator } from '@/tools/tool/tool';

/** Web Mercator [x, y] → 屏幕坐标 {x, y}（用于 draw2d 定位） */
export function webMercatorToScreen(scene: Scene, coord: [number, number]): { x: number; y: number } {
  const [lng, lat] = webMercatorToCoord(coord);
  return scene.lngLatToContainer([lng, lat]);
}

/** 屏幕坐标 → Web Mercator [x, y]（用于保存设备位置） */
export function screenToWebMercator(scene: Scene, x: number, y: number): [number, number] {
  const lngLat = scene.containerToLngLat([x, y]);
  if (!lngLat) return [0, 0];
  return coordToWebMercator([lngLat.lng, lngLat.lat]);
}
