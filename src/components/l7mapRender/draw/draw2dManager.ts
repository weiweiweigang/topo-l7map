/*
 * @Description: draw2d 插件管理器（L7 版本）
 * @FilePath: \heat-web\src\components\l7mapRender\draw\draw2dManager.ts
 */
import type { Scene } from '@antv/l7';
import DeviceModel from '@/dataModel/deviceModel';
import {
  BindEventOfEquipment,
  WhenAddFigure,
  WhenAddLine,
  WhenMoveLine,
  WhenRemoveEquipment,
  WhenDragLinePort,
  RemoveEquipmentFromOutside,
  RotateEquipmentFromOutside,
  ChangeEquipmentWaterTypeFromOutside,
  UpdateAllEquipmentColor
} from './bindEventOfEquipment';
import { TopologyDevice, TopologyLine } from '@/dataModel/topologyType';
import { screenToWebMercator } from './coordHelper';
import { cloneDeep } from 'lodash';

export default class Draw2dManagerL7 {
  scene: Scene | null = null;
  canvas: any = null;
  RemoveJson: any[] = []; // 输出的数据
  editItem = {
    id: null as string | null,
    changeSource: null as string | null,
    changeTarget: null as string | null,
    oldSource: null as string | null,
    oldTarget: null as string | null,
  };
  OFFSET_VALUE = 12; // 经过多次测试12是最好的偏移值
  dblClickId: string | null = null;
  devicesSvg = DeviceModel.equipmentSvg;

  /** 兼容 draw2d.js 内部调用的 map 对象（对应 ArcGIS API 的方法，映射到高德地图） */
  map = {
    /** 禁用滚轮缩放 */
    disableScrollWheelZoom: () => {
      this.scene?.setMapStatus({ zoomEnable: false });
    },
    /** 启用滚轮缩放 */
    enableScrollWheelZoom: () => {
      this.scene?.setMapStatus({ zoomEnable: true });
    },
    /** 禁用地图导航（拖拽+缩放） */
    disableMapNavigation: () => {
      this.scene?.setMapStatus({ dragEnable: false, zoomEnable: false });
    },
    /** 启用地图导航（拖拽+缩放） */
    enableMapNavigation: () => {
      this.scene?.setMapStatus({ dragEnable: true, zoomEnable: true });
    },
    /** 禁用双击缩放 */
    disableDoubleClickZoom: () => {
      this.scene?.setMapStatus({ doubleClickZoom: false });
    },
  };

  constructor(scene: Scene) {
    this.setScene(scene);
  }

  /** @description: 绑定 L7 Scene */
  setScene(scene: Scene) {
    this.scene = scene;
  }

  /** @description: 绑定画布 */
  // eslint-disable-next-line
  setCanvas(canvas: any) {
    this.canvas = canvas;
  }

  /** @description: 给画布上的设备添加事件 */
  bindEventOfEquipment(): void {
    BindEventOfEquipment(this);
  }

  /** @description: 新增器件 */
  // eslint-disable-next-line
  whenAddFigure(figure: any, _x: number, _y: number) {
    WhenAddFigure(this, figure, _x, _y);
  }

  /** @description: 新增管道 */
  // eslint-disable-next-line
  whenAddLine(line: any) {
    WhenAddLine(this, line);
  }

  /** @description: 移动管道 */
  // eslint-disable-next-line
  whenMoveLine(figure: any) {
    WhenMoveLine(this, figure);
  }

  /** @description: 拖动管道端口 */
  // eslint-disable-next-line
  whenDragLinePort(figure: any, otherObj: any) {
    WhenDragLinePort(this, figure, otherObj);
  }

  /** @description: 删除元件或管道 */
  // eslint-disable-next-line
  whenRemoveFiguresAndLines(equipment: any): void {
    WhenRemoveEquipment(equipment);
  }

  /** @description: 从外部删除器件 */
  removeEquipmentFromOutside(obj: { type: 'device' | 'line'; tpId: string }): void {
    RemoveEquipmentFromOutside(obj);
  }

  updateAllEquipmentColor() {
    UpdateAllEquipmentColor();
  }

  /** @description: 从外部修改器件供回水类型 */
  changeEquipmentWaterTypeFromOutside(obj: {
    type: 'device' | 'line';
    tpId: string;
    waterType: 0 | 1 | 2;
    isMult?: boolean;
  }): void {
    ChangeEquipmentWaterTypeFromOutside(obj);
  }

  /** @description: 更新元件的坐标（屏幕坐标 → Web Mercator） */
  // eslint-disable-next-line
  updateDeviceLatLngFromScreen(device: TopologyDevice, figure: any, _x: number, _y: number) {
    if (!this.scene) return;

    // 屏幕坐标 → Web Mercator
    const mapPoint = screenToWebMercator(this.scene, _x, _y);
    device.latLng = mapPoint;

    if (!device.userData.status) device.userData.status = {};
    device.userData.status.move = true;

    // 更新画布元件（这里的坐标用于移动地图时重新更新元件的位置）
    if (!figure.userData) figure.userData = {};
    if (!figure.userData.writer) figure.userData.writer = {};
    figure.userData.writer.coord = mapPoint;
  }

  /** @description: 更新管道的坐标（屏幕坐标 → Web Mercator） */
  // eslint-disable-next-line
  updateLineCoord(line: TopologyLine, figure: any, screen: Array<{ x: number; y: number }>) {
    if (!this.scene) return;

    line.latLng = [];
    for (const item of screen) {
      const mapPoint = screenToWebMercator(this.scene, item.x, item.y);
      line.latLng.push(mapPoint);
    }

    if (!line.userData.status) line.userData.status = {};
    line.userData.status.move = true;

    // 更新画布管道（这里的坐标用于移动地图时重新更新元件的位置）
    if (!figure.userData) figure.userData = {};
    if (!figure.userData.writer) figure.userData.writer = {};
    figure.userData.writer.coord = line.latLng;
  }

  /** @description: 更新管道某个端点的坐标 */
  updateLineCoordOfPort(line: TopologyLine, portNum: 1 | 2, coord: [number, number]): void {
    if (portNum === 1) line.latLng[portNum - 1] = cloneDeep(coord);
    else line.latLng[line.latLng.length - 1] = cloneDeep(coord);

    if (!line.userData.status) line.userData.status = {};
    line.userData.status.move = true;
  }

  /** @description: 更新设备的 status 状态 */
  // eslint-disable-next-line
  updateEquipmentStatus(device: TopologyDevice, figure: any, key: string, value: boolean) {
    if (!device.userData.status) device.userData.status = {};
    device.userData.status[key] = value;
  }

  /** @description: 获取画布偏移值 */
  getOffsetOfCanvas(): [number, number] {
    const transform: [number, number] = [0, 0];
    const tansDom = document.getElementById('svg_graphics_layer')?.style?.transform;
    if (tansDom) {
      const tans = tansDom.split(',');
      transform.push(parseFloat(tans[tans.length - 2]), parseFloat(tans[tans.length - 1]));
    }
    return transform;
  }

  /** @description: 从外部旋转元件 */
  rotateEquipmentFromOutside(tpId: string, value: number): void {
    RotateEquipmentFromOutside(tpId, value);
  }
}
