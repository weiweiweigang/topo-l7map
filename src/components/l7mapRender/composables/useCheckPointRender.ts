import { Scene, PointLayer, ILayer } from '@antv/l7';
import { getMapBounds } from '../utils/filter';
import { DeviceRenderData } from '../types';
import { filterWaterType, publicTopology } from '@/Data/topologyData';
import { mapToObj } from 'remeda';
import ProjectConfig from '@/Data/projectConfig';
import Util from '@/utils/util';
import { webMercatorToCoord } from '@/tools/tool/tool';
import { getDeviceColor } from '../utils/color';
import { isShowEquipmentNameOfMap } from '@/utils/topologyEcharts/common';

const NAME_BACKGROUND_COLOR = 'rgb(255, 94, 0)';
const NAME_FONT_SIZE = 16;

export function processCheckPointData(
  scene: Scene,
  topologyKey?: string
) {
  // 获取拓扑数据
  const topologyData = !topologyKey
    ? publicTopology.topologyCheckPoint
    : publicTopology.topologyCheckPointMult[topologyKey];

  if (!topologyData) return null;

  const topologyDataMap = mapToObj(topologyData, (item) => [item.tpId, item])

  const result: DeviceRenderData[] = [];

  for (const item of topologyData) {
    let width = item.userData.width ?? ProjectConfig.renderConfig.base.checkPointWidth;
    let height = item.userData.height ?? ProjectConfig.renderConfig.base.checkPointHeight;
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

    const obj: DeviceRenderData = {
      tpId: item.tpId,
      tpType: String(222),
      latLng,
      size: [width * 2 / 3, height * 2 / 3] as [number, number], // 缩放比例
      color: getDeviceColor({
        ...item,
        tpType: 222,
      }),
    };

    // 名称标注
    if (isShowEquipmentNameOfMap(222) && item.tpName) {
      obj.title = item.tpName;
    }

    result.push(obj);
  }

  const layer = new PointLayer({
    zIndex: 3
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

  const nameLayer = new PointLayer()
    .source(result.filter(item => item.title), {
      parser: { type: 'json', coordinates: 'latLng' },
    })
    .shape('title', 'text')
    .size(NAME_FONT_SIZE)
    .color(NAME_BACKGROUND_COLOR)
    .style({
      textAnchor: 'top',
      textOffset: [0, 34],
      spacing: 2,
      textAllowOverlap: true,
      stroke: '#fff',
      strokeWidth: 2,
      halo: 0,
    });

  const doFilter = () => {
    const filterFun = (value: string) => {
      const mapZoom = scene.getZoom();
      const lineMap = publicTopology.getTopologyData().lineMap;
      const extent = getMapBounds(scene.getBounds());

      const item = topologyDataMap[value];
      const itemMapGrade = item.userData.mapGrade ?? ProjectConfig.renderConfig.device.mapGrade['222']
      if(!filterWaterType({ mapZoom, obj: { waterType: lineMap[item.connId]?.waterType ?? 0 } })) return false;

      if(mapZoom >= itemMapGrade || item.userData.highlight) {
        if(!Util.PortInSquare(webMercatorToCoord(item.latLng), extent)) return false;
      } else return false;

      return true
    };

    layer.filter('tpId', filterFun);
    nameLayer.filter('tpId', filterFun);
    scene.render();
  };

  doFilter();
  scene.addLayer(layer);
  scene.addLayer(nameLayer);
  scene.on('moveend', doFilter);
  scene.on('zoomend', doFilter);

  return {  layer, filter: doFilter, nameLayer };
}
