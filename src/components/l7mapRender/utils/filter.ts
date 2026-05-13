/**
 * @description: 过滤逻辑工具
 * @FilePath: \heat-web\src\components\l7render\utils\filter.ts
 */
import { filterAreaOfEquipment, filterWaterType, publicTopology } from '@/Data/topologyData';
import ProjectConfig from '@/Data/projectConfig';
import Util from '@/utils/util';
import type { MapBounds } from '../types';
import { Bounds } from '@antv/l7';
import { webMercatorToCoord } from '@/tools/tool/tool';
import { TopologyDevice, TopologyLine, LongLine } from '@/dataModel/topologyType';
import type { LineDataType } from '../types';

/**
 * @description: 过滤器选项
 */
export interface FilterOptions {
  mapZoom: number;
  topologyKey?: string;
}

/**
 * @description: 获取地图边界
 * @param bounds L7 地图边界对象或数组 [[swLng, swLat], [neLng, neLat]]
 * @returns 标准边界对象
 */
export function getMapBounds(bounds: Bounds): MapBounds {
  return {
    xmin: bounds[0]?.[0] ?? 0,
    xmax: bounds[1]?.[0] ?? 0,
    ymin: bounds[0]?.[1] ?? 0,
    ymax: bounds[1]?.[1] ?? 0,
  };
}

/**
 * @description: 过滤管道数据 - 根据供回水类型
 * @param options 过滤选项
 * @returns 是否通过过滤
 */
export function filterLineByWaterType(options: {
  userData?: Record<string, any>;
}): boolean {
  const { userData } = options;

  // 检查是否被删除
  if (userData?.status?.delete) {
    return false;
  }

  // 供回水类型过滤
  const waterType = userData?.waterType;
  const topologyWaterType = publicTopology.topologyWaterType;

  if (topologyWaterType !== 0 && waterType !== undefined) {
    if (topologyWaterType === 1 && waterType !== 1) return false;
    if (topologyWaterType === 2 && waterType !== 2) return false;
    if (topologyWaterType === 3 && waterType !== 1 && waterType !== 2) return false;
  }

  return true;
}

/**
 * @description: 过滤元件数据 - 根据区域类型
 * @param userData 元件用户数据
 * @returns 是否通过过滤
 */
export function filterDeviceByArea(userData?: Record<string, any>): boolean {
  if (!userData) return true;

  const showAreaId = publicTopology.showAreaId;
  const topologyAreaList = publicTopology.topologyAreaList;

  // 如果没有设置区域过滤或拓扑没有区域列表，显示全部
  if (!Array.isArray(showAreaId) || topologyAreaList.length === 0) {
    return true;
  }

  const areaId = userData.areaId;
  if (!areaId) return true;

  return showAreaId.includes(areaId);
}

/**
 * @description: 过滤管道数据 - 根据区域类型
 * @param userData 管道用户数据
 * @returns 是否通过过滤
 */
export function filterLineByArea(userData?: Record<string, any>): boolean {
  if (!userData) return true;

  const showAreaId = publicTopology.showAreaId;
  const topologyAreaList = publicTopology.topologyAreaList;

  if (!Array.isArray(showAreaId) || topologyAreaList.length === 0) {
    return true;
  }

  const areaId = userData.areaId;
  if (!areaId) return true;

  return showAreaId.includes(areaId);
}

/**
 * @description: 过滤管道数据 - 根据管径类型
 * @param insideKey 管道内径标识
 * @returns 是否通过过滤
 */
export function filterLineByInside(insideKey?: string | number | null): boolean {
  const showLineInside = publicTopology.showLineInside;

  // 如果没有设置管径过滤，显示全部
  if (!Array.isArray(showLineInside) || showLineInside.length === 0) {
    return true;
  }

  if (insideKey === null || insideKey === undefined) return false;

  return showLineInside.includes(insideKey as any);
}

/**
 * @description: 检查元件是否在视图范围内
 * @param latLng 元件坐标
 * @param bounds 地图边界
 * @returns 是否在视图范围内
 */
export function isDeviceInView(
  latLng: [number, number],
  bounds: MapBounds
): boolean {
  const coord = webMercatorToCoord(latLng);
  return Util.PortInSquare(coord, bounds);
}

/**
 * @description: 检查管道是否在视图范围内
 * @param latLng 管道坐标数组
 * @param bounds 地图边界
 * @returns 是否在视图范围内
 */
export function isLineInView(
  latLng: [number, number][],
  bounds: MapBounds
): boolean {
  const coords = latLng.map(coord => webMercatorToCoord(coord));
  return Util.LineIsShowOnSquare(coords, bounds);
}

/**
 * @description: 过滤元件 - 完整流程
 * @param options 元件过滤选项
 * @param bounds 地图边界
 * @returns 是否应该渲染该元件
 */
export function filterDevice(
  options: {
    mapZoom: number;
    item: TopologyDevice;
  },
  bounds: MapBounds
): boolean {
  const { mapZoom, item } = options;

  // 1. 检查删除/禁用状态
  if (item.userData?.status?.delete || item.userData?.unable) return false;

  // 2. 供回水类型过滤
  if(!filterWaterType({ mapZoom, obj: item })) return false;

  // 是否符合当前显示的区域类型
  if(!filterAreaOfEquipment(item)) return false;

  // 4. 渲染等级过滤
  const itemMapGrade = item.userData.mapGrade ?? ProjectConfig.renderConfig.device.mapGrade[item.tpType]
  if(mapZoom < itemMapGrade && !item.userData.highlight) return false

  // 5. 视图范围过滤
  if(!Util.PortInSquare(webMercatorToCoord(item.latLng), bounds)) return false;

  return true;
}

/**
 * @description: 过滤管道 - 完整流程
 * @param options 管道过滤选项
 * @param bounds 地图边界
 * @returns 是否应该渲染该管道
 */
export function filterLine(
  options: {
    item: TopologyLine;
    mapZoom: number;
  },
  bounds: MapBounds
): boolean {
  const { item, mapZoom } = options;

  // 是否被删除
  if(item.userData.status?.delete) return false;

  // 是否符合正在显示的供回水类型
  if(!filterWaterType({ mapZoom, obj: item, type: 'line' })) return false;
  // 是否符合当前显示的管道内径
  if(publicTopology.showLineInside) {
    if(!item.insideKey) {
      return false;
    }else if(!publicTopology.showLineInside.includes(item.insideKey)) {
      return false;
    }
  }
  // 是否符合当前显示的区域类型
  if(!filterAreaOfEquipment(item)) return false;

  //整个管是否在视图范围内
  if(!Util.LineIsShowOnSquare(item.latLng.map(item => webMercatorToCoord(item)), bounds)) return false;

  return true;
}

// ==================== 长管过滤 ====================

/**
 * @description: 检查长管中符合管径过滤的子管数量
 */
export function rightLongLineOfLineInside(obj: LongLine): number {
  let rightChildNum = 0;
  for (const childItem of obj.userData.children) {
    if (childItem.insideKey && publicTopology.showLineInside?.includes(childItem.insideKey)) {
      rightChildNum++;
    }
  }
  return rightChildNum;
}

/**
 * @description: 检查长管中符合区域过滤的子管数量
 */
export function rightAreaOfLongLine(obj: LongLine): number {
  let rightChildNum = 0;
  for (const childItem of obj.userData.children) {
    if (filterAreaOfEquipment(childItem)) rightChildNum++;
  }
  return rightChildNum;
}

/**
 * @description: 从长管中选择符合管径要求的子管（在视图范围内）
 */
export function chooseRightLineInsideChildLine(obj: LongLine, bounds: MapBounds): TopologyLine[] {
  const result: TopologyLine[] = [];
  for (const childItem of obj.userData.children) {
    if (childItem.insideKey && publicTopology.showLineInside?.includes(childItem.insideKey)) {
      if (Util.LineIsShowOnSquare(childItem.latLng.map(coord => webMercatorToCoord(coord)), bounds)) {
        result.push(childItem);
      }
    }
  }
  return result;
}

/**
 * @description: 从长管中选择符合区域要求的子管（在视图范围内）
 */
export function chooseRightAreaChildLine(obj: LongLine, bounds: MapBounds): TopologyLine[] {
  const result: TopologyLine[] = [];
  for (const childItem of obj.userData.children) {
    if (filterAreaOfEquipment(childItem)) {
      if (Util.LineIsShowOnSquare(childItem.latLng.map(coord => webMercatorToCoord(coord)), bounds)) {
        result.push(childItem);
      }
    }
  }
  return result;
}

/**
 * @description: 处理长管子管的置灰逻辑
 * 没有隐藏子管或全是隐藏子管 → 返回长管整体
 * 只有部分隐藏子管 → 把子管全部拆分返回
 */
export function dealHidLineOfLongLine(obj: LongLine): {
  isLoneLine: true;
  data: LongLine;
} | {
  isLoneLine: false;
  data: TopologyLine[];
} {
  let hideChildNum = 0;
  for (const childItem of obj.userData.children) {
    if (childItem.userData.hid) hideChildNum++;
  }

  const isLoneLine = (hideChildNum === 0) || (hideChildNum === obj.userData.children.length);

  if (isLoneLine) {
    return {
      isLoneLine: true,
      data: obj,
    };
  } else {
    const shortLines: TopologyLine[] = [];
    for (const childItem of obj.userData.children) {
      shortLines.push(childItem);
    }
    return {
      isLoneLine: false,
      data: shortLines,
    };
  }
}

/**
 * @description: 过滤长管数据 - 完整流程
 * 返回处理后的渲染数据列表，以及每条数据的 dataType 标识
 */
export function filterLongLine(
  longLine: LongLine,
  mapZoom: number,
  bounds: MapBounds
): Array<{ item: TopologyLine | LongLine; dataType: LineDataType }> {
  const result: Array<{ item: TopologyLine | LongLine; dataType: LineDataType }> = [];

  // 1. 供回水过滤
  if (!filterWaterType({ mapZoom, obj: longLine, type: 'line' })) return result;

  // 2. 管径/区域过滤 → 判断是否需要拆分子管
  const hasInsideFilter = !!publicTopology.showLineInside;
  const hasAreaFilter = !!publicTopology.showAreaId;

  if (hasInsideFilter || hasAreaFilter) {
    // 计算符合过滤条件的子管数量
    let rightChildNum = 0;
    if (hasInsideFilter) {
      rightChildNum = rightLongLineOfLineInside(longLine);
    } else if (hasAreaFilter) {
      rightChildNum = rightAreaOfLongLine(longLine);
    }

    // 没有子管符合要求 → 不渲染
    if (rightChildNum === 0) return result;

    // 只有部分子管符合 → 拆分子管单独渲染
    if (rightChildNum !== longLine.userData.children.length) {
      let childLines: TopologyLine[];
      if (hasInsideFilter) {
        childLines = chooseRightLineInsideChildLine(longLine, bounds);
      } else {
        childLines = chooseRightAreaChildLine(longLine, bounds);
      }
      for (const child of childLines) {
        result.push({ item: child, dataType: 'longLineChild' });
      }
      return result;
    }
  }

  // 3. 所有子管都符合要求 → 检查整个长管是否在视图范围内
  if (!Util.LineIsShowOnSquare(longLine.latLng.map(coord => webMercatorToCoord(coord)), bounds)) {
    return result;
  }

  // 4. 置灰处理
  const hidResult = dealHidLineOfLongLine(longLine);
  if (hidResult.isLoneLine) {
    result.push({ item: hidResult.data, dataType: 'longLine' });
  } else {
    for (const child of hidResult.data) {
      result.push({ item: child, dataType: 'longLineChild' });
    }
  }

  return result;
}

/**
 * @description: 统一的管道过滤入口（短管 + 长管）
 * 用于 doFilter 回调中，根据 dataType 分发到不同的过滤逻辑
 */
export function filterLineUnified(
  options: {
    item: TopologyLine | LongLine;
    dataType: LineDataType;
    mapZoom: number;
  },
  bounds: MapBounds
): boolean {
  const { item, dataType, mapZoom } = options;

  // 删除状态
  if (dataType === 'shortLine' || dataType === 'longLineChild') {
    const line = item as TopologyLine;
    if (line.userData.status?.delete) return false;
  }

  // 供回水过滤
  if (!filterWaterType({ mapZoom, obj: item, type: 'line' })) return false;

  // 管径过滤
  if (dataType === 'shortLine' || dataType === 'longLineChild') {
    const line = item as TopologyLine;
    if (publicTopology.showLineInside) {
      if (!line.insideKey) return false;
      if (!publicTopology.showLineInside.includes(line.insideKey)) return false;
    }
  }

  // 区域过滤（长管整体没有 areaId，区域过滤已在拆分逻辑中处理）
  if (dataType === 'shortLine' || dataType === 'longLineChild') {
    if (!filterAreaOfEquipment(item as TopologyLine)) return false;
  }

  // 视图范围过滤
  if (dataType === 'longLine') {
    const longLine = item as LongLine;
    if (!Util.LineIsShowOnSquare(longLine.latLng.map(coord => webMercatorToCoord(coord)), bounds)) return false;
  } else {
    const line = item as TopologyLine;
    if (!Util.LineIsShowOnSquare(line.latLng.map(coord => webMercatorToCoord(coord)), bounds)) return false;
  }

  return true;
}
