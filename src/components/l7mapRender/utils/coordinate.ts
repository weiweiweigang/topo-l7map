/**
 * @description: 坐标转换工具
 * @FilePath: \heat-web\src\components\l7render\utils\coordinate.ts
 */

import type { TopologyLine, LongLine } from '@/dataModel/topologyType';
import type { LineDataType } from '../types';

/**
 * @description: 根据流向修正短管坐标
 */
export function reviseCoordsByFlow(
  line: TopologyLine,
  coords: [number, number][]
): [number, number][] {
  const newCoords = [...coords];
  const flowD = line.userData.flowD;

  // 短管反向
  if (flowD === -1) {
    newCoords.reverse();
  }

  return newCoords;
}

/**
 * @description: 根据流向修正长管坐标
 * 长管 flowD 取第一个子管的值
 * flowR 标记长管是否和第一个子管的流向相反
 */
export function reviseLongLineCoordsByFlow(
  longLine: LongLine,
  coords: [number, number][]
): [number, number][] {
  const newCoords = [...coords];
  const flowD = longLine.userData.children[0]?.userData.flowD;
  const flowR = longLine.userData.flowR;

  // 长管判断翻转流向：flowD反向且不翻转，或flowD正向但flowR翻转
  if (
    (flowD === -1 && !flowR) ||
    (flowD === 1 && flowR)
  ) {
    newCoords.reverse();
  }

  return newCoords;
}

/**
 * @description: 统一的流向坐标修正入口
 */
export function reviseCoordsByFlowUnified(
  item: TopologyLine | LongLine,
  dataType: LineDataType,
  coords: [number, number][]
): [number, number][] {
  if (dataType === 'longLine') {
    return reviseLongLineCoordsByFlow(item as LongLine, coords);
  }
  return reviseCoordsByFlow(item as TopologyLine, coords);
}
