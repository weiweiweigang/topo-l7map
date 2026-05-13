/**
 * @description: 颜色计算工具
 * @FilePath: \heat-web\src\components\l7render\utils\color.ts
 */
import ProjectConfig from '@/Data/projectConfig';
import { ConfigStore } from '@/store/config';
import type { TopologyLine, LongLine } from '@/dataModel/topologyType';

/**
 * @description: 获取隐藏管道颜色
 */
function getHideColor(): string {
  const configStoreObj = ConfigStore();
  let hideColor = ProjectConfig.mapTheme[configStoreObj.mapIndex].base.hideLineColor;
  if (!hideColor) {
    if (configStoreObj.mapIndex === 0) {
      hideColor = 'rgba(85,85,85, 0.4)';
    } else {
      hideColor = 'rgba(204,204,204, 0.4)';
    }
  }
  return hideColor;
}

/**
 * @description: 获取管道渲染颜色
 * @param line 管道数据
 * @returns 管道颜色
 */
export function getLineColor(line: TopologyLine): string {
  const configStoreObj = ConfigStore();

  // 管道颜色优先顺序： 自己的特定颜色 > 该内径类型的颜色 > (供回水类型) > 默认颜色

  // 1. 自己的特定颜色
  let shortColor: string | undefined = line.userData.color;

  // 2. 该内径类型的颜色
  if (!shortColor && ProjectConfig.lineInsideConfig.isStart) {
    const colorKey = configStoreObj.mapIndex === 0 ? 'blackColor' : 'whiteColor';
    shortColor = ProjectConfig.lineInsideConfigObj[line.insideKey ?? '']?.[colorKey];
  }

  // 3. 该供回水类型的管道颜色
  if (!shortColor && line.waterType === 1) {
    shortColor = ProjectConfig.mapTheme[configStoreObj.mapIndex].base.supplyLineColor;
  } else if (!shortColor && line.waterType === 2) {
    shortColor = ProjectConfig.mapTheme[configStoreObj.mapIndex].base.recoverLineColor;
  }

  // 4. 该供回水类型的管道颜色 - 无配置时使用默认主题
  if (!shortColor && line.waterType === 1) {
    shortColor = ProjectConfig.defaultMapTheme[configStoreObj.mapIndex].base.supplyLineColor;
  } else if (!shortColor && line.waterType === 2) {
    shortColor = ProjectConfig.defaultMapTheme[configStoreObj.mapIndex].base.recoverLineColor;
  }

  // 5. 默认颜色
  if (!shortColor) {
    shortColor = '#ff00ff';
  }

  // 隐藏管道返回灰色
  return line.userData.hid ? getHideColor() : shortColor;
}

/**
 * @description: 获取长管渲染颜色
 * L7不支持渐变色，因此采用取首尾子管颜色中较长者作为长管颜色
 * 如果所有子管都置灰则返回灰色
 */
export function getLongLineColor(item: LongLine): string {
  const children = item.userData.children;
  if (!children || children.length === 0) return '#ff00ff';

  // 如果所有子管都置灰，返回灰色
  if (children.every(c => c.userData.hid)) return getHideColor();

  // 取第一个非隐藏子管的颜色
  for (const child of children) {
    if (!child.userData.hid) return getLineColor(child);
  }

  return getLineColor(children[0]);
}

/**
 * @description: 获取长管渲染宽度
 */
export function getLongLineWidth(item: LongLine): number {
  const children = item.userData.children;
  if (!children || children.length === 0) return ProjectConfig.renderConfig.base.lineWidth;

  // 取子管的最大宽度
  let maxWidth = 0;
  for (const child of children) {
    const w = getLineWidth(child);
    if (w > maxWidth) maxWidth = w;
  }
  return maxWidth;
}

/**
 * @description: 获取管道渲染宽度
 * @param line 管道数据
 * @param doHasFlow 是否有流向动画
 * @param topologyKey 多拓扑标识
 * @returns 管道宽度
 */
export function getLineWidth(
  line: TopologyLine
): number {
  // 管道内径对应的宽度
  let lineInsideWidth: number | null = null;
  if (ProjectConfig.lineInsideConfig.isStart) {
    lineInsideWidth = ProjectConfig.lineInsideConfigObj[line.insideKey ?? '']?.width;
  }

  // 管道宽度自身可能设置了宽度
  const ownWidth = line.userData.width;

  let width = ownWidth ?? lineInsideWidth ?? ProjectConfig.renderConfig.base.lineWidth;

  // 如果存在选中数据
  if (line.userData.chose) {
    width = width * 2 + 2;
    // 清除选中标记
    Reflect.deleteProperty(line.userData, 'chose')
  }

  return width;
}

export const deviceHidColor = () => {
  const configStoreObj = ConfigStore()

  let hideColor = ProjectConfig.mapTheme[configStoreObj.mapIndex].base.hideLineColor;
  if(!hideColor) {
    if(configStoreObj.mapIndex === 0) hideColor = 'rgba(85,85,85, 0.4)';
    else hideColor = 'rgba(204,204,204, 0.4)'
  }
  return hideColor
}

/**
 * @description: 获取元件默认颜色
 * @param tpType 元件类型
 * @returns 元件颜色
 */
export function getDeviceColor(deviceObj: {
  tpType: number,
  onOff?: number,
  userData: {
    hid?: boolean,
    color?: string,
  }
}): string {
  const configStoreObj = ConfigStore()

  // 隐藏的元件返回灰色
  if(deviceObj.userData.hid) return deviceHidColor();

  // 元件自定义颜色
  if(deviceObj.userData.color) return deviceObj.userData.color;

  // 统一配置的颜色
  let color = ProjectConfig.mapTheme[configStoreObj.mapIndex].device.color[deviceObj.tpType];
  if(!color) color = '#ff00ff';

  // 阀门-关闭状态
  if(deviceObj.tpType === 209 && deviceObj.onOff === 0) 
    color = ProjectConfig.mapTheme[configStoreObj.mapIndex].device.valveOffColor;

  return color;
}

/**
 * @description: 获取元件尺寸
 * @param userData 元件用户数据
 * @returns 元件尺寸 [width, height]
 */
export function getDeviceSize(userData?: Record<string, any>): [number, number] {
  const defaultWidth = ProjectConfig.renderConfig.base.deviceWidth;
  const defaultHeight = ProjectConfig.renderConfig.base.deviceHeight;

  return [
    userData?.width ?? defaultWidth,
    userData?.height ?? defaultHeight,
  ];
}

/**
 * @description: 获取校核点颜色
 * @param userData 校核点用户数据
 * @returns 校核点颜色
 */
export function getCheckPointColor(userData?: Record<string, any>): string {
  // 根据校核点类型或状态返回不同颜色
  if (userData?.status === 'error') {
    return '#ff0000';
  }
  if (userData?.status === 'warning') {
    return '#ff9900';
  }
  return '#00ff00';
}

/**
 * @description: 获取软表颜色
 * @returns 软表颜色
 */
export function getSoftMeterColor(): string {
  const configStoreObj = ConfigStore();
  return ProjectConfig.mapTheme[configStoreObj.mapIndex].device.color['softMeter'] ?? '#3399ff';
}

/**
 * @description: 获取事件告警颜色
 * @param alarmLevel 告警级别
 * @returns 告警颜色
 */
export function getAlarmColor(alarmLevel?: number): string {
  switch (alarmLevel) {
  case 1:
    return '#ffcc00'; // 黄色告警
  case 2:
    return '#ff9900'; // 橙色告警
  case 3:
    return '#ff0000'; // 红色告警
  default:
    return '#ffcc00';
  }
}

/**
 * @description: 获取温度渐变色
 * @param temperature 温度值
 * @returns 对应颜色
 */
export function getTemperatureColor(temperature: number): string {
  // 温度渐变色映射
  if (temperature < 0) return '#0000ff'; // 蓝色 - 低温
  if (temperature < 20) return '#00ffcc'; // 青色
  if (temperature < 40) return '#00ff00'; // 绿色
  if (temperature < 60) return '#ffff00'; // 黄色
  if (temperature < 80) return '#ff9900'; // 橙色
  return '#ff0000'; // 红色 - 高温
}