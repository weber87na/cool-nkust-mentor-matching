const WS_URL = 'wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent';

let ws = null;
let configuredGeminiApiKey = "";
window.audioContext = null;
let mediaStream = null;
let sourceNode = null;
let processorNode = null;
window.nextPlayTime = 0;

let masterGain = null;
let delayNode = null;
let feedbackNode = null;
let echoVolumeNode = null;

const btnConnect = document.getElementById('btn-connect');
const btnDisconnect = document.getElementById('btn-disconnect');
const apiKeyInput = document.getElementById('api-key-input');
const statusText = document.getElementById('status-text');
const statusIndicator = document.getElementById('status-indicator');
const chatLog = document.getElementById('chat-log');
const apiKeyContainer = document.getElementById('api-key-container');
const subtitleDiv = document.getElementById('goddess-subtitle');

let currentSubtitle = "";
let floatingBuffer = "";
let subtitleTimeout = null;
let seniorCandidates = [];
let assignedSeniorName = "";

function compactPerson(person) {
  return {
    姓名: person && person.姓名 || "",
    生日: person && person.生日 || "",
    綽號: person && person.綽號 || "",
    照片: person && person.照片 || "",
    學長姐: person && person.學長姐 || "",
    龜鳥卦: Boolean(person && person.龜鳥卦)
  };
}

function seniorLabel(senior) {
  if (!senior) return "";
  return senior.綽號 ? `${senior.姓名}（${senior.綽號}）` : senior.姓名;
}

async function loadPairingContext() {
  let flow = null;
  try {
    if (window.FlowState && typeof window.FlowState.getState === "function") {
      flow = await window.FlowState.getState();
    } else {
      const response = await fetch("/api/state", { cache: "no-store" });
      if (response.ok) flow = await response.json();
    }
  } catch (error) {
    console.warn("無法讀取抽籤狀態，改讀靜態資料。", error);
  }

  if (flow) {
    const availableSeniors = Array.isArray(flow.availableSeniors) ? flow.availableSeniors : [];
    seniorCandidates = availableSeniors.map(compactPerson).filter((senior) => senior.姓名);
    return {
      currentStudent: flow.currentStudent ? compactPerson(flow.currentStudent) : null,
      students: Array.isArray(flow.students) ? flow.students.map(compactPerson) : [],
      seniors: Array.isArray(flow.seniors) ? flow.seniors.map(compactPerson) : [],
      availableSeniors: seniorCandidates,
      usedSeniorNames: flow.usedSeniorNames || [],
      presetPairs: flow.presetPairs || {}
    };
  }

  const [studentsResponse, seniorsResponse] = await Promise.all([
    fetch("../資料/學弟妹.json", { cache: "no-store" }),
    fetch("../資料/學長姐.json", { cache: "no-store" })
  ]);
  const students = await studentsResponse.json();
  const seniors = await seniorsResponse.json();
  seniorCandidates = seniors
    .filter((senior) => senior && senior.姓名 && !students.some((student) => student.學長姐 === senior.姓名))
    .map(compactPerson);
  return {
    currentStudent: null,
    students: students.map(compactPerson),
    seniors: seniors.map(compactPerson),
    availableSeniors: seniorCandidates,
    usedSeniorNames: [],
    presetPairs: {}
  };
}

async function assignSeniorFromText(text) {
  if (assignedSeniorName || !text || !seniorCandidates.length) return;

  const match = seniorCandidates.find((senior) => {
    const names = [senior.姓名, senior.綽號].filter(Boolean);
    return names.some((name) => text.includes(name));
  });
  if (!match || !window.FlowState || typeof window.FlowState.assignSenior !== "function") return;

  try {
    await window.FlowState.assignSenior(match.姓名, "鎖鏈殺手");
    assignedSeniorName = match.姓名;
    logMessage("system", `已將 ${match.姓名} 寫入目前學弟妹的配對結果。`);
  } catch (error) {
    logMessage("system", error.message || `無法寫入 ${match.姓名} 的配對結果。`);
  }
}

function showSubtitle(textChunk) {
  currentSubtitle += textChunk;
  
  // 呼叫 3D Canvas 字幕系統 (逐字發送)
  if (typeof window.spawnFloatingText === 'function') {
    window.spawnFloatingText(textChunk);
  }
  
  // 原本的 DOM 字幕保留作為備用或除錯，但透明度設為 0
  if (subtitleDiv) {
    subtitleDiv.textContent = currentSubtitle;
    subtitleDiv.style.opacity = 0; 
  }
  
  // 如果稍微停頓，就重置排版游標 (換行)
  clearTimeout(subtitleTimeout);
  subtitleTimeout = setTimeout(() => {
    if (typeof window.resetTextCursor === 'function') {
      window.resetTextCursor();
    }
    if (subtitleDiv) subtitleDiv.style.opacity = 0;
    setTimeout(() => { currentSubtitle = ""; }, 500);
  }, 1000);
}

function logMessage(role, text) {
  if (!chatLog) {
    console.log(`${role}: ${text}`);
    return;
  }
  chatLog.style.display = 'flex';
  const entry = document.createElement('div');
  entry.className = `log-entry ${role}`;
  entry.textContent = `${role === 'user' ? '你' : '女神'}: ${text}`;
  chatLog.appendChild(entry);
  chatLog.scrollTop = chatLog.scrollHeight;
}

function updateStatus(state, text) {
  if (!statusText || !statusIndicator) {
    console.log(`status:${state || "idle"}:${text}`);
    return;
  }
  statusText.textContent = text;
  statusIndicator.className = 'status-dot ' + state;
}

async function loadConfig() {
  const response = await fetch("config.json", { cache: "no-store" });
  if (!response.ok) throw new Error("無法讀取 鎖鏈殺手/config.json");
  const rawConfig = await response.text();
  const config = JSON.parse(rawConfig.replace(/^\s*\/\/.*$/gm, ""));
  configuredGeminiApiKey = String(config.geminiApiKey || config.apiKey || "").trim();
  if (!configuredGeminiApiKey) throw new Error("請在 鎖鏈殺手/config.json 填入 geminiApiKey");
  return configuredGeminiApiKey;
}

// 將 Base64 解碼並轉為 Float32 音訊陣列 (24kHz, 16-bit PCM)
function base64ToFloat32Array(base64) {
  const binaryString = window.atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  const int16Array = new Int16Array(bytes.buffer);
  const float32Array = new Float32Array(int16Array.length);
  for (let i = 0; i < int16Array.length; i++) {
    float32Array[i] = int16Array[i] / 32768.0;
  }
  return float32Array;
}

// 播放音訊
function playAudioChunk(base64Data) {
  if (!window.audioContext) return;
  const audioData = base64ToFloat32Array(base64Data);
  const audioBuffer = window.audioContext.createBuffer(1, audioData.length, 24000);
  audioBuffer.getChannelData(0).set(audioData);

  const source = window.audioContext.createBufferSource();
  source.buffer = audioBuffer;
  
  // 將音效源連接到主音量與回音節點
  source.connect(masterGain);
  source.connect(delayNode);

  if (window.nextPlayTime < window.audioContext.currentTime) {
    window.nextPlayTime = window.audioContext.currentTime + 0.1;
  }
  source.start(window.nextPlayTime);
  window.nextPlayTime += audioBuffer.duration;
  
  updateStatus('speaking', '女神講話中...');
}

// Float32 轉為 16-bit PCM (給 Gemini)
function floatTo16BitPCM(input) {
  const output = new Int16Array(input.length);
  for (let i = 0; i < input.length; i++) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return output;
}

// Int16Array 轉 Base64
function bufferToBase64(buffer) {
  let binary = '';
  const bytes = new Uint8Array(buffer.buffer);
  const len = bytes.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return window.btoa(binary);
}

async function startAudioCapture() {
  window.audioContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 24000 });
  window.nextPlayTime = window.audioContext.currentTime;

  // --- 設定 AI 科技感回音效果 (Delay & Feedback) ---
  masterGain = window.audioContext.createGain();
  masterGain.connect(window.audioContext.destination);

  delayNode = window.audioContext.createDelay();
  delayNode.delayTime.value = 0.25; // 延遲 250 毫秒，適度的空間感

  feedbackNode = window.audioContext.createGain();
  feedbackNode.gain.value = 0.25; // 降低衰減率，尾音較快散去

  echoVolumeNode = window.audioContext.createGain();
  echoVolumeNode.gain.value = 0.3; // 降低迴音音量，避免蓋過主音

  delayNode.connect(feedbackNode);
  feedbackNode.connect(delayNode);
  delayNode.connect(echoVolumeNode);
  echoVolumeNode.connect(masterGain);
  // ---------------------------------------------

  try {
    mediaStream = await navigator.mediaDevices.getUserMedia({
      audio: {
        channelCount: 1,
        sampleRate: 16000
      }
    });

    const captureContext = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 });
    sourceNode = captureContext.createMediaStreamSource(mediaStream);
    processorNode = captureContext.createScriptProcessor(2048, 1, 1);

    sourceNode.connect(processorNode);
    processorNode.connect(captureContext.destination);

    processorNode.onaudioprocess = (e) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) return;
      const inputData = e.inputBuffer.getChannelData(0);
      const pcm16 = floatTo16BitPCM(inputData);
      const base64Data = bufferToBase64(pcm16);

      const message = {
        realtimeInput: {
          audio: {
            mimeType: "audio/pcm;rate=16000",
            data: base64Data
          }
        }
      };
      ws.send(JSON.stringify(message));
    };

  } catch (err) {
    console.error('麥克風存取失敗', err);
    updateStatus('', '麥克風存取失敗');
    logMessage('system', '麥克風存取失敗！請確認：\n1. 網址開頭必須是 http://localhost 或 https://\n2. 瀏覽器允許麥克風權限。\n錯誤代碼: ' + err.message);
    disconnect();
  }
}

async function sendSetupMessage() {
  let pairingContext = {
    currentStudent: null,
    students: [],
    seniors: [],
    availableSeniors: [],
    usedSeniorNames: [],
    presetPairs: {}
  };
  try {
    pairingContext = await loadPairingContext();
  } catch(e) {
    console.error("無法讀取配對資料", e);
  }

  const currentStudentText = pairingContext.currentStudent
    ? `目前正在等待配對的學弟妹是：${pairingContext.currentStudent.姓名}（生日 ${pairingContext.currentStudent.生日 || "未知"}，綽號 ${pairingContext.currentStudent.綽號 || "無"}）。`
    : "目前尚未由抽抽樂選定學弟妹，請先提醒使用者回抽抽樂選定本輪學弟妹。";
  const availableSeniorNames = pairingContext.availableSeniors.map(seniorLabel).join("、") || "目前沒有可抽的學長姊";

  const promptText = `你現在是使用者心中的「念」（源自《獵人 Hunter x Hunter》的念能力），同時負責迎新活動的「直屬學長姊抽籤配對」。
請用沉穩、神祕且具備深刻洞察力的語氣，用繁體中文與面前的新生互動。
你的對話流程必須嚴格遵守以下步驟，一次只問一個問題，等待對方回答後再問下一個：
1. 對話開頭第一句話，請務必主動告訴對方：「我是你心中的念」。若已有目前學弟妹，直接點名確認；若沒有，請提醒對方先回抽抽樂。
2. 詢問對方的「生日與血型」（可暗示這與水見式或西索的性格分析有關）。
3. 得到回答後，詢問對方的「興趣與日常愛好」。
4. 蒐集完資料後，請「嚴格且僅限於」下列【本輪可抽學長姊】中，隨機挑選出真實存在於該名單內的一位學長姊，作為指導對方修行的直屬（絕對不可捏造名單外的人名，也不要選已使用或內定保留者）。
5. 隆重地宣布配對結果，務必完整說出該位學長姊的「姓名」，可同時說出綽號；系統會依你說出的姓名寫回配對結果。
6. 根據新生特質與這位學長姊，以念能力的六大系統（強化系、放出系、變化系、操作系、具現化系、特質系）給予一段專屬分析與修行祝福！

【目前學弟妹】：
${currentStudentText}

【本輪可抽學長姊】：
${availableSeniorNames}

【完整學弟妹資料，供你理解既有配對與目前名單】：
${JSON.stringify(pairingContext.students)}

【完整學長姊資料，供你參照生日、綽號、照片與標記】：
${JSON.stringify(pairingContext.seniors)}

注意：
1. 每次輪到你說話時，回答必須簡短有力，不超過三句話，保持念能力那種深不可測與無形具象的神秘感，絕不要一次把問題問完。
2. 絕對禁止在對話中使用「氣」這個字（包含真氣、氣息等）。描述生命能量時，請嚴格且唯一地使用「念」或「念能力」這個詞彙。
3. 宣布配對時，姓名必須完全照【本輪可抽學長姊】中的姓名輸出。`;

  const setupMessage = {
    setup: {
      model: "models/gemini-3.1-flash-live-preview",
      generationConfig: {
        responseModalities: ["AUDIO"],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: {
              voiceName: "Aoede" // 溫柔的女聲
            }
          }
        }
      },
      systemInstruction: {
        parts: [{
          text: promptText
        }]
      },
      outputAudioTranscription: {}
    }
  };
  ws.send(JSON.stringify(setupMessage));
}

function sendInitialGreeting() {
  ws.send(JSON.stringify({
    clientContent: {
      turns: [{ role: "user", parts: [{ text: "妳好" }] }],
      turnComplete: true
    }
  }));
}

async function connect() {
  const apiKey = configuredGeminiApiKey || (apiKeyInput && apiKeyInput.value.trim()) || await loadConfig();
  if (!apiKey) {
    logMessage('system', '請先在 config.json 填入 Gemini API Key。');
    return;
  }

  updateStatus('listening', '連線中...');
  
  const url = `${WS_URL}?key=${apiKey}`;
  ws = new WebSocket(url);

  ws.onopen = async () => {
    updateStatus('connected', '連線成功');
    if (apiKeyContainer) apiKeyContainer.style.display = 'none';
    if (btnConnect) btnConnect.style.display = 'none';
    if (btnDisconnect) btnDisconnect.style.display = 'block';
    logMessage('system', '連線至火焰領域...');

    await startAudioCapture();
    await sendSetupMessage();
  };

  ws.onmessage = (event) => {
    if (event.data instanceof Blob) {
      const reader = new FileReader();
      reader.onload = () => {
        const msg = JSON.parse(reader.result);
        if (msg.setupComplete) sendInitialGreeting();
        handleServerMessage(msg);
      };
      reader.readAsText(event.data);
    } else {
      const msg = JSON.parse(event.data);
      if (msg.setupComplete) sendInitialGreeting();
      handleServerMessage(msg);
    }
  };

  ws.onclose = (event) => {
    console.log("WebSocket Closed: ", event.code, event.reason);
    if (event.code !== 1000 && event.code !== 1005) {
      logMessage('system', `連線異常斷開 (代碼: ${event.code})。可能是 API Key 無效或網路問題。`);
    }
    disconnect();
  };

  ws.onerror = (err) => {
    console.error('WebSocket Error:', err);
    disconnect();
  };
}

function handleServerMessage(msg) {
  if (msg.serverContent) {
    // 1. 處理語音播放 (通常在 inlineData 中)
    if (msg.serverContent.modelTurn && msg.serverContent.modelTurn.parts) {
      for (let part of msg.serverContent.modelTurn.parts) {
        if (part.inlineData && part.inlineData.data) {
          playAudioChunk(part.inlineData.data);
        }
      }
    }
    
    // 2. 暴力破解法：遞迴搜尋整個 msg.serverContent 裡面所有的 "text" 欄位
    let textFound = "";
    function searchForText(obj) {
      if (typeof obj === 'string') return;
      if (Array.isArray(obj)) {
        obj.forEach(searchForText);
      } else if (typeof obj === 'object' && obj !== null) {
        for (let key in obj) {
          if (key === 'text' && typeof obj[key] === 'string') {
            textFound += obj[key];
          } else {
            searchForText(obj[key]);
          }
        }
      }
    }
    
    searchForText(msg.serverContent);
    
    if (textFound) {
      logMessage('ai', textFound);
      showSubtitle(textFound);
      assignSeniorFromText(textFound);
    }
  }
  
  if (msg.serverContent && msg.serverContent.turnComplete) {
    updateStatus('connected', '聆聽中...');
  }
}

function disconnect() {
  if (ws) {
    ws.close();
    ws = null;
  }
  if (mediaStream) {
    mediaStream.getTracks().forEach(track => track.stop());
    mediaStream = null;
  }
  if (processorNode) {
    processorNode.disconnect();
    processorNode = null;
  }
  if (sourceNode) {
    sourceNode.disconnect();
    sourceNode = null;
  }
  if (window.audioContext) {
    window.audioContext.close();
    window.audioContext = null;
  }

  if (apiKeyContainer) apiKeyContainer.style.display = 'flex';
  if (btnConnect) btnConnect.style.display = 'block';
  if (btnDisconnect) btnDisconnect.style.display = 'none';
  updateStatus('', '系統離線');
  logMessage('system', '連結已斷開。');
}

if (btnConnect) btnConnect.addEventListener('click', connect);
if (btnDisconnect) btnDisconnect.addEventListener('click', disconnect);
window.startGeminiPairing = connect;
window.chainKillerGeminiReady = false;

window.addEventListener('DOMContentLoaded', async () => {
  try {
    await loadConfig();
    window.chainKillerGeminiReady = true;
    logMessage('system', 'Gemini Key 已載入，等待鎖鏈擊破立方體。');
  } catch (error) {
    logMessage('system', error.message || 'Gemini 自動連線失敗。');
  }
});
