/*
 * @Author: Strayer
 * @Date: 2023-11-17
 * @LastEditors: Strayer
 * @LastEditTime: 2023-11-22
 * @Description: 
 * @FilePath: \heat-web\src\components\translateBox\js\contextmenu.ts
 */

import { MenuData, MenuDataItem } from '@/components/topologyPage/contextmenu/js';
import { ShallowRef, shallowRef, ref, Ref } from 'vue';
import { visible } from './data';
import { wheelType } from './wheel';

// 1.右键菜单数据
export const menuData: ShallowRef<MenuData> = shallowRef([])

// 2.右键菜单是否展示
export const menuShow = ref(false);

// 3.右键菜单坐标
export const menuPosition: Ref<[number, number]> = ref([100, 100] as [number, number])

/**
 * @description: 展示菜单并设置相关值
 * @param {array} position
 * @param {MenuData} data
 * @return {*}
 */
export function setContextmenuShow(position: [number, number], data: MenuData): void {
  menuShow.value = true;
  menuData.value = data;
  menuPosition.value = position;
}

// 阻止默认的菜单事件
export function contextmenuHandle(e: any) {
  e.preventDefault();

  const position: [number, number] = [e.layerX, e.layerY];

  const menuData: MenuData = [
    {
      label: '隐藏',
      key: 'hide',
    },
    {
      label: '鼠标缩放-无',
      key: 'wheelNone'
    },
    {
      label: '鼠标缩放-旋转',
      key: 'wheelRotate'
    },
    {
      label: '鼠标缩放-整体',
      key: 'wheelAll'
    },
    {
      label: '鼠标缩放-左右',
      key: 'wheelHorizontal'
    },
    {
      label: '鼠标缩放-上下',
      key: 'wheelVertical'
    },
  ];

  setContextmenuShow(position, menuData);
}

/**
 * @description: 4.右键菜单中点击某个菜单项
 * @param {MenuData} obj
 * @return {*}
 */
export function menuItemClick(obj: MenuDataItem): void {
  if(obj.key === 'hide') visible.value = false;
  else if(obj.key === 'wheelNone') wheelType.value = 'none';
  else if(obj.key === 'wheelRotate') wheelType.value = 'rotate';
  else if(obj.key === 'wheelAll') wheelType.value = 'all';
  else if(obj.key === 'wheelHorizontal') wheelType.value = 'horizontal';
  else if(obj.key === 'wheelVertical') wheelType.value = 'vertical';

  menuShow.value = false;
}