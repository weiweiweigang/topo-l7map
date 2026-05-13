/*
 * @Description: 获取编辑区域（L7 版本，使用 @antv/l7-draw DrawPolygon 实现圈选）
 * @FilePath: \heat-web\src\components\l7mapRender\draw\writeArea.ts
 */
import type { Scene } from '@antv/l7';
import { DrawPolygon, DrawEvent } from '@antv/l7-draw';
import Notice from '@/tools/notice';
import { coordToWebMercator } from '@/tools/tool/tool';

/** 当前 DrawPolygon 实例引用 */
let drawPolygonInstance: DrawPolygon | null = null;

/**
 * @description: 在 L7 地图上圈选编辑区域
 * @param {Scene} scene L7 Scene 实例
 * @return {Promise<string>} 圈选区域坐标字符串（JSON 格式，Web Mercator 坐标数组）
 */
function WriteArea(scene: Scene): Promise<string> {
  return new Promise((resolve, reject) => {
    try {
      // 如果已有 DrawPolygon 实例，先销毁
      if (drawPolygonInstance) {
        drawPolygonInstance.disable();
        drawPolygonInstance.clear();
        drawPolygonInstance.destroy();
        drawPolygonInstance = null;
      }

      // 创建 DrawPolygon 实例
      const drawer = new DrawPolygon(scene, {});
      drawPolygonInstance = drawer;

      // 监听绘制完成事件
      drawer.on(DrawEvent.Add, (newFeature: any) => {
        try {
          // 从 GeoJSON Polygon 中提取坐标环
          const coords: number[][] = newFeature.geometry.coordinates[0]; // [[lng, lat], ...]

          // 将经纬度坐标转为 Web Mercator 格式（与原 ArcGIS 版本保持兼容）
          const mercatorRings = coords.map(([lng, lat]) => {
            const [x, y] = coordToWebMercator([lng, lat]);
            return [x, y];
          });

          // 绘制完成后清除图形并销毁实例
          drawer.disable();
          drawer.clear();
          drawer.destroy();
          drawPolygonInstance = null;

          // l7-draw 的 disable() 内部会把 doubleClickZoom 恢复为 true，
          // 需要强制恢复为 false，防止双击结束圈选时触发地图缩放
          scene.setMapStatus({ doubleClickZoom: false });

          resolve(JSON.stringify(mercatorRings));
        } catch (error) {
          console.error(error);
          drawer.disable();
          drawer.clear();
          drawer.destroy();
          drawPolygonInstance = null;

          // 同上：强制保持 doubleClickZoom 为 false
          scene.setMapStatus({ doubleClickZoom: false });

          reject(error);
        }
      });

      // 开启绘制
      drawer.enable();
      // 确保禁用双击缩放（防止 DrawPolygon 内部状态切换导致意外开启）
      scene.setMapStatus({ doubleClickZoom: false });
      Notice.message('单击绘制节点，双击完成绘制', 'success');
    } catch (error) {
      console.error(error);
      Notice.message('获取编辑区域时遇到未知错误!', 'error');
      reject(error);
    }
  });
}

/** 当还没有开始画圈就点击结束编辑时 */
function EndWriteBeforeArea(scene: Scene): void {
  if (drawPolygonInstance) {
    drawPolygonInstance.disable();
    drawPolygonInstance.clear();
    drawPolygonInstance.destroy();
    drawPolygonInstance = null;
    // l7-draw 的 disable() 内部会把 doubleClickZoom 恢复为 true，强制恢复为 false
    scene.setMapStatus({ doubleClickZoom: false });
  }
}

export { WriteArea, EndWriteBeforeArea };
