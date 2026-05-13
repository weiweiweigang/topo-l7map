import { Scene, PointLayer, ILayer } from '@antv/l7';
import { getMapBounds } from '../utils/filter';
import { DeviceRenderData, RenderResult } from '../types';
import { publicTopology } from '@/Data/topologyData';
import { mapToObj } from 'remeda';
import Util from '@/utils/util';
import ProjectConfig from '@/Data/projectConfig';
import { webMercatorToCoord } from '@/tools/tool/tool';

export function processGasBalanceData(
  scene: Scene
) {
  const topologyData = publicTopology.gasBalance;

  if (!topologyData) return null;

  const topologyDataMap = mapToObj(topologyData, (item) => [item.tpId, item])

  const result: DeviceRenderData[] = [];

  for (const item of topologyData) {
    const width = item.userData.width ?? ProjectConfig.renderConfig.base.deviceWidth * 2;
    const height = item.userData.height ?? ProjectConfig.renderConfig.base.deviceHeight * 2;

    // 坐标转换
    const latLng = webMercatorToCoord(item.latLng);

    result.push({
      tpId: item.tpId,
      tpType: String(3000),
      latLng,
      size: [width * 2 / 3, height * 2 / 3] as [number, number], // 缩放比例
      color: '#EFC93F',
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