/*
 * @Description: 给画布上的设备绑定事件（L7 版本）
 * @FilePath: \heat-web\src\components\l7mapRender\draw\bindEventOfEquipment.ts
 */
import Tool from '@/tools/tool';
import { LineParam, TopologyDevice, TopologyLine } from '@/dataModel/topologyType';
import {
  AddEquipmentOfLog,
  DeleteEquipmentOfLog,
  publicTopology,
  UpdateEquipmentOfLog
} from '@/Data/topologyData';
import DeviceModel, { getDeviceColorOfWrite, PortColor } from '@/dataModel/deviceModel';
import { InfoType } from '@/components/topologyPage/equipmentAttrBox/js/data';
import { TopologyWriteStore } from '@/store/topologyWrite';
import Util from '@/utils/util';
import { find, indexBy } from 'remeda';
import { set } from 'lodash';
import { getDraw2dManager } from './createDrawCanvas';
import { Scene } from '@antv/l7';

/** 拖拽期间临时将 overlay 设为 pointer-events:auto，避免鼠标移出 figure 后丢失事件 */
function setOverlayPointerEvents(auto: boolean) {
  const overlay = document.getElementById('l7-draw2d-overlay');
  if (overlay) {
    overlay.style.pointerEvents = auto ? 'auto' : 'none';
  }
}

/**
 * @description: 给设备绑定事件
 */
// eslint-disable-next-line
export function BindEventOfEquipment(_this: any): void {
  if (_this.canvas) {
    // 获取画布上的所有元件和管道数据
    const figuresAndLines = _this.canvas
      .getFigures()
      .clone()
      .data.concat(_this.canvas.getLines().clone().data);
    // 给数据添加事件
    figuresAndLines.forEach((item: any) => {
      item.uninstallEditPolicy('draw2d.policy.figure.DragDropEditPolicy');
      item.installEditPolicy(
        new (window as any).draw2d.policy.figure.DragDropEditPolicy({
          // 1.元件拖拽开始事件
          onDragStart: function () {
            console.log('拖拽开始');
            if (item.userData.writer?.static) {
              // 禁止移动
              return false;
            }
            // 拖拽期间 overlay 全区域接收鼠标，防止快速拖出 figure 导致事件丢失
            setOverlayPointerEvents(true);
            // 禁用 L7 地图交互
            const scene: Scene | null = _this.scene;
            scene?.setMapStatus({ dragEnable: false, zoomEnable: false });
          },

          // 2.元件拖拽结束事件
          // eslint-disable-next-line
          onDragEnd: function (canvas: any, figure: any, x: number, y: number) {
            console.log('拖拽结束');
            // 拖拽结束，恢复 overlay 穿透模式
            setOverlayPointerEvents(false);
            // 恢复 L7 地图交互
            const scene: Scene | null = _this.scene;
            scene?.setMapStatus({ dragEnable: true, zoomEnable: true });

            if (figure.type !== 'line') {
              // 更新元件坐标
              const device = Tool.ArrSearchOfObjKey(
                figure.id,
                publicTopology.writeData.devices,
                'tpId',
                true
              )[0];

              _this.updateDeviceLatLngFromScreen(device, figure, x, y);

              // 更新相关管道坐标
              for (let i = 1; i <= DeviceModel.modelObj[figure.type].portsInfo.length; i++) {
                const lineId = device['connId' + i];
                if (lineId) {
                  const line = Tool.ArrSearchOfObjKey(
                    lineId,
                    publicTopology.writeData.lines,
                    'tpId',
                    true
                  )[0];

                  _this.updateLineCoordOfPort(line, device['connPort' + i], device.latLng);
                }
              }
            } else {
              // 更新管道
            }
          },
        })
      );

      // 左键鼠标双击
      item.off('dblclick').on('dblclick', function (param: any) {
        console.log('双击:');

        const topologyWriteStoreObj = TopologyWriteStore();
        topologyWriteStoreObj.setDblClick(
          param.id,
          param.type === 'line' ? 'line' : 'device',
          param.type === 'line' ? 220 : param.type
        );
      });
      // 4.鼠标右击事件
      item.off('contextmenu').on('contextmenu', function (figure: any, ...arg: any[]) {
        console.log('右击');

        const topologyWriteStoreObj = TopologyWriteStore();
        topologyWriteStoreObj.setContextmenu(
          [arg[0].x, arg[0].y],
          figure.id,
          figure.type === 'line' ? 'line' : 'device',
          figure.type === 'line' ? 220 : figure.type
        );
      });
    });
  }
}

// eslint-disable-next-line
export function WhenMoveLine(_this: any, figure: any): void {
  console.log('移动管道:');

  const line = Tool.ArrSearchOfObjKey(
    figure.id,
    publicTopology.writeData.lines,
    'tpId',
    true
  )[0];
  // 更新坐标(屏幕坐标转地图坐标)
  _this.updateLineCoord(line, figure, figure.vertices.data);

  // 管道两个端点坐标更新为元件坐标
  for (let i = 1; i <= 2; i++) {
    const device = Tool.ArrSearchOfObjKey(
      line['connId' + i],
      publicTopology.writeData.devices,
      'tpId',
      true
    )[0];
    _this.updateLineCoordOfPort(line, i, device.latLng);
  }
}

// eslint-disable-next-line
export function WhenDragLinePort(_this: any, figure: any, otherObj: any): void {
  console.log('移动管道端口：');

  const line = Tool.ArrSearchOfObjKey(
    figure.id,
    publicTopology.writeData.lines,
    'tpId',
    true
  )[0];

  // 1.移除旧的元件连接信息
  for (let i = 1; i <= 2; i++) {
    const devicePortNum = line['connPort' + i];
    const device = Tool.ArrSearchOfObjKey(
      line['connId' + i],
      publicTopology.writeData.devices,
      'tpId',
      true
    )[0];

    device['connId' + devicePortNum] = null;
    device['connPort' + devicePortNum] = null;
    if (!device.userData.status) device.userData.status = {};
    device.userData.status.connChange = true;

    // 操作记录
    if (i === 1) {
      if (line.connId1 !== figure.sourcePort.parent.id || line.connPort1 !== figure.sourcePort.name + 1) {
        UpdateEquipmentOfLog(device, '口' + devicePortNum + '移除拓扑连接信息');
      }
    } else {
      if (line.connId2 !== figure.targetPort.parent.id || line.connPort2 !== figure.targetPort.name + 1) {
        UpdateEquipmentOfLog(device, '口' + devicePortNum + '移除拓扑连接信息');
      }
    }
  }

  // 2.更新源元件连接信息
  const sourceDevice = Tool.ArrSearchOfObjKey(
    figure.sourcePort.parent.id,
    publicTopology.writeData.devices,
    'tpId',
    true
  )[0];
  sourceDevice['connId' + (figure.sourcePort.name + 1)] = figure.id;
  sourceDevice['connPort' + (figure.sourcePort.name + 1)] = 1;
  if (!sourceDevice.userData.status) sourceDevice.userData.status = {};
  sourceDevice.userData.status.connChange = true;

  // 操作记录
  if (line.connId1 !== figure.sourcePort.parent.id || line.connPort1 !== figure.sourcePort.name + 1) {
    UpdateEquipmentOfLog(sourceDevice, '口' + (figure.sourcePort.name + 1) + '新增拓扑连接信息');
  }

  // 3.更新目标元件连接信息
  const targetDevice = Tool.ArrSearchOfObjKey(
    figure.targetPort.parent.id,
    publicTopology.writeData.devices,
    'tpId',
    true
  )[0];
  targetDevice['connId' + (figure.targetPort.name + 1)] = figure.id;
  targetDevice['connPort' + (figure.targetPort.name + 1)] = 2;
  if (!targetDevice.userData.status) targetDevice.userData.status = {};
  targetDevice.userData.status.connChange = true;

  // 操作记录
  if (line.connId2 !== figure.targetPort.parent.id || line.connPort2 !== figure.targetPort.name + 1) {
    UpdateEquipmentOfLog(targetDevice, '口' + (figure.targetPort.name + 1) + '新增拓扑连接信息');
  }

  // 管道操作记录
  if (line.connId1 !== figure.sourcePort.parent.id) {
    UpdateEquipmentOfLog(line, '口1拓扑连接信息变更');
  }
  if (line.connId2 !== figure.targetPort.parent.id) {
    UpdateEquipmentOfLog(line, '口2拓扑连接信息变更');
  }

  // 4.更新管道的连接信息
  line.connId1 = figure.sourcePort.parent.id;
  line.connPort1 = figure.sourcePort.name + 1;
  line.connId2 = figure.targetPort.parent.id;
  line.connPort2 = figure.targetPort.name + 1;
  if (!line.userData.status) line.userData.status = {};
  line.userData.status.connChange = true;

  // 5.更新管道坐标
  line.latLng[0] = sourceDevice.latLng;
  line.latLng[line.latLng.length - 1] = targetDevice.latLng;
  line.userData.status.move = true;

  // 6.更新画布上元件端口颜色
  otherObj.oldSourcePort.setBackgroundColor(PortColor.devicePort.bgColor ?? '#53B8E9');
  otherObj.oldTargetPort.setBackgroundColor(PortColor.devicePort.bgColor ?? '#53B8E9');
  otherObj.newSourcePort.setBackgroundColor(PortColor.lineStartPort.bgColor ?? '#53B8E9');
  otherObj.newTargetPort.setBackgroundColor(PortColor.lineEndPort.bgColor ?? '#53B8E9');
  if (document.querySelector('.draw2d_shape_basic_LineStartResizeHandle')) {
    let borderColor = PortColor.HybridPort.borderColor;
    if (otherObj.newSourcePort.cssClass === 'draw2d_OutputPort') borderColor = PortColor.OutputPort.borderColor;
    else if (otherObj.newSourcePort.cssClass === 'draw2d_InputPort') borderColor = PortColor.InputPort.borderColor;

    document.querySelector('.draw2d_shape_basic_LineStartResizeHandle')!.setAttribute('stroke', borderColor ?? '#53B8E9');
  }
  if (document.querySelector('.draw2d_shape_basic_LineEndResizeHandle')) {
    let borderColor = PortColor.HybridPort.borderColor;
    if (otherObj.newTargetPort.cssClass === 'draw2d_OutputPort') borderColor = PortColor.OutputPort.borderColor;
    else if (otherObj.newTargetPort.cssClass === 'draw2d_InputPort') borderColor = PortColor.InputPort.borderColor;

    document.querySelector('.draw2d_shape_basic_LineEndResizeHandle')!.setAttribute('stroke', borderColor ?? '#53B8E9');
  }
}

// eslint-disable-next-line
export function WhenAddFigure(_this: any, figure: any, _x: number, _y: number): void {
  console.log('新增元件:', figure);
  figure.id = Tool.GetUID();

  figure.setColor(getDeviceColorOfWrite(0));
  BindEventOfEquipment(_this);

  const device = new TopologyDevice(figure.id, figure.type);

  _this.updateDeviceLatLngFromScreen(device, figure, _x, _y); // 更新元件坐标
  publicTopology.writeData.devices.push(device);
  AddEquipmentOfLog(device);
}

// eslint-disable-next-line
export function WhenAddLine(_this: any, figure: any): void {
  console.log('新增线段:');
  // 1.设置管道id
  figure.id = Tool.GetUID();

  BindEventOfEquipment(_this);

  // 更新源/目标元件的端口颜色
  figure.sourcePort.setBackgroundColor(PortColor.lineStartPort.bgColor ?? '#53B8E9');
  figure.targetPort.setBackgroundColor(PortColor.lineEndPort.bgColor ?? '#53B8E9');

  const line = new TopologyLine(figure.id);

  // 更新坐标(屏幕坐标转地图坐标)
  _this.updateLineCoord(line, figure, figure.vertices.data);

  // 添加管段长度
  (line.userData.param as LineParam)['length'] = Util.GetLengthOfWebMercatorLenOfStraight(line.latLng);

  // 更新连接关系
  const sourceDeviceId = figure.sourcePort.parent.id;
  const sourceDevicePortNum = figure.sourcePort.name + 1;
  const targetDeviceId = figure.targetPort.parent.id;
  const targetDevicePortNum = figure.targetPort.name + 1;

  // 管道连接关系
  line.connId1 = sourceDeviceId;
  line.connPort1 = sourceDevicePortNum;
  line.connId2 = targetDeviceId;
  line.connPort2 = targetDevicePortNum;
  if (!line.userData.status) line.userData.status = {};
  line.userData.status.connChange = true;

  // 管道两个端点坐标更新为元件坐标
  for (let i = 1; i <= 2; i++) {
    const device = Tool.ArrSearchOfObjKey(
      line['connId' + i],
      publicTopology.writeData.devices,
      'tpId',
      true
    )[0];
    _this.updateLineCoordOfPort(line, i, device.latLng);
  }

  // 源元件连接关系
  const sourceDevice = Tool.ArrSearchOfObjKey(
    sourceDeviceId,
    publicTopology.writeData.devices,
    'tpId',
    true
  )[0];
  sourceDevice['connId' + sourceDevicePortNum] = line.tpId;
  sourceDevice['connPort' + sourceDevicePortNum] = 1;
  if (!sourceDevice.userData.status) sourceDevice.userData.status = {};
  sourceDevice.userData.status.connChange = true;
  UpdateEquipmentOfLog(sourceDevice, '口' + sourceDevicePortNum + '新增拓扑连接信息');

  // 目标元件连接关系
  const targetDevice = Tool.ArrSearchOfObjKey(
    targetDeviceId,
    publicTopology.writeData.devices,
    'tpId',
    true
  )[0];
  targetDevice['connId' + targetDevicePortNum] = line.tpId;
  targetDevice['connPort' + targetDevicePortNum] = 2;
  if (!targetDevice.userData.status) targetDevice.userData.status = {};
  targetDevice.userData.status.connChange = true;
  UpdateEquipmentOfLog(targetDevice, '口' + targetDevicePortNum + '新增拓扑连接信息');

  // 根据源元件设置管道颜色
  let LineSourcePortNum: 1 | 2 = 1; // 管道类型生成的来源端点
  if (Util.GetWaterTypeSources().includes(sourceDevice.tpType)) {
    line.waterType = 1;
  } else if (Util.GetWaterTypeTargets().includes(sourceDevice.tpType)) {
    line.waterType = 2;
  } else if (Util.GetWaterTypeSources().includes(targetDevice.tpType)) {
    line.waterType = 2;
    LineSourcePortNum = 2;
  } else if (Util.GetWaterTypeTargets().includes(targetDevice.tpType)) {
    line.waterType = 1;
    LineSourcePortNum = 2;
  } else if (sourceDevice.waterType) {
    line.waterType = sourceDevice.waterType;
  } else {
    line.waterType = targetDevice.waterType;
    LineSourcePortNum = 2;
  }

  // 换热器特殊处理
  if (sourceDevice.tpType === 204) {
    if (sourceDevicePortNum === 2) {
      line.waterType = 2;
      LineSourcePortNum = 1;
    } else if (sourceDevicePortNum === 4) {
      line.waterType = 1;
      LineSourcePortNum = 1;
    }
  } else if (targetDevice.tpType === 204) {
    if (targetDevicePortNum === 1) {
      line.waterType = 1;
      LineSourcePortNum = 2;
    } else if (targetDevicePortNum === 3) {
      line.waterType = 2;
      LineSourcePortNum = 2;
    }
  }

  figure.setColor(getDeviceColorOfWrite(line.waterType));

  // 如果管道后面的元件或管帽类型为0，则对应更新
  updateBranchBehindCurrentLine({
    line,
    LineSourcePortNum: LineSourcePortNum,
    writeDataDeviceObj: indexBy(publicTopology.writeData.devices, (item) => item.tpId),
    writeDataLineObj: indexBy(publicTopology.writeData.lines, (item) => item.tpId),
  });

  publicTopology.writeData.lines.push(line);
  AddEquipmentOfLog(line);
}

/**
 * @description: 从当前管道往后更新一条直线上的 waterType == 0 的元件和管道
 */
function updateBranchBehindCurrentLine(param: {
  line: TopologyLine;
  LineSourcePortNum: 1 | 2;
  writeDataDeviceObj: { [key: string]: TopologyDevice };
  writeDataLineObj: { [key: string]: TopologyLine };
  isForce?: boolean; // 是否强制更新
}) {
  const { device, connDevicePort } = Util.GetDevicesOfLine({
    line: param.line,
    sourceDevicesObj: param.writeDataDeviceObj,
    excludePort: param.LineSourcePortNum,
  })[0];

  if (Util.GetWaterTypeSourceTargets().includes(device.tpType)) return;
  if (!param.isForce && device?.waterType) return;
  setDeviceWaterType(device, param.line.waterType);

  const lines = Util.GetLinesOfDevice({
    device: device,
    sourceLinesObj: param.writeDataLineObj,
    excludePort: connDevicePort,
  });

  lines.forEach((item) => {
    if (!item.line.waterType || param.isForce) {
      setLineWaterType(item.line, param.line.waterType);

      updateBranchBehindCurrentLine({
        line: item.line,
        LineSourcePortNum: item.connLinePort,
        writeDataDeviceObj: param.writeDataDeviceObj,
        writeDataLineObj: param.writeDataLineObj,
        isForce: param.isForce,
      });
    }
  });
}

/** 设置元件类型并更新颜色 */
function setDeviceWaterType(device: TopologyDevice, waterType: 0 | 1 | 2) {
  device.waterType = waterType;
  set(device, 'userData.status.attrChange', true);

  const manager = getDraw2dManager();
  if (!manager?.canvas) return;

  const figureArr: any[] = manager.canvas.getFigures().data;
  const figureObj = find(figureArr, (item) => item.id === device.tpId);
  figureObj?.setColor(getDeviceColorOfWrite(device.waterType));
}

/** 设置管道类型并更新颜色 */
function setLineWaterType(line: TopologyLine, waterType: 0 | 1 | 2) {
  line.waterType = waterType;
  set(line, 'userData.status.attrChange', true);

  const manager = getDraw2dManager();
  if (!manager?.canvas) return;

  const figureArr: any[] = manager.canvas.getLines().data;
  const figureObj = find(figureArr, (item) => item.id === line.tpId);
  figureObj?.setColor(getDeviceColorOfWrite(line.waterType));
}

// 从外部修改元件供回水类型
export function ChangeEquipmentWaterTypeFromOutside(obj: {
  type: 'device' | 'line';
  tpId: string;
  waterType: 0 | 1 | 2;
  isMult?: boolean;
}): void {
  console.log('供回水类型修改：', obj);
  let figureArr: any[] = [];
  let figureObj: any;

  let equipmentObj: TopologyDevice | TopologyLine | undefined = undefined;
  let equipmentArr: Array<TopologyDevice | TopologyLine> = [];

  const manager = getDraw2dManager();
  if (!manager?.canvas) return;

  if (obj.type === 'device') {
    figureArr = manager.canvas.getFigures().clone().data;
    equipmentArr = publicTopology.writeData.devices;
  } else {
    figureArr = manager.canvas.getLines().clone().data;
    equipmentArr = publicTopology.writeData.lines;
  }

  // 修改画布上该元件的颜色
  // eslint-disable-next-line prefer-const
  figureObj = find(figureArr, (item) => item.id === obj.tpId);
  figureObj?.setColor(getDeviceColorOfWrite(obj.waterType));

  // 更新相关属性
  equipmentObj = find(equipmentArr, (item) => item.tpId === obj.tpId);
  if (equipmentObj) {
    equipmentObj.waterType = obj.waterType;
    set(equipmentObj, 'userData.status.attrChange', true);
  }

  // 如果要修改多个
  if (obj.isMult && equipmentObj) {
    const writeDataDeviceObj = indexBy(publicTopology.writeData.devices, (item) => item.tpId);
    const writeDataLineObj = indexBy(publicTopology.writeData.lines, (item) => item.tpId);

    const startLineArr: {
      line: TopologyLine;
      LineSourcePortNum: 1 | 2;
    }[] = [];

    if (obj.type === 'line') {
      // 如果是管道，要向管道的两端找过去
      startLineArr.push(
        {
          line: equipmentObj as TopologyLine,
          LineSourcePortNum: 1,
        },
        {
          line: equipmentObj as TopologyLine,
          LineSourcePortNum: 2,
        }
      );
    } else {
      // 如果是元件，从和元件关联的管道开始找
      const lines = Util.GetLinesOfDevice({
        device: equipmentObj as TopologyDevice,
        sourceLinesObj: writeDataLineObj,
      });
      lines.forEach((item) => {
        startLineArr.push({
          line: item.line,
          LineSourcePortNum: item.connLinePort,
        });
      });
    }

    // 开始顺着管道遍历修改
    startLineArr.forEach((item) => {
      setLineWaterType(item.line, obj.waterType);

      updateBranchBehindCurrentLine({
        line: item.line,
        LineSourcePortNum: item.LineSourcePortNum,
        writeDataDeviceObj: writeDataDeviceObj,
        writeDataLineObj: writeDataLineObj,
        isForce: true,
      });
    });
  }
}

// 从外部删除器件
export function RemoveEquipmentFromOutside(obj: { type: 'device' | 'line'; tpId: string }): void {
  const manager = getDraw2dManager();
  if (!manager?.canvas) return;

  let figureArr: any[] = [];
  let figureObj: any;
  if (obj.type === 'device') {
    figureArr = manager.canvas.getFigures().clone().data;
  } else {
    figureArr = manager.canvas.getLines().clone().data;
  }
  for (const item of figureArr) {
    if (item.id === obj.tpId) {
      figureObj = item;
      break;
    }
  }

  // 2.触发器件删除事件
  WhenRemoveEquipment(figureObj);

  // 1.删除画布上的数据
  manager.canvas.remove(figureObj);
  if (obj.type === 'device') {
    // 删除和元件连接的管道
    const figureLines = manager.canvas.getLines().clone().data;
    for (const item of figureLines) {
      if (item.getSource().parent.id === obj.tpId || item.getTarget().parent.id === obj.tpId) {
        manager.canvas.remove(item);
      }
    }
  }
}

// 从外部旋转元件
export function RotateEquipmentFromOutside(tpId: string, value: number): void {
  const device = Tool.ArrSearchOfObjKey(
    tpId,
    publicTopology.writeData.devices,
    'tpId',
    true
  )[0];
  device.rotationAngle = value;
  if (!device.userData.status) device.userData.status = {};
  device.userData.status.rotationAngle = true;

  const manager = getDraw2dManager();
  if (!manager?.canvas) return;

  const canvasDevice = manager.canvas.getFigure(tpId);
  canvasDevice.setRotationAngle(value);
}

// eslint-disable-next-line
export function WhenRemoveEquipment(equipment: any, infoType: InfoType = 'writeOnWrite'): void {
  if (equipment.type === 'line') {
    console.log('删除管道');
    removeLine(equipment, infoType);
  } else {
    console.log('删除元件');
    // 更新元件信息
    const device = Tool.ArrSearchOfObjKey(
      equipment.id,
      infoType === 'writeOnWrite' ? publicTopology.writeData.devices : publicTopology.getTopologyData().devices,
      'tpId',
      true
    )[0];
    if (!device.userData.status) device.userData.status = {};
    device.userData.status.delete = true;
    DeleteEquipmentOfLog(device);

    // 删除相关联的管道
    for (let i = 1; i <= DeviceModel.modelObj[device.tpType].portsInfo.length; i++) {
      const lineId = device['connId' + i];
      const manager = getDraw2dManager();
      if (!manager?.canvas) return;
      const lineEquipment = manager.canvas.getLine(lineId);
      if (device['connId' + i]) removeLine(lineEquipment, infoType);
    }
  }
}

function removeLine(equipment: any, infoType: InfoType): void {
  const tpId = equipment.id;

  // 更新源/目标元件的端口颜色
  equipment.sourcePort.setBackgroundColor(PortColor.devicePort.bgColor);
  equipment.targetPort.setBackgroundColor(PortColor.devicePort.bgColor);

  // 更新管道信息
  const line = Tool.ArrSearchOfObjKey(
    tpId,
    infoType === 'writeOnWrite' ? publicTopology.writeData.lines : publicTopology.getTopologyData().lines,
    'tpId',
    true
  )[0];
  if (!line) return;
  if (!line.userData.status) line.userData.status = {};
  line.userData.status.delete = true;
  DeleteEquipmentOfLog(line);

  const sourceDeviceId = line.connId1;
  const sourceDevicePortNum = line.connPort1;
  const targetDeviceId = line.connId2;
  const targetDevicePortNum = line.connPort2;

  // 更新管道连接的源元件信息
  const sourceDevice = Tool.ArrSearchOfObjKey(
    sourceDeviceId,
    infoType === 'writeOnWrite' ? publicTopology.writeData.devices : publicTopology.getTopologyData().devices,
    'tpId',
    true
  )[0];
  if (sourceDevice) {
    sourceDevice['connId' + sourceDevicePortNum] = null;
    sourceDevice['connPort' + sourceDevicePortNum] = null;
    if (!sourceDevice.userData.status) sourceDevice.userData.status = {};
    sourceDevice.userData.status.connChange = true;
    UpdateEquipmentOfLog(sourceDevice, '口' + sourceDevicePortNum + '移除拓扑连接信息');
  }

  // 更新管道连接的目标元件信息
  const targetDevice = Tool.ArrSearchOfObjKey(
    targetDeviceId,
    infoType === 'writeOnWrite' ? publicTopology.writeData.devices : publicTopology.getTopologyData().devices,
    'tpId',
    true
  )[0];
  if (targetDevice) {
    targetDevice['connId' + targetDevicePortNum] = null;
    targetDevice['connPort' + targetDevicePortNum] = null;
    if (!targetDevice.userData.status) targetDevice.userData.status = {};
    targetDevice.userData.status.connChange = true;
    UpdateEquipmentOfLog(targetDevice, '口' + targetDevicePortNum + '移除拓扑连接信息');
  }

  // 再次更新管道
  line.connId1 = null;
  line.connPort1 = null;
  line.connId2 = null;
  line.connPort2 = null;
}

/**
 * @description: 自动更新所有元件和管道的颜色
 */
export function UpdateAllEquipmentColor() {
  const manager = getDraw2dManager();
  if (!manager?.canvas) return;

  const deviceArr: any[] = manager.canvas.getFigures().data;
  const lineArr: any[] = manager.canvas.getLines().data;

  const deviceObj = indexBy(publicTopology.writeData.devices, (item) => item.tpId);
  const lineObj = indexBy(publicTopology.writeData.lines, (item) => item.tpId);

  deviceArr.forEach((item) => {
    item.setColor(getDeviceColorOfWrite(deviceObj[item.id].waterType));
  });
  lineArr.forEach((item) => {
    item.setColor(getDeviceColorOfWrite(lineObj[item.id].waterType));
  });
}
