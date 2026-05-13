import { Scene, PointLayer, ILayer } from '@antv/l7';
import { getMapBounds } from '../utils/filter';
import { DeviceRenderData, RenderResult } from '../types';
import { filterWaterType, publicTopology } from '@/Data/topologyData';
import { mapToObj } from 'remeda';
import Util from '@/utils/util';
import ProjectConfig from '@/Data/projectConfig';
import { webMercatorToCoord } from '@/tools/tool/tool';
import { deviceHidColor } from '../utils/color';

export function processTemperatureData(
  scene: Scene
) {
  const topologyData = publicTopology.topologyTemper;

  if (!topologyData) return null;

  const topologyDataMap = mapToObj(topologyData, (item) => [item.tpId, item])

  const result: DeviceRenderData[] = [];

  for (const item of topologyData) {
    let width = item.userData.width ?? ProjectConfig.renderConfig.base.softMeterWidth;
    let height = item.userData.height ?? ProjectConfig.renderConfig.base.softMeterHeight;
    // 高亮时放大, 元件被选中 // 注：如果更改，需要和createDevicePortLatLng里面的统一
    if(item.userData.highlight || item.userData.chose) {
      width = ProjectConfig.renderConfig.base.softMeterWidth * 2;
      height = ProjectConfig.renderConfig.base.softMeterHeight * 2;

      if(item.userData.chose) 
        setTimeout(() => {
          Reflect.deleteProperty(item.userData, 'chose');
        }, 200)
    }

    // 坐标转换
    const latLng = webMercatorToCoord(item.latLng);

    result.push({
      tpId: item.tpId,
      tpType: String(221),
      latLng,
      size: [width * 2 / 3, height * 2 / 3] as [number, number], // 缩放比例
      color: item.userData.hid? deviceHidColor() : item.userData.color ?? '#e85e01',
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
    // 最多显示100个点
    let count = 0;
    layer.filter('tpId', (value) => {
      const mapZoom = scene.getZoom();
      const extent = getMapBounds(scene.getBounds());

      const item = topologyDataMap[value];
      const itemMapGrade = item.userData.mapGrade ?? ProjectConfig.renderConfig.device.mapGrade['221']
      if(!filterWaterType({ mapZoom, obj: item })) return false;

      if(mapZoom >= itemMapGrade || item.userData.highlight) {
        if(!Util.PortInSquare(webMercatorToCoord(item.latLng), extent)) return false;
      } else return false;

      count++;
      if(count > 100) return false;
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