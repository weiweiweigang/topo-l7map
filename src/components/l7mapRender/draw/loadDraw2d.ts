/*
 * @Description: 延迟加载 draw2d.js，避免 AMD/dojo loader 的 multipleDefine 冲突
 * @FilePath: \heat-web\src\components\l7mapRender\draw\loadDraw2d.ts
 */

let draw2dLoaded = false;

/**
 * 延迟加载 draw2d.js。
 * 在加载前临时屏蔽全局 AMD define/require，防止与 dojo loader 冲突导致 multipleDefine 错误。
 * 加载完成后恢复 AMD 环境。
 */
export function loadDraw2d(): Promise<void> {
  if (draw2dLoaded) return Promise.resolve();
  return new Promise((resolve, reject) => {
    // 检查是否已经通过其他方式加载过 draw2d
    if ((window as any).draw2d) {
      draw2dLoaded = true;
      resolve();
      return;
    }

    // 临时屏蔽全局 AMD define/require，防止 dojo loader 的 multipleDefine 错误
    const _define = (window as any).define;
    const _require = (window as any).require;
    delete (window as any).define;
    delete (window as any).require;

    const script = document.createElement('script');
    script.type = 'text/javascript';
    script.src = '/static/js/draw2d.js';
    script.onload = () => {
      // 恢复 AMD 环境
      if (_define !== undefined) (window as any).define = _define;
      if (_require !== undefined) (window as any).require = _require;
      draw2dLoaded = true;
      resolve();
    };
    script.onerror = () => {
      // 恢复 AMD 环境
      if (_define !== undefined) (window as any).define = _define;
      if (_require !== undefined) (window as any).require = _require;
      reject(new Error('draw2d.js 加载失败'));
    };
    document.body.append(script);
  });
}
