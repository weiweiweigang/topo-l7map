/*
 * @Description: BlockWriteL7 批量操作逻辑
 * @FilePath: \heat-web\src\components\blockWriteL7\js\blockHandle.ts
 */
import { EndWriteBeforeArea, WriteArea } from '@/components/l7mapRender/draw/writeArea';
import { publicTopology } from '@/Data/topologyData';
import { TopologyDevice, TopologyLine, WATER_TYPE_MAP } from '@/dataModel/topologyType';
import { PutTopologyData } from '@/http/topology';
import Notice from '@/tools/notice';
import type { Scene } from '@antv/l7';
import { BlockEditObj } from '@/utils/topologyBlockEdit';
import Util from '@/utils/util';
import { Ref, ref } from 'vue';
import { blockChooseHandleOutside, OutsideChangeParam } from './data';
import { set } from 'lodash';
import { GetEquipmentInfoOfBlock } from '@/http/equipmentInfoList';
import { coordToWebMercator } from '@/tools/tool/tool';

export const showBlockPush = ref(false); //是否允许批量提交
export const translateBoxHide = ref(false);

// ---------------批量选择begin---------------------
export const blockChooseHadGiveData = ref(false); //是否已经获取了数据
/**
 * @description: 批量选择
 * @param {*}
 * @return {*}
 */
export async function blockChooseHandle(param: {
  onWrite: boolean,
  scene: Scene | null,
  renderDataHandle: () => void,
  boxOutsideChange: (param: OutsideChangeParam) => void,
  inBlockChoose: Ref<boolean>,
  hadChoose?: boolean, // 是否已在外部选中数据
}) {
  if(param.onWrite) {
    Notice.message('请先结束编辑!', 'error');
    return;
  }

  param.inBlockChoose.value = !param.inBlockChoose.value;
  if(param.hadChoose) param.inBlockChoose.value = true;

  if(param.inBlockChoose.value) {
    BlockEditObj.transformEquation.value = [];
    console.log('param.hadChoose: ', param.hadChoose);

    if(!param.hadChoose) {
      if(!param.scene) {
        Notice.notification({
          title: '拓扑操作失败',
          type: 'error',
          message: '地图尚未加载完成!'
        })
        return;
      }
      // 获取区域内的数据
      const writeArea = await WriteArea(param.scene);
      if(writeArea) {
        blockChooseHadGiveData.value = true;
        showBlockPush.value = true;
        BlockEditObj.getChooseEquipment(writeArea)

        param.renderDataHandle();
      }else {
        Notice.notification({
          title: '拓扑操作失败',
          type: 'error',
          message: '获取编辑范围失败!'
        })
      }
    }else {
      blockChooseHadGiveData.value = true;
      showBlockPush.value = true;

      param.renderDataHandle();
    }
    
  }else {
    console.log('拓扑转换结束-transformEquation:',  BlockEditObj.transformEquation.value, JSON.stringify(BlockEditObj.transformEquation.value))
    // 取消选择
    if(!blockChooseHadGiveData.value) {
      if(param.scene) EndWriteBeforeArea(param.scene)
    }
    blockChooseHadGiveData.value = false;
    for(const item of publicTopology.getTopologyData().lines) {
      Reflect.deleteProperty(item.userData, 'blockChoose');
      Reflect.deleteProperty(item.userData, 'hid')
    }
    for(const item of publicTopology.getTopologyData().devices) {
      Reflect.deleteProperty(item.userData, 'blockChoose');
      Reflect.deleteProperty(item.userData, 'hid')
    }

    if(inBlockMove.value)  blockMoveHandle({
      scene: param.scene,
      renderDataHandle: param.renderDataHandle,
      boxOutsideChange: param.boxOutsideChange,
    });
    param.renderDataHandle();
  }
}
// ---------------批量选择end---------------------

// ---------------外部右键关联选择begin------------
export function connChooseFun(tpId: string, equipmentType: 'device' | 'line') {
  let obj: TopologyDevice | TopologyLine;
  if(equipmentType === 'device') obj = publicTopology.getTopologyData().deviceMap[tpId];
  else obj = publicTopology.getTopologyData().lineMap[tpId];

  if(obj.waterType !== 0) {
    Notice.messageConfirm({
      type: 'info',
      title: '关联选择类型',
      message: '是否只包含'+(WATER_TYPE_MAP[obj.waterType].label)+'网',
      other: {
        cancelButtonText: '否',
        confirmButtonText: '是',
      },
      callback: (res) => {
        if(res === 'confirm') connChooseHandle(tpId, equipmentType);
        else if(res === 'cancel') connChooseHandle(tpId, equipmentType, 'all');
      }
    })
  }else {
    connChooseHandle(tpId, equipmentType, 'all');
  }
}

function connChooseHandle(tpId: string, equipmentType: 'device' | 'line', chooseType?: 'all') {
  // 1.初始化所有数据
  for(const item of [...publicTopology.getTopologyData().lines, ...publicTopology.getTopologyData().devices]) {
    Reflect.deleteProperty(item.userData, 'blockChoose');
    item.userData.hid = true;
  }
  const equipmentObj = equipmentType === 'device'? publicTopology.getTopologyData().deviceMap[tpId] : publicTopology.getTopologyData().lineMap[tpId];
  if(equipmentObj.waterType === 0)  chooseType = 'all';

  let waiteArr = [ equipmentObj ]; // 下一批要处理的器件
  const chooseDeviceArrMap: {[key: string]: TopologyDevice} = {}; // 所有选择的元件
  const chooseLineArrMap: {[key: string]: TopologyLine} = {}; //所有选择的管道
  if(!equipmentObj.tpType) chooseLineArrMap[tpId] = equipmentObj;
  else chooseDeviceArrMap[tpId] = equipmentObj;

  // 2.找到要选择的所有器件
  do {
    const arr: (TopologyDevice | TopologyLine)[] = [];

    for(const item of waiteArr) {
      let res: {
        device?: TopologyDevice;
        line?: TopologyLine;
        connDevicePort: number;
        connLinePort: 1 | 2;
      }[] = [];

      if(!item.tpType) {
        res = Util.GetDevicesOfLine({
          line: item,
          sourceDevicesObj: publicTopology.getTopologyData().deviceMap
        })
      }else {
        res = Util.GetLinesOfDevice({
          device: item,
          sourceLinesObj: publicTopology.getTopologyData().lineMap
        })
      }

      for(const resItem of res) {
        const obj = resItem.device ?? resItem.line;
        if(!obj) continue;
        // if(!obj || obj?.userData.hid || obj?.userData.unable) continue;
        if(!chooseType && (obj.waterType !== equipmentObj.waterType)) continue;
        if(chooseLineArrMap[obj.tpId] || chooseDeviceArrMap[obj.tpId]) continue;
        
        arr.push(obj);

        if(!obj.tpType) chooseLineArrMap[obj.tpId] = obj;
        else chooseDeviceArrMap[obj.tpId] = obj;
      }
    }

    waiteArr = arr
  }while(waiteArr.length > 0)

  // 3.对已选择器件的状态进行处理
  Object.values(chooseDeviceArrMap).forEach(item => {
    Reflect.deleteProperty(item.userData, 'hid');
    item.userData.blockChoose = {
      status: 1
    }
  })

  Object.values(chooseLineArrMap).forEach(item => {
    Reflect.deleteProperty(item.userData, 'hid');
    const device1 = chooseDeviceArrMap[item.connId1 ?? ''];
    const device2 = chooseDeviceArrMap[item.connId2 ?? ''];
    if(device1 && device2) {
      // 管道两端都被选中
      item.userData.blockChoose = {
        status: 1
      }
    }else if(device1) {
      // 管道只有口1被选中
      item.userData.blockChoose = {
        status: 0,
        ports: [1]
      }
    }else if(device2) {
      // 管道只有口2被选中
      item.userData.blockChoose = {
        status: 0,
        ports: [2]
      }
    }
  })

  // 4.调用批量选择的方法
  blockChooseHandleOutside.value()
}
// ---------------外部右键关联选择end


// ---------------批量移动begin---------------------
export const inBlockMove = ref(false);  // 是否正处于批量移动中

let mapMoveStart: any = null; // 地图开始移动事件
let mapMoveEnd: any = null; // 地图移动结束事件
const mapMoveStartShape =[0, 0]; //鼠标开始移动时的坐标
const mapMoveEndShape =[0, 0]; //鼠标结束移动时的坐标
let mapMoveStartScreenPoint = [0, 0];

/**
 * @description: 点击批量移动
 * @param {*}
 * @return {*}
 */
export function blockMoveHandle(param: {
  scene: Scene | null,
  renderDataHandle: () => void,
  boxOutsideChange: (param: OutsideChangeParam) => void,
}) {
  inBlockMove.value = !inBlockMove.value;

  if(inBlockMove.value) {
    let hadFound = false;
    for(const item of publicTopology.getTopologyData().devices) {
      if(item.userData.blockChoose?.status) {
        hadFound = true;
        break;
      }
    }
    if(!hadFound) {
      Notice.message('当前不存在可以批量移动的数据,请先点击批量选择', 'error');
      inBlockMove.value = false;
      return;
    }

    Notice.message('你已进入批量移动状态,请在地图上按住鼠标左键不放进行拖动,点击右上角\'结束移动\'按钮退出该状态');

    param.scene?.setMapStatus({ dragEnable: false, zoomEnable: false });

    const container = param.scene?.getContainer();
    if(!container) return;

    let isDragging = false;

    const onMouseDown = (e: MouseEvent) => {
      isDragging = true;
      mapMoveStartShape[0] = e.offsetX;
      mapMoveStartShape[1] = e.offsetY;
      const lngLat = param.scene?.containerToLngLat([e.offsetX, e.offsetY]);
      if(lngLat) {
        const mercator = coordToWebMercator([lngLat.lng, lngLat.lat]);
        mapMoveStartScreenPoint = [mercator[0], mercator[1]];
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      if(!isDragging) return;
      // L7 不需要 echarts3Layer 操作
    };

    const onMouseUp = (e: MouseEvent) => {
      if(!isDragging) return;
      isDragging = false;
      
      const lngLat = param.scene?.containerToLngLat([e.offsetX, e.offsetY]);
      if(lngLat) {
        const mercator = coordToWebMercator([lngLat.lng, lngLat.lat]);
        mapMoveEndShape[0] = mercator[0];
        mapMoveEndShape[1] = mercator[1];
      }
      
      const x = mapMoveEndShape[0] - mapMoveStartScreenPoint[0];
      const y = mapMoveEndShape[1] - mapMoveStartScreenPoint[1];
      BlockEditObj.moveEquipmentHandle(x, y);
      
      param.boxOutsideChange({
        type: 'move',
        xMove: x,
        yMove: y
      })
      param.renderDataHandle();
    };

    container.addEventListener('mousedown', onMouseDown);
    container.addEventListener('mousemove', onMouseMove);
    container.addEventListener('mouseup', onMouseUp);

    mapMoveStart = () => {
      container.removeEventListener('mousedown', onMouseDown);
      container.removeEventListener('mousemove', onMouseMove);
      container.removeEventListener('mouseup', onMouseUp);
    };
    mapMoveEnd = mapMoveStart;
  }else {
    param.scene?.setMapStatus({ dragEnable: true, zoomEnable: true });
    if (mapMoveStart != null) {
      mapMoveStart();
      mapMoveStart = null;
    }
    if (mapMoveEnd != null) {
      mapMoveEnd();
      mapMoveEnd = null;
    }
  }
}
// ---------------批量移动end---------------------

// ---------------批量删除begin---------------------
/**
 * @description: 批量删除
 * @param {*}
 * @return {*}
 */
export async function blockRemoveHandle(param: {
  renderDataHandle: () => void,
}) {
  BlockEditObj.removeEquipment();
  param.renderDataHandle();
}
// ---------------批量删除end---------------------

/**
 * @description: 批量提交
 * @param {*}
 * @return {*}
 */
export function pushBlockData() {
  PutTopologyData().then(() => {
    Notice.message('批量提交成功');
    showBlockPush.value = false;
  })
}

/** 自动纠正供回水类型 */
export async function autoRepairWaterType(param: {
  renderDataHandle: () => void,
}) {
  // 一。先获取整个拓扑所有的器件详情
  await GetEquipmentInfoOfBlock('device', publicTopology.getTopologyData().devices.map(item => item.tpId))
  await GetEquipmentInfoOfBlock('line', publicTopology.getTopologyData().lines.map(item => item.tpId))

  // 二。先把源两端的管道供回水类型纠正
  publicTopology.getTopologyData().devices.forEach(item => {
    if(item.tpType === 201) {
      if(item.connId1) Util.WaterTypeChangeOfIsNotWrite({
        type: 'line',
        tpId: item.connId1,
        waterType: 2,
        isMult: true
      })
      if(item.connId2) Util.WaterTypeChangeOfIsNotWrite({
        type: 'line',
        tpId: item.connId2,
        waterType: 1,
        isMult: true
      })
    }
  })

  // 三。自动纠正用户两侧管道的供回水类型: 如果口1管道是回，口2管道是供，则把两个管道换位置，其他情况不操作
  publicTopology.getTopologyData().devices.forEach(item => {
    if(item.tpType === 203) {
      const line1 = publicTopology.getTopologyData().lineMap[item.connId1 ?? ''];
      const line2 = publicTopology.getTopologyData().lineMap[item.connId2 ?? ''];
      if(line1.waterType === 2 && line2.waterType === 1) {
        // 管道另一端连接信息
        const line1OtherPortInfo = {
          portNum: item.connPort1 === 1? 2:1,
          deviceId: '',
          devicePort: 0,
        }
        line1OtherPortInfo.deviceId = line1['connId'+line1OtherPortInfo.portNum];
        line1OtherPortInfo.devicePort = line1['connPort'+line1OtherPortInfo.portNum];

        const line2OtherPortInfo = {
          portNum: item.connPort2 === 1? 2:1,
          deviceId: '',
          devicePort: 0,
        }
        line2OtherPortInfo.deviceId = line2['connId'+line2OtherPortInfo.portNum];
        line2OtherPortInfo.devicePort = line2['connPort'+line2OtherPortInfo.portNum];

        // 管道另一端连接信息对换
        const device1 = publicTopology.getTopologyData().deviceMap[line1OtherPortInfo.deviceId];
        const device2 = publicTopology.getTopologyData().deviceMap[line2OtherPortInfo.deviceId];

        device1['connId'+line1OtherPortInfo.devicePort] = line2.tpId;
        device1['connPort'+line1OtherPortInfo.devicePort] = line2OtherPortInfo.portNum;
        set(device1, 'userData.status.connChange', true)

        line2['connId'+line2OtherPortInfo.portNum] = device1.tpId;
        line2['connPort'+line2OtherPortInfo.portNum] = line1OtherPortInfo.devicePort;
        set(line2, 'userData.status.connChange', true)

        if(line2OtherPortInfo.portNum === 1) line2.latLng[0] = device1.latLng;
        else line2.latLng[line2.latLng.length - 1] = device1.latLng;
        set(line2, 'userData.status.move', true)

        line2.waterType = 2;
        set(line2, 'userData.status.attrChange', true)

        device2['connId'+line2OtherPortInfo.devicePort] = line1.tpId;
        device2['connPort'+line2OtherPortInfo.devicePort] = line1OtherPortInfo.portNum;
        set(device2, 'userData.status.connChange', true)

        line1['connId'+line1OtherPortInfo.portNum] = device2.tpId;
        line1['connPort'+line1OtherPortInfo.portNum] = line2OtherPortInfo.devicePort;
        set(line1, 'userData.status.connChange', true)

        if(line1OtherPortInfo.portNum === 1) line1.latLng[0] = device2.latLng;
        else line1.latLng[line1.latLng.length - 1] = device2.latLng;
        set(line1, 'userData.status.move', true)

        line1.waterType = 1;
        set(line1, 'userData.status.attrChange', true)
      }
    }
  })

  const rest = Util.CheckTopologyWaterType();

  if(rest) {
    Notice.message('修复成功')
  } else {
    Notice.message('自动修复失败，请自行手工修复')
  }

  param.renderDataHandle();
}