/**
 * @description: 项目中心点渲染数据处理
 * @FilePath: \heat-web\src\components\l7render\composables\useProjectCenterRender.ts
 */
import { ILayer, PointLayer, type Scene } from '@antv/l7';

/**
 * @description: 处理项目中心点渲染数据
 * @param scene L7 Scene 实例
 * @param mapCenter 项目中心点坐标
 * @returns 项目中心点图层实例
 */
export function processProjectCenterData(
  scene: Scene,
  mapCenter?: [number, number]
) {
  if (!mapCenter) {
    return null;
  }

  const result = [{
    latLng: mapCenter,
    size: 34,
  }];

  const layer = new PointLayer()
    .source(result, {
      parser: {
        type: 'json',
        coordinates: 'latLng',
      },
    })
    .shape('circle')
    .size('size')
    .color('#ff0033')
    .animate(true)

  scene.addLayer(layer);

  return {  layer };
}
