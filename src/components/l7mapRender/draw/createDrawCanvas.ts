/*
 * @Description: 创建可编辑画布（L7 版本）
 * @FilePath: \heat-web\src\components\l7mapRender\draw\createDrawCanvas.ts
 */
import type { Scene } from '@antv/l7';
import Notice from '@/tools/notice';
import createL7DrawLayer, { bindSceneToOverlay, destroyL7DrawLayer } from './l7AndDraw2d';
import Draw2dManagerL7 from './draw2dManager';
import DevicesModel, { PortColor } from '@/dataModel/deviceModel';
import { loadDraw2d } from './loadDraw2d';

/** draw2dManager 单例，模块内部管理，不挂载到 window */
let draw2dManagerInstance: Draw2dManagerL7 | null = null;

/** 获取 draw2dManager 实例（供外部模块使用） */
export function getDraw2dManager(): Draw2dManagerL7 | null {
  return draw2dManagerInstance;
}

/** 创建可编辑的 draw2d 画布，绑定到 L7 地图 */
export default function CreateDrawCanvas(scene: Scene): Promise<any> {
  return new Promise((resolve, reject) => {
    // 先确保 draw2d.js 加载完成
    loadDraw2d()
      .then(() => {
        // 如果因为某些 bug 导致图层残留，先清除
        const oldOverlay = document.getElementById('l7-draw2d-overlay');
        if (oldOverlay) oldOverlay.remove();

        createL7DrawLayer(scene)
          .then(({ canvas, overlay }) => {
            // 绑定 Scene 到 overlay，供内部事件使用
            bindSceneToOverlay(scene);

            // 创建 draw2dManager 实例
            draw2dManagerInstance = new Draw2dManagerL7(scene);
            draw2dManagerInstance.setCanvas(canvas);

            // 将 draw2dManager 实例挂载到 window.draw2d 上（兼容 draw2d.js 内部引用）
            if (!(window as any).draw2d) (window as any).draw2d = {} as any;
            (window as any).draw2d.draw2dManager = draw2dManagerInstance;

            // 初始化 draw2d 环境所需的配置（原 writeArea.ts 中的初始化逻辑迁移至此）
            initDraw2dEnvironment();

            // 安装画布编辑策略
            canvas.installEditPolicy(new (window as any).draw2d.policy.canvas.PanningSelectionPolicy());
            createConnectionVertexRouter(canvas);

            if (canvas.getSelection().all > 0) {
              console.log('待测试，未知用途的错误');
            }

            // 禁用地图双击缩放（防止双击 draw2d 元件时地图放大）
            scene?.setMapStatus({ doubleClickZoom: false });

            resolve([canvas, overlay]);
          })
          .catch((error) => {
            console.log(error);
            Notice.message('添加可编辑图层时遇到未知错误!', 'error');
            reject(error);
          });
      })
      .catch((error) => {
        console.error('draw2d.js 加载失败', error);
        reject(error);
      });
  });
}

/** 销毁可编辑画布 */
export function DestroyDrawCanvas(scene: Scene) {
  destroyL7DrawLayer(scene);
  draw2dManagerInstance = null;
}

/**
 * @description: 初始化 draw2d 运行环境（元件模型、端口颜色、图标构造函数等）
 * 从 writeArea.ts 迁移至此，使 writeArea 只负责圈选，draw2d 初始化在创建画布时统一完成
 */
function initDraw2dEnvironment(): void {
  // 传入元件模型
  (window as any).draw2d.deviceTypes = DevicesModel.model;
  // 传入元件端口颜色配置
  (window as any).draw2d.customPortColor = PortColor;
  // 传入 element 的 notice 封装
  (window as any).draw2d.notice = Notice;
  // 根据元件数据模型生成每一个元件的构造函数
  // 覆盖 draw2d 默认的 createShapeIcon：item.svg 现在是 PNG 图片 URL，
  // 原实现用 paper.path() 无法渲染，改用 paper.image()
  (window as any).draw2d.createShapeIcon = (deviceTypes: any[]) => {
    for (const item of deviceTypes) {
      const Icon = (window as any).draw2d.shape.icon.Icon;
      (window as any).draw2d.shape.icon['mlight' + item.id] = Icon.extend({
        NAME: 'draw2d.shape.icon.mlight' + item.id,
        init: function (attr: any, setter: any, getter: any) {
          const extendFn = (window as any).extend || Object.assign;
          this._super(extendFn({ width: item.width, height: item.height }, attr), setter, getter);
          this.type = item.id;
        },
        createSet: function () {
          const set = this.canvas.paper.set();
          const img = this.canvas.paper.image(
            item.svg,
            0,
            0,
            item.width,
            item.height
          );
          set.push(img);
          return set;
        },
      });
    }
  };
  (window as any).draw2d.createShapeIcon(DevicesModel.model);
  // 生成元件的端口构造函数
  (window as any).draw2d.createLayoutLocator(DevicesModel.model);
}

function createConnectionVertexRouter(canvas: any): any {
  const router = new (window as any).draw2d.layout.connection.VertexRouter();
  canvas.installEditPolicy(
    new (window as any).draw2d.policy.connection.DragConnectionCreatePolicy({
      createConnection: function (sourcePort: any, targetPort: any) {
        const conn = new (window as any).draw2d.Connection({
          router: router,
          color: '#1890ff',
          radius: 20,
          'stroke-width': 3,
          source: sourcePort,
          target: targetPort,
        });
        conn.type = 'line'; // 需要和 draw2d 里面的 NAME: "draw2d.Connection" 的 type 一致
        conn.installEditPolicy(new (window as any).draw2d.policy.line.VertexSelectionFeedbackPolicy());
        return conn;
      },
    })
  );
}
