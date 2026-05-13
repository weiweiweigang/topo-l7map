import { Scene, PointLayer, ILayer } from '@antv/l7';
import { getMapBounds } from '../utils/filter';
import { DeviceRenderData, RenderResult } from '../types';
import { publicTopology } from '@/Data/topologyData';
import { mapToObj } from 'remeda';
import Util from '@/utils/util';
import { webMercatorToCoord } from '@/tools/tool/tool';

export function processValveClosingStrategyData(
  scene: Scene
) {
  const topologyData = publicTopology.valveClosingStrategyPoints;

  if (!topologyData) return null;

  const topologyDataMap = mapToObj(topologyData, (item) => [item.lineId, item])

  const result: DeviceRenderData[] = [];

  for (const item of topologyData) {
    // 坐标转换
    const latLng = webMercatorToCoord(item.latLng);

    result.push({
      tpId: item.lineId,
      tpType: String(3003),
      latLng,
      size: [26, 26] as [number, number], // 缩放比例
      color: item.userData.color ?? '#ea3c30',
    });
  }

  const layer = new PointLayer({
    zIndex: 4
  })
    .source(result, {
      parser: {
        type: 'json',
        coordinates: 'latLng',
      },
    })
    .shape('tpType')
    .size('size')
    .style({
      billboard: false,
    })
    .color('color');

  const doFilter = () => {
    layer.filter('tpId', (value) => {
      const extent = getMapBounds(scene.getBounds());

      const item = topologyDataMap[value];

      if(item.userData.unable) return false;

      if(!Util.PortInSquare(webMercatorToCoord(item.latLng), extent)) return false;

      return true
    });
    scene.render();
  };

  // 初始过滤 + 地图移动/缩放时重新过滤
  doFilter();
  scene.addLayer(layer);
  scene.on('moveend', doFilter);
  scene.on('zoomend', doFilter);

  return {  layer, filter: doFilter };
}