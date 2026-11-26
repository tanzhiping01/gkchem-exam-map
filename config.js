/* 站点配置：改动这里即可切换资源来源，不必动业务代码 */
(function () {
  "use strict";

  /* 原卷索引（题级 JSON：省|年|场次|题号 → 图片路径） */
  window.QMAP_URL = "assets/qmap/qmap.js";

  /* 原卷图片根地址。
     - 留空 ""：使用仓库内的 assets/y2426/（需先运行 scripts/fetch_assets.py 下载，约 157MB）
     - 填 URL：直接在线引用原站图片，仓库保持轻量（默认行为） */
  window.ASSET_BASE = "https://4m2mk8cmzus5x.doubao.link/app/app_17haxc9sspu/";
})();
