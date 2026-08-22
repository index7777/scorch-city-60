# 灼城 60 — v14.3.0 Resident Perspective RC

這個分支是「你只是耐熱屋居民」重設計的 release candidate。

## 核心方向
- 玩家不是全城管理者，只能依廣播、親眼觀察與有來源的傳聞做決策。
- Day 1–29 夜晚逐段縮短；Day 30 起進入 100°C 永晝；Day 60 是公開期限。
- 生存狀態包含水分、飽足、體力、健康與體溫；錯誤決策可以直接死亡。
- 水分成飲用與降溫預留；緊急挪用飲用水必須明確允許。
- 電力以實際 kWh 計算；工具、製冷背包與居民儲能分開追蹤。
- 遠征、載具與大型搬運共用同一套 authoritative transport profile，包含速度、重量、容積、燃料、AC 與 Day 30+ 熱負荷。
- 未知地點不洩漏真實名稱、人物、人口、物資或大型物件資訊。
- Disabled actions 會直接顯示原因與下一步；資訊來源使用正式 broadcast / observed / rumor 圖示，不使用 emoji。

## QA 狀態
目前 release gate 包含：
- Static checks
- Rendered Chromium browser smoke
- Day 1→60 long-path
- Day 29→30 永晝邊界
- Legacy save migration
- Survival death / field exposure / cooling-pack depletion
- Water dual-use
- Electricity no-power / tool runtime / shared 0.25 kW shelter budget
- Car / truck / fuel / AC / cargo weight-volume
- Large-object hauling manpower / time / fuel / cooling
- Fog-of-war / source provenance / disabled-action foreground warnings

## 執行
純靜態瀏覽器遊戲，不需要 build command。從專案根目錄啟動靜態 HTTP server 即可。

GitHub Pages 正式站由 `main` 分支部署；本 RC 分支在 PR 通過並明確核准 merge 前不會更新正式站。

## Release 注意事項
- 保留舊存檔 migration。
- 不使用全域縮放處理 responsive；桌面維持三欄優先，小螢幕重排。
- 音訊只使用 ambience / Foley / 機械環境聲，不使用電子嗶聲、arcade 或 chiptune。
- PR merge 前必須再次確認 Static + Browser Smoke 全綠。
