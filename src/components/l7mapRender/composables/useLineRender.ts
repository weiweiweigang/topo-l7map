/**
 * @description: 管道渲染数据处理
 * @FilePath: \heat-web\src\components\l7render\composables\useLineRender.ts
 */
import { publicTopology } from '@/Data/topologyData';
import { ILayer, LineLayer, type Scene } from '@antv/l7';
import type { LineRenderData, LineDataType } from '../types';
import { filterLongLine, filterLine, getMapBounds } from '../utils/filter';
import { getLineColor, getLineWidth, getLongLineColor, getLongLineWidth } from '../utils/color';
import { webMercatorToCoord } from '@/tools/tool/tool';
import { TopologyLine, LongLine } from '@/dataModel/topologyType';
import { reviseCoordsByFlowUnified } from '../utils/coordinate';
import ProjectConfig from '@/Data/projectConfig';

/** L7 LineLayer 数据源解析配置 */
const LINE_SOURCE_OPTIONS = {
  parser: {
    type: 'json' as const,
    coordinates: 'latLng',
  },
};

/**
 * @description: 将短管/长管数据转为 LineRenderData
 */
function toLineRenderData(
  item: TopologyLine | LongLine,
  dataType: LineDataType,
  hasFlow: boolean,
  longLineTpId?: string
): LineRenderData {
  const isLongLine = dataType === 'longLine';

  // 坐标转换
  let coords: [number, number][];
  if (isLongLine) {
    coords = (item as LongLine).latLng.map(coord => webMercatorToCoord(coord));
  } else if (dataType === 'longLineChild') {
    // 拆分子管只取首尾坐标
    const line = item as TopologyLine;
    coords = [
      webMercatorToCoord(line.latLng[0]),
      webMercatorToCoord(line.latLng[line.latLng.length - 1]),
    ];
  } else {
    coords = (item as TopologyLine).latLng.map(coord => webMercatorToCoord(coord));
  }

  // 颜色
  const color = isLongLine ? getLongLineColor(item as LongLine) : getLineColor(item as TopologyLine);

  // 宽度
  const width = isLongLine
    ? getLongLineWidth(item as LongLine)
    : getLineWidth(item as TopologyLine);

  // 流向修正
  if (hasFlow) {
    coords = reviseCoordsByFlowUnified(item, dataType, coords);
  }

  return {
    tpId: item.tpId,
    latLng: coords,
    color,
    width: width * 2 / 3,
    dataType,
    rawData: item,
    longLineTpId,
  };
}

/**
 * @description: 计算过滤后的管线渲染数据
 * 所有过滤逻辑（供回水、管径、区域、视图范围、最大渲染量）都在此函数中完成
 * @returns { lineList, lineFlowList } 分别为无流向和有流向的渲染数据
 */
function computeFilteredLineData(
  scene: Scene,
  hasFlow: boolean,
  topologyKey?: string
): { lineList: LineRenderData[]; lineFlowList: LineRenderData[] } {
  const topologyData = !topologyKey
    ? publicTopology.getTopologyData()
    : publicTopology.getTopologyDataMult(topologyKey);

  if (!topologyData) return { lineList: [], lineFlowList: [] };

  const mapZoom = scene.getZoom();
  const bounds = getMapBounds(scene.getBounds());
  const longLineConfig = ProjectConfig.renderConfig.longLineConfig;
  const isLongLineMode = longLineConfig.start && mapZoom <= longLineConfig.mapGrade;
  // 流向渲染需要同时满足 hasFlow 和地图等级 ≥ lineFlow.mapGrade
  const lineFlowConfig = ProjectConfig.renderConfig.lineFlow;
  const doHasFlow = hasFlow && lineFlowConfig.mapGrade <= mapZoom;

  const maxShortLine = ProjectConfig.renderConfig.line.maxLineNum ?? 6800;
  const maxLongLine = ProjectConfig.renderConfig.longLineConfig.maxLineNum ?? 4800;

  const lineList: LineRenderData[] = [];
  const lineFlowList: LineRenderData[] = [];

  // ===== 处理短管数据 =====
  let shortLineCount = 0;
  if(!isLongLineMode) {
    for (const item of topologyData.lines) {
      // 过滤
      if (!filterLine({ item, mapZoom }, bounds)) continue;
      // 最大渲染量
      if (shortLineCount >= maxShortLine) break;
      shortLineCount++;

      // 流向分流
      const flowD = item.userData.flowD;
      const hidFlow = item.userData.hidFlow;

      // 所有管道都放入基础层（不做流向修正）
      lineList.push(toLineRenderData(item, 'shortLine', false));

      if (doHasFlow) {
        
        if (flowD && !hidFlow) {
          // 有流向且不隐藏 → 额外放入流向动画层（做流向修正）
          lineFlowList.push(toLineRenderData(item, 'shortLine', true));
        }
      }
    }
  }

  // ===== 处理长管数据 =====
  if (isLongLineMode) {
    const longLines = !topologyKey
      ? publicTopology.getLongLines()
      : publicTopology.getLongLinesMult(topologyKey);

    if (longLines) {
      let longLineCount = 0;
      for (const longLine of longLines) {
        if (longLineCount >= maxLongLine) break;

        // 长管过滤 → 可能返回长管整体或拆分的子管
        const filteredItems = filterLongLine(longLine, mapZoom, bounds);

        for (const { item, dataType } of filteredItems) {
          if (longLineCount >= maxLongLine) break;
          longLineCount++;

          const isLongLineWhole = dataType === 'longLine';

          // 所有管道都放入基础层（不做流向修正）
          lineList.push(toLineRenderData(item, dataType, false, isLongLineWhole ? undefined : longLine.tpId));

          // 长管流向过滤逻辑（参考 flowToEcharts）
          if (doHasFlow) {
            const flowD = isLongLineWhole
              ? longLine.userData.children[0]?.userData.flowD
              : (item as TopologyLine).userData.flowD;

            const hidFlow = isLongLineWhole
              ? longLine.userData.children.every(c => c.userData.hidFlow)
              : (item as TopologyLine).userData.hidFlow;

            
            if (flowD !== 0 && !hidFlow) {
              // 有流向且不隐藏 → 额外放入流向动画层（做流向修正）
              lineFlowList.push(toLineRenderData(item, dataType, true, isLongLineWhole ? undefined : longLine.tpId));
            }
          }
        }
      }
    }
  }

  return { lineList, lineFlowList };
}

/**
 * @description: 创建管道 LineLayer
 */
function createLineLayer(
  data: LineRenderData[],
  hasFlow: boolean
): ILayer {
  const layer = new LineLayer({
    zIndex: 1
  })
    .source(data, LINE_SOURCE_OPTIONS)
    .size('width', value => hasFlow? value * 4 / 3 : value)
    .color('color')
    .shape('line');

  if (hasFlow) {
    layer.animate({
      interval: 1,
      trailLength: 0.5,
      duration: 1,
    });
  }

  return layer;
}

/**
 * @description: 处理管道流向动画数据
 * @param scene L7 Scene 实例
 * @param hasFlow 是否显示流向动画
 * @param topologyKey 多拓扑标识
 * @returns 管道图层实例
 */
export function processLineFlowData(
  scene: Scene,
  hasFlow = false,
  topologyKey?: string
) {
  // 流向渲染需要同时满足 hasFlow 和地图等级 ≥ lineFlow.mapGrade
  const lineFlowConfig = ProjectConfig.renderConfig.lineFlow;
  const doHasFlow = hasFlow && lineFlowConfig.mapGrade <= scene.getZoom();

  const { lineList, lineFlowList } = computeFilteredLineData(scene, hasFlow, topologyKey);

  // 创建基础管道层
  const layer = createLineLayer(lineList, false);
  // doHasFlow 时基础层设置透明度，参考 echarts line.ts: lineFlowConfig.opacity / 100
  if (doHasFlow) {
    const lineFlowOpacity = lineFlowConfig?.opacity ?? 30;
    layer.style({ opacity: lineFlowOpacity / 100 });
  }
  scene.addLayer(layer);

  // 创建流向动画层
  let layerFlow: ILayer | null = null;
  if (doHasFlow) {
    layerFlow = createLineLayer(lineFlowList, true);
    scene.addLayer(layerFlow);
  }

  // 刷新数据：重新过滤并更新图层
  const refreshData = () => {
    const currentDoHasFlow = hasFlow && lineFlowConfig.mapGrade <= scene.getZoom();
    const { lineList: newLineList, lineFlowList: newLineFlowList } = computeFilteredLineData(scene, hasFlow, topologyKey);

    layer.setData(newLineList, LINE_SOURCE_OPTIONS);
    // 根据当前 zoom 动态调整基础层透明度
    if (currentDoHasFlow) {
      const lineFlowOpacity = lineFlowConfig?.opacity ?? 30;
      layer.style({ opacity: lineFlowOpacity / 100 });
    } else {
      layer.style({ opacity: 1 });
    }

    if (layerFlow) {
      if (currentDoHasFlow) {
        layerFlow.setData(newLineFlowList, LINE_SOURCE_OPTIONS);
      } else {
        // zoom 低于 mapGrade 时清空流向层
        layerFlow.setData([], LINE_SOURCE_OPTIONS);
      }
    }
  };

  // 地图移动/缩放时自动刷新数据
  scene.on('moveend', refreshData);
  scene.on('zoomend', refreshData);

  return {
    layer,
    layerFlow,
    /** 外部条件变化时调用（如供回水切换），重新过滤并更新数据 */
    filter: refreshData,
    /** 流向图层的外部刷新方法 */
    filterFlow: refreshData,
  };
}
