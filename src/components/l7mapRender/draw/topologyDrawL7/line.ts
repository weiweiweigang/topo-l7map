/*
 * @Description: 组装适用于画布的管道数据（L7 版本）
 * @FilePath: \heat-web\src\components\l7mapRender\draw\topologyDrawL7\line.ts
 */
import type { Scene } from '@antv/l7';
import { TopologyLine, OFFSET_VALUE } from '@/dataModel/topologyType';
import { getDeviceColorOfWrite } from '@/dataModel/deviceModel';
import { webMercatorToScreen } from '../coordHelper';

export function getLinesCanvasL7(
  scene: Scene,
  lines: TopologyLine[],
  offsetValue: [number, number]
): Array<any> {
  const zoom = scene.getZoom();
  // eslint-disable-next-line
  const localOffsetValue = 7 * Math.pow(2, 18 - Number(zoom));

  const linesCanvas: any[] = [];

  for (const line of lines) {
    // 屏幕坐标
    const screenVertex: any[] = [];

    for (const item of line.latLng) {
      const screenPoint = webMercatorToScreen(scene, item);
      screenVertex.push({
        x: screenPoint.x - offsetValue[0] - OFFSET_VALUE + 24,
        y: screenPoint.y - offsetValue[1] - OFFSET_VALUE,
      });
    }

    const obj: any = {
      ...line,
      alpha: 1,
      angle: 0,
      color: getDeviceColorOfWrite(line.waterType),
      cssClass: 'draw2d_Connection',
      id: line.tpId,
      name: 'line',
      outlineColor: '#FFFFFF',
      outlineStroke: 1,
      policy: 'draw2d.policy.line.VertexSelectionFeedbackPolicy',
      radius: 20,
      router: 'draw2d.layout.connection.VertexRouter',
      stroke: 2,
      type: 'draw2d.Connection',
      source: {
        myPort: 0,
        node: line.connId1,
        port: line.connPort1 ? line.connPort1 - 1 : line.connPort1,
      },
      target: {
        myPort: 1,
        node: line.connId2,
        port: line.connPort2 ? line.connPort2 - 1 : line.connPort2,
      },
      vertex: screenVertex,
    };

    if (!obj.userData) obj.userData = {};
    if (!obj.userData.writer) obj.userData.writer = {};
    obj.userData.writer.coord = line.latLng;

    linesCanvas.push(obj);
  }

  return linesCanvas;
}
