/**
 * @description: 元件渲染数据处理
 * @FilePath: \heat-web\src\components\l7render\composables\useDeviceRender.ts
 */
import { publicTopology } from '@/Data/topologyData';
import ProjectConfig from '@/Data/projectConfig';
import { ILayer, PointLayer, type Scene } from '@antv/l7';
import type { DeviceRenderData } from '../types';
import { filterDevice, getMapBounds } from '../utils/filter';
import { getDeviceColor } from '../utils/color';
import Util from '@/utils/util';
import { webMercatorToCoord } from '@/tools/tool/tool';
import { isShowEquipmentNameOfMap } from '@/utils/topologyEcharts/common';

const NAME_BACKGROUND_COLOR = 'rgb(255, 94, 0)';
const NAME_FONT_SIZE = 16;

/**
 * @description: 处理元件渲染数据
 * @param scene L7 Scene 实例
 * @param topologyKey 多拓扑标识
 * @returns 元件图层实例
 */
export function processDeviceData(
  scene: Scene,
  topologyKey?: string
) {
  // 获取拓扑数据
  const topologyData = !topologyKey
    ? publicTopology.getTopologyData()
    : publicTopology.getTopologyDataMult(topologyKey);

  if (!topologyData) return null;

  const result: DeviceRenderData[] = [];

  for (const item of topologyData.devices) {
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

    const obj: DeviceRenderData = {
      tpId: item.tpId,
      tpType: String(item.tpType),
      latLng,
      size: [width * 2 / 3, height * 2 / 3] as [number, number], // 缩放比例
      color: getDeviceColor(item),
      rotate: item.rotationAngle,
    }

    // 名称标注
    if (isShowEquipmentNameOfMap(item.tpType, item.tpCode ?? undefined) &&item.tpName) {
      obj.title = item.tpName;
    }

    result.push(obj);
  }

  const layer = new PointLayer({
    zIndex: 2
  })
    .source(result, {
      parser: {
        type: 'json',
        coordinates: 'latLng',
      },
    })
    .shape('tpId', (value) => {
      if(topologyData.deviceMap[value].tpType === 209 && topologyData.deviceMap[value]?.onOff === 0) return '209-0'

      return topologyData.deviceMap[value].tpType;
    })
    .size('size')
    .style({
      rotation: {
        field: 'rotate',
      },
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
    const filterFun = (value: string) => filterDevice(
      {
        mapZoom: scene.getZoom(),
        item: topologyData.deviceMap[value],
      },
      getMapBounds(scene.getBounds())
    )

    layer.filter('tpId', filterFun);
    nameLayer.filter('tpId', filterFun);
  };

  doFilter();
  scene.addLayer(layer);
  scene.addLayer(nameLayer);
  scene.on('moveend', doFilter);
  scene.on('zoomend', doFilter);

  return {  layer, filter: doFilter, nameLayer };
}