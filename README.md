# 互動抽籤房間網站

這是一組本機使用的互動抽籤網頁。主持人從入口進入不同房間，先抽出本輪學弟妹，再用水晶球、吃角子老虎、刮刮樂、龜鳥卦或月老廟抽出學長姐，系統會把配對結果寫回 `資料/學弟妹.json`。

## 啟動方式

請從此資料夾啟動本機服務，不要直接雙擊 HTML，因為網站需要 API 才能讀寫 JSON。

```powershell
cd C:\Users\weberchang\Desktop\整合
python server.py 8000
```

看到類似以下訊息後，代表服務已啟動：

```text
Serving C:\Users\weberchang\Desktop\整合 at http://127.0.0.1:8000/入口/index.html
```

用瀏覽器開啟：

```text
http://127.0.0.1:8000/入口/index.html
```

若要停止服務，在啟動服務的終端機按 `Ctrl + C`。

## 活動流程

1. 從入口進入 `抽抽樂`。
2. 抽出或指定一位學弟妹，該人會成為本輪目前學弟妹。
3. 回大廳進入任一學長姐房間：
   - `水晶球`
   - `吃角子老虎`
   - `刮刮樂`
   - `龜鳥卦`
   - `月老廟`
4. 房間抽出學長姐後，會寫入 `資料/學弟妹.json` 中該學弟妹的 `學長姐` 欄位。
5. 已被抽走的學長姐會從其他房間的可抽名單中排除。

## 房間說明

- `入口`：3D 大廳，點選房間進入各遊戲。
- `抽抽樂`：抽本輪學弟妹；已抽過或已配對的學弟妹不會出現在可選名單。下方 panel 會顯示已抽學弟妹與配對學長姐照片。
- `水晶球`：抽可用學長姐，結果產生後自動寫入配對。
- `吃角子老虎`：保留淘汰感的快速老虎機，最多 8 回合保底開獎。
- `刮刮樂`：只有其中一格是真正學長姐，其餘是趣味提示；刮到真名後寫入配對。
- `龜鳥卦`：進入後自動從 `學長姐.json` 中 `龜鳥卦: true` 且尚未被選走的人隨機挑一位，直接播放同名影片；影片結束後才揭曉姓名。
- `月老廟`：先用 webcam 偵測 100、500 或 1000 元香油錢；偵測成功後啟動 LiveAvatar 月老數字人問答，最多 3 分鐘，最後從剩餘學長姐中抽出 1 位並寫入配對。

## 月老設定

月老房間需要連線 Roboflow 與 LiveAvatar。設定檔在：

```text
月老/config.json
```

請把裡面的佔位文字換成正式設定：

- `roboflow.apiKey`：Roboflow API key。
- `roboflow.workspace`：例如 `weber87na`。
- `roboflow.workflowId`：例如 `general-segmentation-api`；若不用 workflow，可改填 `modelId`。
- `roboflow.classes`：可通過的鈔票類別名稱。只要偵測到其中一個就會進入月老環節。
- `liveAvatar.apiKey`：LiveAvatar API key。
- `liveAvatar.sessionEndpoint`：LiveAvatar Full SDK 建立 session/token 的 API endpoint。
- `liveAvatar.sdkUrl`：月老頁載入的前端 SDK bundle。目前使用本機檔案 `liveavatar-bundle.js`。
- `liveAvatar.avatarId`、`agentId`、`contextId`、`voiceId`：依 LiveAvatar 後台設定填入；不需要的欄位可留空。
- `liveAvatar.agentsByAmount`：不同香油錢面額使用不同 voice agent。現在設定為 100 元 1 題、500 元 2 題、1000 元 3 題。
- `liveAvatar.incenseAgent`：點香效果使用的 voice agent，目前為 `8e6ed426-8154-4042-aa07-1ee100717468`。

金鑰只會由 `server.py` 讀取，不會直接寫進瀏覽器前端。活動現場需要能連線到 Roboflow 與 LiveAvatar。

若需要重打 LiveAvatar 前端 bundle，先安裝 npm 依賴，再執行：

```powershell
npm install
npm run build:liveavatar
```

## 資料檔

正式資料放在：

```text
資料/學弟妹.json
資料/學長姐.json
資料/抽籤狀態.json
```

備份原始資料放在：

```text
資料備份/學弟妹原始.json
資料備份/學長姐原始.json
```

`學弟妹.json` 的 `學長姐` 欄位會被配對流程更新。`抽籤狀態.json` 保存目前學弟妹與本輪已抽過的學長姐。

## 全部重來

在 `抽抽樂` 點選 `全部重來` 會：

- 將 `資料備份/學弟妹原始.json` 複製回 `資料/學弟妹.json`
- 將 `資料備份/學長姐原始.json` 複製回 `資料/學長姐.json`
- 清空 `資料/抽籤狀態.json`
- 重新載入抽抽樂名單與配對 panel

這會清除目前所有配對結果。

## API

本機服務由 `server.py` 提供：

- `GET /api/state`：讀取學弟妹、學長姐、目前學弟妹、可抽學長姐與已抽名單。
- `POST /api/current-student`：設定或清除目前學弟妹。
- `POST /api/assign-senior`：將學長姐寫入目前學弟妹的 `學長姐` 欄位。
- `POST /api/reset-data`：從 `資料備份` 還原正式資料。
- `POST /api/yuelao/detect-money`：接收 webcam 截圖並轉送 Roboflow 辨識香油錢。
- `POST /api/yuelao/session`：由後端讀取 `月老/config.json`，建立 LiveAvatar session/token。
- `GET /api/yuelao/config-status`：檢查月老設定是否存在，不回傳金鑰。

## 常見問題

如果頁面顯示無法讀取抽籤狀態，通常是沒有用 `python server.py 8000` 啟動服務，或不是從 `http://127.0.0.1:8000/入口/index.html` 開啟。

如果 8000 port 被占用，可以改用其他 port：

```powershell
python server.py 8080
```

然後開啟：

```text
http://127.0.0.1:8080/入口/index.html
```
