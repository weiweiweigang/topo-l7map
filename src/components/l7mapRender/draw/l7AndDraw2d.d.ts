/*
 * @Description: L7 + draw2d 结合插件的类型定义
 * @FilePath: \heat-web\src\components\l7mapRender\draw\l7AndDraw2d.d.ts
 */
import type { Scene } from '@antv/l7';

export default function createL7DrawLayer(
  scene: Scene
): Promise<{ canvas: any; overlay: HTMLDivElement }>;

export function bindSceneToOverlay(scene: Scene): void;

export function destroyL7DrawLayer(scene: Scene): void;
