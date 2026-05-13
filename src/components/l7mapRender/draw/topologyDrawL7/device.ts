/*
 * @Description: 组装适用于画布的元件数据（L7 版本）
 * @FilePath: \heat-web\src\components\l7mapRender\draw\topologyDrawL7\device.ts
 */
import type { Scene } from '@antv/l7';
import DeviceModel, { DevicePortType, getDeviceColorOfWrite, PortColor } from '@/dataModel/deviceModel';
import { TopologyDevice, TopologyLine, OFFSET_VALUE } from '@/dataModel/topologyType';
import Tool from '@/tools/tool';
import { publicTopology } from '@/Data/topologyData/index';
import { set } from 'lodash';
import { webMercatorToScreen } from '../coordHelper';

/**
 * @description: 获取画布格式的元件数据（L7 版本）
 * @param {Scene} scene L7 Scene 实例
 * @param {Array} devices 元件数组
 * @param {Array} lines 管道数组
 * @param {Array} offsetValue 偏移值
 * @return {Array} 整理好的画布格式数据
 */
export function GetDevicesCanvasL7(
  scene: Scene,
  devices: Array<TopologyDevice>,
  lines: Array<TopologyLine>,
  offsetValue: [number, number]
): any[] {
  const devicesCanvas: any[] = [];
  const linesObj = Tool.ArrayToObj(lines);
  const writeDataDeviceObj = Tool.ArrayToObj(publicTopology.writeData.devices, 'tpId');

  for (const device of devices) {
    // 屏幕坐标（Web Mercator → 经纬度 → 屏幕坐标）
    const screenVertex = webMercatorToScreen(scene, device.latLng);
    screenVertex.x = screenVertex.x - offsetValue[0] - OFFSET_VALUE;
    screenVertex.y = screenVertex.y - offsetValue[1] - OFFSET_VALUE;

    const obj: any = {
      ...device,
      width: DeviceModel.modelObj[device.tpType].width,
      height: DeviceModel.modelObj[device.tpType].height,
      angle: device.rotationAngle,
      cssClass: 'draw2d_shape_icon_mlight' + device.tpType,
      color: getDeviceColorOfWrite(device.waterType),
      dasharray: null,
      id: device.tpId,
      name: device.tpType,
      radius: 0,
      stroke: 0,
      type: 'draw2d.shape.icon.mlight' + device.tpType,
      x: screenVertex.x,
      y: screenVertex.y,
      ports: [],
    };
    if (!obj.userData) obj.userData = {};
    if (!obj.userData.writer) obj.userData.writer = {};
    obj.userData.writer.coord = device.latLng;

    const devicePorts: { id: string; num: number; type: DevicePortType }[] = [];
    for (let i = 0; i < DeviceModel.modelObj[device.tpType].portsInfo.length; i++) {
      devicePorts.push({
        id: (device as any)['connId' + (i + 1)],
        num: (device as any)['connPort' + (i + 1)],
        type: DeviceModel.modelObj[device.tpType].portsInfo[i].type ?? 'HybridPort',
      });
    }

    devicePorts.forEach((item, index) => {
      let staticBoolean = false; // 是否禁止移动
      if (item.id && !linesObj[item.id] && publicTopology.getTopologyData().lineMap[item.id]) {
        staticBoolean = true;

        if (!obj.userData) obj.userData = {};
        if (!obj.userData.writer) obj.userData.writer = {};
        obj.userData.writer.static = true;
        set(writeDataDeviceObj[obj.tpId], 'userData.writer.static', true);
      }

      const portObj = createPortObj(device, index, staticBoolean, item.type);
      (obj.ports as any).push(portObj);
    });

    devicesCanvas.push(obj);
  }

  return devicesCanvas;
}

// 组装元件端口
function createPortObj(device: TopologyDevice, num: number, staticBoolean: boolean, type: DevicePortType) {
  let [color, bgColor] = [PortColor[type].borderColor, PortColor.devicePort.bgColor];

  // 内圈颜色根据管道端口来
  if (device['connPort' + (num + 1)] === 1) {
    bgColor = PortColor.lineStartPort.bgColor;
  } else if (device['connPort' + (num + 1)] === 2) {
    bgColor = PortColor.lineEndPort.bgColor;
  }

  if (staticBoolean) {
    [color, bgColor] = [PortColor.static.borderColor, PortColor.static.bgColor];
  }

  return {
    alpha: 1,
    angle: 0,
    bgColor: bgColor,
    color: color,
    cssClass: 'draw2d_' + (DeviceModel.modelObj[device.tpType].portsInfo[num].type ?? 'HybridPort'),
    dasharray: null,
    height: 7,
    id: device.tpId + 'num' + num,
    locator: 'draw2d.layout.locator.PortLocator',
    name: num,
    port: 'draw2d.' + (DeviceModel.modelObj[device.tpType].portsInfo[num].type ?? 'HybridPort'),
    radius: PortColor.devicePort.portRWrite ?? 3.5,
    stroke: PortColor.devicePort.borderWidthWrite ?? 2,
    type: 'draw2d.' + (DeviceModel.modelObj[device.tpType].portsInfo[num].type ?? 'HybridPort'),
    width: 7,
    x: 0,
    y: 0,
    userData: {
      writer: {
        static: staticBoolean, // false: 该点未被外部占用 true: 该点已被外部占用
      },
    },
  };
}
