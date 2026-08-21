# 灼城 60 — v14.2.2 QA Stabilization

此分支為 Vercel QA 用乾淨基準版。

已修復：
- 地圖 render crash / 探索節點無反應
- 城市作業視窗關閉
- 音效 ON/OFF 事件
- 路線規劃與一般點擊模式分離
- Responsive layout 基礎修正

部署方式：Vercel 直接以專案根目錄作為靜態網站，不需要 build command。

此 QA 分支使用輕量佔位美術，只驗證互動、流程與 responsive；正式 2K 資產待 QA 通過後回補。