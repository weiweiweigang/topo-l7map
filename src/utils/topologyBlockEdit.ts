/*
 * @Author: Strayer
 * @Date: 2022-05-25
 * @LastEditors: Strayer
 * @LastEditTime: 2023-01-02
 * @Description: 拓扑批量操作
 * @FilePath: \heat-web\src\utils\topologyBlockEdit.ts
 */

import { publicTopology, GetTopologyDataOfArea, DeleteEquipmentOfLog, SetTopologyData } from '@/Data/topologyData';
import { CreateLongLines } from '@/Data/topologyData/longLines';
import DeviceModel from '@/dataModel/deviceModel';
import { TopologyLine, TopologyDevice } from '@/dataModel/topologyType';
import Tool from '@/tools/tool';
import { cloneDeep, set } from 'lodash';
import Util from './util';

/**
 * @description: 根据区域坐标获取数据
 * @param {string} writeArea
 * @return {*}
 */
function getChooseEquipment(writeArea: string) {
  const linesObj:{[key: string]: TopologyLine} = {};
  const devicesObj:{[key: string]: TopologyDevice} = {};
  const chooseLines: TopologyLine[] = [];
  let chooseDevices: TopologyDevice[] = [];

  // 1.初始化数据
  for(const item of publicTopology.getTopologyData().lines) {
    Reflect.deleteProperty(item.userData, 'blockChoose');
    item.userData.hid = true;
    linesObj[item.tpId] = item;
  }
  for(const item of publicTopology.getTopologyData().devices) {
    Reflect.deleteProperty(item.userData, 'blockChoose');
    item.userData.hid = true;
    devicesObj[item.tpId] = item;
  }
  
  // 2.获取元件
  [chooseDevices] = GetTopologyDataOfArea(writeArea); 
  for(const item of chooseDevices) {
    item.userData.blockChoose = {
      status: 1
    }
  }

  // 3.获取管道
  for(const item of chooseDevices) {
    const portNum = DeviceModel.modelObj[item.tpType].portsInfo.length;

    for(let i = 1; i<=portNum; i++) {
      const line = linesObj[item['connId' + i]];
      if(!line) {
        console.warn('管道不存在', item);
        continue;
      }
      // 管道已被选中
      if(line.userData.blockChoose?.status || line.userData.blockChoose?.status===0) continue;

      const device1 = devicesObj[line.connId1 ?? ''];
      const device2 = devicesObj[line.connId2 ?? ''];
      if(device1.userData.blockChoose?.status && device2.userData.blockChoose?.status) {
        // 管道两端都被选中
        line.userData.blockChoose = {
          status: 1
        }
      }else if(device1.userData.blockChoose?.status) {
        // 管道只有口1被选中
        line.userData.blockChoose = {
          status: 0,
          ports: [1]
        }
      }else if(device2.userData.blockChoose?.status) {
        // 管道只有口2被选中
        line.userData.blockChoose = {
          status: 0,
          ports: [2]
        }
      }
      chooseLines.push(line)
    }
  }


  // 4.把选中的数据展示出来，其他数据不展示
  for(const item of [...chooseDevices, ...chooseLines]) {
    Reflect.deleteProperty(item.userData, 'hid')
  }
}

/**
 * @description: 批量改变器件坐标
 * @param {function} createLatLng
 * @return {*}
 */
function blockChangeEquipment(createLatLng: (latLng: [number, number]) => [number, number]): void {
  // 1.处理元件坐标
  for(let i = 0; i < publicTopology.getTopologyData().devices.length; i++) {
    const item = publicTopology.getTopologyData().devices[i];
    if(item.userData.blockChoose?.status) {
      const newPoint = createLatLng(item.latLng);
      item.latLng[0] = newPoint[0];
      item.latLng[1] = newPoint[1];

      set(item.userData, 'status.move', true)
    }
  }
  // 2.处理管道坐标
  for(let j = 0; j < publicTopology.getTopologyData().lines.length; j++) {
    const item = publicTopology.getTopologyData().lines[j];
    if(item.userData.blockChoose?.status) {
      for(let i = 0; i<item.latLng.length; i++) {
        const newPoint = createLatLng(item.latLng[i]);
        // 长管的latLng和短管的latLng指向同一个对象，只需要改变这个对象的值就行
        item.latLng[i][0] = newPoint[0];
        item.latLng[i][1] = newPoint[1];
      }

      set(item.userData, 'status.move', true)
    }else if(item.userData.blockChoose?.status === 0) {
      const portNum = item.userData?.blockChoose?.ports?.[0] === 1? 0:item.latLng.length-1;

      const newPoint = createLatLng(item.latLng[portNum]);
      item.latLng[portNum][0] = newPoint[0];
      item.latLng[portNum][1] = newPoint[1];

      set(item.userData, 'status.move', true)
    }
  }
}

/**
 * @description: 获取批量选择的元件的中心点坐标
 * @param {*}
 * @return {*}
 */
function getCenterOfBlockEquipment(): [number, number] {
  let [minX, maxX, minY, maxY] = [Infinity, -Infinity, Infinity, -Infinity];
  for(const item of publicTopology.getTopologyData().devices) {
    if(item.userData.blockChoose?.status) {
      if(item.latLng[0] < minX) minX = item.latLng[0];
      if(item.latLng[0] > maxX) maxX = item.latLng[0];
      if(item.latLng[1] < minY) minY = item.latLng[1];
      if(item.latLng[1] > maxY) maxY = item.latLng[1];
    }
  }
  const center: [number, number] = [(maxX + minX) / 2, (maxY + minY) / 2];

  return center;
}

// 拓扑转换公式
const transformEquation: {
  value: {
    type: 'move' | 'scale' | 'rotate',
    center?: [number, number], // 当前拓扑中心点坐标
    direction?: 'row' | 'column' | 'all', // 缩放方向
    value: number | {x: number, y: number} // rotateNum | scaleNum | {x: 0, y: 0}
  } []
} = {
  value: []
};
/**
 * @description: 处理批量移动数据
 * @param {number} x x轴上的移动量
 * @param {number} y y轴上的移动量
 * @return {*}
 */
function moveEquipmentHandle(x: number, y: number) {
  const createLatLng = ( latLng: [number, number]): [number, number] => {
    return [latLng[0] + x, latLng[1] + y]
  }
  transformEquation.value.push({
    type: 'move',
    value: {
      x: x,
      y: y
    }
  });
  console.log('transformEquation.value: ', transformEquation.value);

  blockChangeEquipment(createLatLng);
}

/**
 * @description: 批量缩放
 * @param {number} scaleNum 缩放比例
 * @return {*}
 */
function scaleEquipmentHandel(scaleNum: number, direction: 'row' | 'column' | 'all' = 'all', paramCenter?: [number, number]) {
  const center = paramCenter ?? getCenterOfBlockEquipment();

  const createLatLng = (latLng: [number, number]): [number, number] => {
    const pointX = direction !== 'column' ? center[0] + (latLng[0] - center[0]) * scaleNum : latLng[0];
    const pointY = direction !== 'row' ? center[1] + (latLng[1] - center[1]) * scaleNum : latLng[1];
    return [pointX, pointY]
  }
  transformEquation.value.push({
    type: 'scale',
    center: center,
    direction: direction,
    value: scaleNum
  });

  console.log('transformEquation.value: ', transformEquation.value);

  blockChangeEquipment(createLatLng);
}

/**
 * @description: 批量旋转
 * @param {number} rotateNum 旋转角度
 * @return {*}
 */
function rotateEquipmentHandel(rotateNum: number, paramCenter?: [number, number]) {
  const center = paramCenter ?? getCenterOfBlockEquipment();

  const createLatLng = (latLng: [number, number]) => Util.createLatLngOfRotate({ latLng, center, rotateNum })

  transformEquation.value.push({
    type: 'rotate',
    center: center,
    value: rotateNum
  });
  console.log('transformEquation.value: ', transformEquation.value);

  blockChangeEquipment(createLatLng);
}

/**
 * @description: 删除坐标区域内的元件
 * @param {string} writeArea
 * @return {*}
 */
function removeEquipment() {
  const chooseDevices: TopologyDevice [] = [];
  for(const item of publicTopology.getTopologyData().devices) {
    if(item.userData.blockChoose?.status) chooseDevices.push(item)
  } 

  for(const item of chooseDevices) {
    // 1.给元件添加删除状态
    item.userData.status = {
      delete: true
    }
    // 添加操作记录
    DeleteEquipmentOfLog(item)

    // 2.给元件所连接的管道添加删除状态
    const portNum = DeviceModel.modelObj[item.tpType].portsInfo.length;
    for(let i = 1; i<=portNum; i++) {
      const lineObj = publicTopology.getTopologyData().lineMap[item['connId' + i]];

      if(lineObj) {
        lineObj.userData.status = {
          delete: true
        }
        DeleteEquipmentOfLog(lineObj)


        // 给和管道相连的元件添加端口更改状态
        for(let i = 1; i<=2; i++) {
          const deviceObj = publicTopology.getTopologyData().deviceMap[lineObj['connId'+i]];
          deviceObj['connId' + lineObj['connPort'+i]] = null;
          deviceObj['connPort' + lineObj['connPort'+i]] = null;
          set(deviceObj.userData, 'status.connChange', true)
        }
      }
    }
  }

  // 2.长管合并
  const option = {
    devices: publicTopology.getTopologyData().devices,
    lines: publicTopology.getTopologyData().lines,
  }
  publicTopology.setLongLines(CreateLongLines(option));
}

/**
 * @description: 复制坐标区域内的元件
 * @param {string} writeArea
 * @return {*}
 */
function copyEquipment(writeArea: string) {
  const linesObj:{[key: string]: TopologyLine} = {};
  const devicesObj:{[key: string]: TopologyDevice} = {};
  const chooseLines: TopologyLine[] = [];
  let chooseDevices: TopologyDevice[] = [];

  // 1.初始化数据
  for(const item of publicTopology.getTopologyData().lines) {
    Reflect.deleteProperty(item.userData, 'blockChoose');
    item.userData.hid = true;
    linesObj[item.tpId] = item;
  }
  for(const item of publicTopology.getTopologyData().devices) {
    Reflect.deleteProperty(item.userData, 'blockChoose');
    item.userData.hid = true;
    devicesObj[item.tpId] = item;
  }

  // 2.获取元件
  [chooseDevices] = GetTopologyDataOfArea(writeArea); 
  for(const item of chooseDevices) {
    item.userData.blockChoose = {
      status: 1
    }
  }

  // 3.获取两端元件都被选中的所有管道
  for(const item of chooseDevices) {
    const portNum = DeviceModel.modelObj[item.tpType].portsInfo.length;

    for(let i = 1; i<=portNum; i++) {
      const line = linesObj[item['connId' + i]];
      if(!line) {
        console.warn('管道不存在', item);
        continue;
      }
      // 管道已被选中
      if(line.userData.blockChoose?.status || line.userData.blockChoose?.status===0) continue;

      const device1 = devicesObj[line.connId1 ?? ''];
      const device2 = devicesObj[line.connId2 ?? ''];
      if(device1.userData.blockChoose?.status && device2.userData.blockChoose?.status) {
        // 管道两端都被选中
        line.userData.blockChoose = {
          status: 1
        }
        chooseLines.push(line)
      }
    }
  }

  // 4.把选中的元件和管道深复制一份
  const devicesN: TopologyDevice[] = [];
  const linesN: TopologyLine[] = [];
  const devicesNObj:{[key: string]: TopologyDevice} = {};
  const linesNObj:{[key: string]: TopologyLine} = {};

  for(const item of chooseDevices) {
    devicesN.push(cloneDeep(item))
    devicesNObj[item.tpId] = item;
  }
  for(const item of chooseLines) {
    linesN.push(cloneDeep(item))
    linesNObj[item.tpId] = item;
  }

  // 5.更新tpId和坐标偏移
  for(const item of devicesN) {
    item.tpId = Tool.GetUID();
    set(item.userData, 'status.add', true);

    const portNum = DeviceModel.modelObj[item.tpType].portsInfo.length;
    for(let i = 1; i<=portNum; i++) {
      const line = linesNObj[item['connId' + i]];
      const portNum = item['connPort' + i];
      if(!line) continue;

      line['connId' + portNum] = item.tpId;
    }

    for(let i = 0; i<item.latLng.length; i++) {
      item.latLng[i] += 10;
    }
  }
  for(const item of linesN) {
    item.tpId = Tool.GetUID();
    set(item.userData, 'status.add', true);

    for(let i = 1; i<=2; i++) {
      const device = devicesN[item['connId' + i]];
      const portNum = item['connPort' + i];
      if(!device) continue;

      device['connId' + portNum] = item.tpId;
    }

    for(let j = 0; j<item.latLng.length; j++) {
      for(let i = 0; i<item.latLng[j].length; i++) {
        item.latLng[j][i] += 10;
      }
    }
  }

  // 6.复制的数据高亮
  for(const item of [...chooseDevices, ...chooseLines]) {
    Reflect.deleteProperty(item.userData, 'blockChoose');
  }
  for(const item of [...devicesN, ...linesN]) {
    Reflect.deleteProperty(item.userData, 'hid');
  }

  // 7.将数据添加到拓扑
  SetTopologyData(
    publicTopology.getTopologyData().devices.concat(devicesN),
    publicTopology.getTopologyData().lines.concat(linesN)
  )
}

export const BlockEditObj = {
  getChooseEquipment,  //根据区域坐标获取数据（批量选择）
  moveEquipmentHandle,  //处理批量移动数据
  removeEquipment, // 批量删除
  copyEquipment, // 批量复制
  scaleEquipmentHandel, //批量缩放
  rotateEquipmentHandel,
  transformEquation, // 拓扑转换公式
}
