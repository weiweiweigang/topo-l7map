/**
 * @description: L7 版本的自定义图片底图加载
 * 对应 ArcGIS 版本的 Util.SetCustomImageLayerIfBelow
 * @FilePath: \heat-web\src\components\l7mapRender\composables\useCustomImageLayer.ts
 */
import { ImageLayer } from '@antv/l7';
import type { Scene, ILayer } from '@antv/l7';
import { webMercatorToCoord } from '@/tools/tool/tool';
import type { ImgCoord, OtherJsonObjType } from '@/dataModel/topologyListItem';
import { publicTopology } from '@/Data/topologyData';
import Util from '@/utils/util';

interface CustomImageLayerResult {
  imageLayer: ILayer | null;
  hideMap: boolean;
}

/**
 * 读取项目配置中的自定义图片底图配置
 */
function getCustomImageConfig(): {
  isCustomImage: boolean;
  imgUrl: string;
  imgCoord: ImgCoord;
  opacity: number;
  hideMap: boolean;
} | null {
  let configData: OtherJsonObjType | null = null;

  if (Util.GetTopologyLevelType() === 2 && publicTopology.getTopologyDataInfo().below?.otherJson) {
    configData = JSON.parse(publicTopology.getTopologyDataInfo().below?.otherJson ?? '{}');
  } else if (publicTopology.getTopologyDataInfo().project?.otherJson) {
    configData = JSON.parse(publicTopology.getTopologyDataInfo().project?.otherJson ?? '{}');
  }

  if (!configData) return null;

  return {
    isCustomImage: configData.isCustomImage ?? false,
    imgUrl: configData.imgUrl ?? '',
    imgCoord: configData.imgCoord,
    opacity: configData.opacity ?? 0.7,
    hideMap: configData.isCustomImage && (configData.hideMap ?? false),
  };
}

/**
 * 自动加载项目自定义图片底图（L7 版本）
 * 对应 ArcGIS 版本的 Util.SetCustomImageLayerIfBelow
 */
export function addCustomImageLayer(scene: Scene): CustomImageLayerResult {
  const config = getCustomImageConfig();

  if (!config?.isCustomImage || !config.imgUrl || !config.imgCoord) {
    return { imageLayer: null, hideMap: config?.hideMap ?? false };
  }

  const imageLayer = new ImageLayer({
    zIndex: 0
  })
    .source(config.imgUrl, {
      parser: {
        type: 'image',
        extent: [config.imgCoord.xmin, config.imgCoord.ymin, config.imgCoord.xmax, config.imgCoord.ymax],
      },
    })
    .style({
      opacity: Number(config.opacity ?? 1) ?? 1,
    });

  scene.addLayer(imageLayer);

  return { imageLayer, hideMap: config.hideMap };
}
