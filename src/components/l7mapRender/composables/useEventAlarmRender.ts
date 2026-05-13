import { Scene, PointLayer, ILayer } from '@antv/l7';
import { getMapBounds } from '../utils/filter';
import { DeviceRenderData } from '../types';
import { publicTopology } from '@/Data/topologyData';
import { mapToObj } from 'remeda';
import Util from '@/utils/util';
import ProjectConfig from '@/Data/projectConfig';
import { webMercatorToCoord } from '@/tools/tool/tool';
import { deviceHidColor } from '../utils/color';

export function processEventAlarmData(
  scene: Scene
) {
  const topologyData = publicTopology.eventAlarm;

  if (!topologyData) return null;

  const topologyDataMap = mapToObj(topologyData, (item) => [item.tpId, item])

  const result: DeviceRenderData[] = [];

  for (const item of topologyData) {
    let width = item.userData.width ?? ProjectConfig.renderConfig.base.deviceWidth;
    let height = item.userData.height ?? ProjectConfig.renderConfig.base.deviceHeight;
    // 高亮时放大, 元件被选中 // 注：如果更改，需要和createDevicePortLatLng里面的统一
    if(item.userData.highlight || item.userData.chose) {
      const deviceShape = Util.getHighlightDeviceShape()
      width = deviceShape.deviceWidth;
      height = deviceShape.deviceHeight;

      if(item.userData.chose) 
        setTimeout(() => {
          Reflect.deleteProperty(item.userData, 'chose');
        }, 200)
    }

    // 坐标转换
    const latLng = webMercatorToCoord(item.latLng);

    const color = item.status === 0 ? '#FF1D1D' : '#3FA1FF'

    result.push({
      tpId: item.tpId,
      tpType: String(3001),
      latLng,
      size: [width * 2 / 3, height * 2 / 3] as [number, number], // 缩放比例
      color: item.userData.hid? deviceHidColor() : item.userData.color ?? color,
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
    .shape('tpId', (value) => {
      topologyDataMap[value].status === 0 ? '3001-0' : '3001-1'
    })
    .size('size')
    .style({
      billboard: false,
    })
    .color('color');

  const doFilter = () => {
    layer.filter('tpId', (value) => {
      const mapZoom = scene.getZoom();
      const extent = getMapBounds(scene.getBounds());

      const item = topologyDataMap[value];
      const itemMapGrade = item.userData.mapGrade ?? 3

      if(mapZoom >= itemMapGrade || item.userData.highlight) {
        if(!Util.PortInSquare(webMercatorToCoord(item.latLng), extent)) return false;
      } else return false;

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