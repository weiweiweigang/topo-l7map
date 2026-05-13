import icon201 from '@/assets/img/device/201.svg';
import icon202 from '@/assets/img/device/202.svg';
import icon203 from '@/assets/img/device/203.svg';
import icon204 from '@/assets/img/device/204.svg';
import icon205 from '@/assets/img/device/205.svg';
import icon206 from '@/assets/img/device/206.svg';
import icon207 from '@/assets/img/device/207.svg';
import icon208 from '@/assets/img/device/208.svg';
import icon209 from '@/assets/img/device/209.svg';
import icon2090 from '@/assets/img/device/209-0.svg';
import icon210 from '@/assets/img/device/210.svg';
import icon211 from '@/assets/img/device/211.svg';
import icon212 from '@/assets/img/device/212.svg';
import icon213 from '@/assets/img/device/213.svg';
import icon214 from '@/assets/img/device/214.svg';
import icon215 from '@/assets/img/device/215.svg';
import icon216 from '@/assets/img/device/216.svg';
import icon217 from '@/assets/img/device/217.svg';
import icon218 from '@/assets/img/device/218.svg';
import icon219 from '@/assets/img/device/219.svg';
import icon221 from '@/assets/img/device/221.svg';
import icon222 from '@/assets/img/device/222.svg';
import icon3000 from '@/assets/img/device/3000.svg';
import icon30010 from '@/assets/img/device/3001-0.svg';
import icon30011 from '@/assets/img/device/3001-1.svg';
import icon3002 from '@/assets/img/device/3002.svg';
import icon3003 from '@/assets/img/device/3003.svg';

import { Scene } from '@antv/l7';

export function addShapeImg(scene: Scene) {
  scene.addImage('201', icon201);
  scene.addImage('202', icon202);
  scene.addImage('203', icon203);
  scene.addImage('204', icon204);
  scene.addImage('205', icon205);
  scene.addImage('206', icon206);
  scene.addImage('207', icon207);
  scene.addImage('208', icon208);
  scene.addImage('209', icon209);
  scene.addImage('209-0', icon2090); // 阀门-关闭状态
  scene.addImage('210', icon210);
  scene.addImage('211', icon211);
  scene.addImage('212', icon212);
  scene.addImage('213', icon213);
  scene.addImage('214', icon214);
  scene.addImage('215', icon215);
  scene.addImage('216', icon216);
  scene.addImage('217', icon217);
  scene.addImage('218', icon218);
  scene.addImage('219', icon219);
  scene.addImage('221', icon221); // 软表
  scene.addImage('222', icon222); // 校核点
  scene.addImage('3000', icon3000); // 气体平衡点
  scene.addImage('3001-0', icon30010); // 事件告警点-未处理
  scene.addImage('3001-1', icon30011); // 事件告警点-已处理
  scene.addImage('3002', icon3002); // 温度点
  scene.addImage('3003', icon3003); // 关阀策略检查点
}