let characters = [];

const winningLines = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6],
];
const maxTurns = 5;
const eliminationDelay = 140;
const reelTimings = {
  firstColumn: 520,
  secondColumn: 180,
  thirdColumn: 140,
  settle: 90,
};

const elements = {
  grid: document.querySelector("#reel-grid"),
  remainingList: document.querySelector("#remaining-list"),
  eliminatedList: document.querySelector("#eliminated-list"),
  remainingCount: document.querySelector("#remaining-count"),
  eliminatedCount: document.querySelector("#eliminated-count"),
  turnCount: document.querySelector("#turn-count"),
  status: document.querySelector("#game-status"),
  spin: document.querySelector("#spin-button"),
  soundToggle: document.querySelector("#sound-toggle"),
  restart: document.querySelector("#restart-button"),
  modal: document.querySelector("#winner-modal"),
  winnerPortrait: document.querySelector("#winner-portrait"),
  winnerName: document.querySelector("#winner-name"),
  winnerCopy: document.querySelector("#winner-copy"),
  payline: document.querySelector("#payline"),
};

let state = {};
let audioContext;
let soundEnabled = true;
let canAssignSenior = false;
const spinAudio = document.querySelector("#spin-audio");
const lockAudio = document.querySelector("#lock-audio");
const spinSoundRange = { start: 3, end: 6 };
const spinAudioVolume = 0.8;
spinAudio.loop = false;
spinAudio.volume = spinAudioVolume;
lockAudio.volume = 0.9;
spinAudio.addEventListener("timeupdate", () => {
  if (spinAudio.currentTime >= spinSoundRange.end) {
    spinAudio.pause();
    spinAudio.currentTime = spinSoundRange.start;
  }
});

function getAudioContext() {
  if (!audioContext) audioContext = new AudioContext();
  if (audioContext.state === "suspended") audioContext.resume();
  return audioContext;
}

function playTone(frequency, duration, { type = "square", volume = 0.035, delay = 0, glideTo } = {}) {
  if (!soundEnabled) return;
  const context = getAudioContext();
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const start = context.currentTime + delay;
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  if (glideTo) oscillator.frequency.exponentialRampToValueAtTime(glideTo, start + duration);
  gain.gain.setValueAtTime(0.0001, start);
  gain.gain.exponentialRampToValueAtTime(volume, start + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(gain).connect(context.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.03);
}

function startSpinSound() {
  stopSpinSound();
  if (!soundEnabled) return;
  spinAudio.currentTime = spinSoundRange.start;
  spinAudio.play().catch(() => {
    // 瀏覽器拒絕播放時維持靜音，不影響遊戲流程。
  });
}

function stopSpinSound() {
  spinAudio.pause();
  spinAudio.currentTime = spinSoundRange.start;
}

function playReelLockSound(column) {
  // 每一欄停輪時，先壓低轉輪聲，讓金屬卡榫聲清楚浮出來。
  spinAudio.volume = 0.24;
  window.setTimeout(() => {
    if (!spinAudio.paused && soundEnabled) spinAudio.volume = spinAudioVolume;
  }, 150);
  if (!soundEnabled) return;
  lockAudio.currentTime = 0;
  lockAudio.play().catch(() => {
    // 音檔暫時無法播放時維持靜音，不影響遊戲流程。
  });
}

function playMatchSound() {
  [659.25, 783.99, 1046.5].forEach((frequency, index) => {
    playTone(frequency, 0.16, { type: "triangle", volume: 0.075, delay: index * 0.08 });
  });
}

function playWinnerSound() {
  [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
    playTone(frequency, 0.22, { type: "triangle", volume: 0.07, delay: index * 0.11 });
  });
}

function updateSoundToggle() {
  elements.soundToggle.setAttribute("aria-pressed", String(soundEnabled));
  elements.soundToggle.textContent = soundEnabled ? "🔊 音效開" : "🔇 音效關";
}

function randomItem(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function randomBoard(pool) {
  return Array.from({ length: 9 }, () => randomItem(pool));
}

function characterImage(character, className = "") {
  const image = document.createElement("img");
  image.src = character.image;
  image.alt = `${character.name} 的角色插畫`;
  image.className = className;
  image.addEventListener("error", () => {
    image.remove();
  }, { once: true });
  return image;
}

function cardElement(character, type, index) {
  const card = document.createElement("div");
  card.className = type === "reel" ? "reel-card" : "roster-card";
  card.dataset.name = character.name;
  if (typeof index === "number") card.dataset.index = index;
  card.append(characterImage(character));
  const name = document.createElement("span");
  name.className = "name";
  name.textContent = character.name;
  card.append(name);
  return card;
}

function renderRoster(eliminatingNames = []) {
  const eliminatingSet = new Set(Array.isArray(eliminatingNames) ? eliminatingNames : [eliminatingNames].filter(Boolean));
  elements.remainingList.replaceChildren(...state.remaining.map((character) => {
    const card = cardElement(character, "roster");
    if (eliminatingSet.has(character.name)) card.classList.add("eliminating");
    return card;
  }));
  elements.eliminatedList.replaceChildren(...state.eliminated.map((character) => cardElement(character, "roster")));
  elements.remainingCount.textContent = state.remaining.length;
  elements.eliminatedCount.textContent = state.eliminated.length;
}

function eliminationCountFor(size) {
  if (size >= 25) return 5;
  if (size >= 13) return 4;
  if (size >= 7) return 3;
  if (size >= 4) return 2;
  return 1;
}

function takeEliminatedBatch() {
  const count = Math.min(eliminationCountFor(state.remaining.length), Math.max(0, state.remaining.length - 1));
  const pool = [...state.remaining];
  const batch = [];
  for (let index = 0; index < count; index += 1) {
    const selectedIndex = Math.floor(Math.random() * pool.length);
    batch.push(pool.splice(selectedIndex, 1)[0]);
  }
  return batch;
}

function namesSummary(characters) {
  const names = characters.map((character) => character.name);
  if (names.length <= 3) return names.join("、");
  return `${names.slice(0, 3).join("、")} 等 ${names.length} 位`;
}

function renderBoard(board = state.board, spinning = false, settling = false) {
  elements.grid.classList.toggle("is-spinning", spinning);
  elements.grid.classList.toggle("is-settling", settling);
  elements.grid.replaceChildren(...board.map((character, index) => {
    const card = cardElement(character, "reel", index);
    return card;
  }));
}

function renderRollingBoard(finalBoard, activeColumns, pool) {
  elements.grid.classList.add("is-spinning");
  elements.grid.classList.remove("is-settling");
  const children = [];
  for (let column = 0; column < 3; column += 1) {
    if (activeColumns.includes(column)) {
      const columnElement = document.createElement("div");
      columnElement.className = "reel-column";
      columnElement.style.gridColumn = String(column + 1);
      const track = document.createElement("div");
      track.className = "roller-track";
      const strip = Array.from({ length: 7 }, () => randomItem(pool));
      [...strip, ...strip].forEach((character) => track.append(cardElement(character, "reel")));
      columnElement.append(track);
      children.push(columnElement);
      continue;
    }

    for (let row = 0; row < 3; row += 1) {
      const index = row * 3 + column;
      const card = cardElement(finalBoard[index], "reel", index);
      card.style.gridColumn = String(column + 1);
      card.style.gridRow = String(row + 1);
      children.push(card);
    }
  }
  elements.grid.replaceChildren(...children);
}

function findWinningLines(board) {
  return winningLines.filter((line) => line.every((index) => board[index].name === board[line[0]].name));
}

function clearWinningLine() {
  elements.grid.querySelectorAll(".winner").forEach((card) => card.classList.remove("winner"));
  elements.payline.classList.remove("show");
}

function showWinningLine(line) {
  line.forEach((index) => elements.grid.querySelector(`[data-index="${index}"]`)?.classList.add("winner"));
  const grid = elements.grid.getBoundingClientRect();
  const first = elements.grid.querySelector(`[data-index="${line[0]}"]`).getBoundingClientRect();
  const last = elements.grid.querySelector(`[data-index="${line[2]}"]`).getBoundingClientRect();
  const x1 = first.left + first.width / 2 - grid.left;
  const y1 = first.top + first.height / 2 - grid.top;
  const x2 = last.left + last.width / 2 - grid.left;
  const y2 = last.top + last.height / 2 - grid.top;
  const width = Math.hypot(x2 - x1, y2 - y1);
  const angle = Math.atan2(y2 - y1, x2 - x1) * (180 / Math.PI);
  Object.assign(elements.payline.style, { left: `${x1}px`, top: `${y1 - 4}px`, width: `${width}px`, transform: `rotate(${angle}deg)` });
  elements.payline.classList.add("show");
}

function finishGame(winner, reason) {
  state.finished = true;
  elements.spin.disabled = true;
  elements.winnerPortrait.replaceChildren(characterImage(winner));
  elements.winnerName.textContent = winner.name;
  elements.winnerCopy.textContent = reason;
  window.setTimeout(() => { elements.modal.hidden = false; elements.modal.focus(); }, 320);
  FlowState.assignSenior(winner.name, "吃角子老虎").then(() => {
    elements.winnerCopy.textContent = `${reason} 已寫入目前學弟妹的配對結果。`;
  }).catch((error) => {
    elements.winnerCopy.textContent = error.message;
    elements.status.textContent = error.message;
  });
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function spin() {
  if (state.spinning || state.finished) return;
  state.spinning = true;
  elements.spin.disabled = true;
  if (soundEnabled) getAudioContext();
  clearWinningLine();

  const eliminatedBatch = takeEliminatedBatch();
  const eliminatedNames = eliminatedBatch.map((character) => character.name);
  elements.status.textContent = `本回合淘汰：${namesSummary(eliminatedBatch)}，命運轉盤轉動中…`;
  renderRoster(eliminatedNames);
  await wait(eliminationDelay);

  const eliminatedSet = new Set(eliminatedNames);
  state.remaining = state.remaining.filter((character) => !eliminatedSet.has(character.name));
  state.eliminated.unshift(...eliminatedBatch);
  state.turn += 1;
  elements.turnCount.textContent = state.turn;
  renderRoster();

  if (state.remaining.length === 1) {
    const [winner] = state.remaining;
    state.board = Array(9).fill(winner);
    renderBoard(state.board, true);
    elements.status.textContent = `只剩 ${winner.name}！今晚的幸運角色已誕生。`;
    await wait(360);
    state.winningLine = [0, 4, 8];
    showWinningLine(state.winningLine);
    playWinnerSound();
    finishGame(winner, "淘汰到最後仍屹立不搖，直接成為今晚主角！");
    state.spinning = false;
    return;
  }

  state.board = await spinReels(state.remaining);
  const lines = findWinningLines(state.board);
  if (lines.length) {
    const candidates = [...new Map(lines.map((line) => {
      const character = state.board[line[0]];
      return [character.name, character];
    })).values()];
    const winner = randomItem(candidates);
    state.winningLine = randomItem(lines.filter((line) => state.board[line[0]].name === winner.name));
    showWinningLine(state.winningLine);
    playMatchSound();
    const multipleLineMessage = lines.length > 1
      ? `同時出現 ${lines.length} 條連線，隨機抽出 ${winner.name}！`
      : `三連線！${winner.name} 就是今晚的幸運角色！`;
    elements.status.textContent = multipleLineMessage;
    const winnerCopy = lines.length > 1
      ? `本局同時出現 ${lines.length} 條連線，從連線角色中隨機選出你！`
      : "三張角色卡連成一線，幸運角子就是你！";
    finishGame(winner, winnerCopy);
  } else if (state.turn >= maxTurns) {
    const winner = randomItem(state.remaining);
    state.board = Array(9).fill(winner);
    renderBoard(state.board, false, true);
    state.winningLine = [0, 4, 8];
    showWinningLine(state.winningLine);
    playWinnerSound();
    elements.status.textContent = `第 ${maxTurns} 回合保底開獎，${winner.name} 成為本輪幸運學長姐！`;
    finishGame(winner, `轉盤已跑滿 ${maxTurns} 回合，從剩餘名單中保底抽出你！`);
  } else {
    elements.status.textContent = `本回合沒有三連線。剩下 ${state.remaining.length} 位角色，再轉一次！`;
    elements.spin.disabled = false;
  }
  state.spinning = false;
}

function spinReels(pool) {
  const finalBoard = randomBoard(pool);
  return (async () => {
    startSpinSound();
    renderRollingBoard(finalBoard, [0, 1, 2], pool);
    await wait(reelTimings.firstColumn);
    renderRollingBoard(finalBoard, [1, 2], pool);
    playReelLockSound(0);
    await wait(reelTimings.secondColumn);
    renderRollingBoard(finalBoard, [2], pool);
    playReelLockSound(1);
    await wait(reelTimings.thirdColumn);
    renderBoard(finalBoard, false, true);
    stopSpinSound();
    playReelLockSound(2);
    await wait(reelTimings.settle);
    elements.grid.classList.remove("is-settling");
    return finalBoard;
  })();
}

function resetGame() {
  stopSpinSound();
  state = { remaining: [...characters], eliminated: [], board: [], turn: 0, spinning: false, finished: false, winningLine: null };
  elements.modal.hidden = true;
  elements.turnCount.textContent = "0";
  elements.spin.disabled = characters.length === 0 || !canAssignSenior;
  elements.status.textContent = "按下轉一輪，先淘汰一位角色！";
  clearWinningLine();
  state.board = state.remaining.length ? randomBoard(state.remaining) : [];
  renderRoster();
  renderBoard();
  if (!characters.length) elements.status.textContent = "目前沒有可抽的學長姐，請確認資料或本輪是否已抽完。";
  if (!canAssignSenior) elements.status.textContent = "請先回抽抽樂選定尚未配對的學弟妹。";
}

async function loadCharacters() {
  const flow = await FlowState.init();
  const source = flow.availableSeniors.length ? flow.availableSeniors : flow.seniors;
  characters = source.map((senior) => ({
    name: senior.姓名,
    image: `../shared/assets/seniors-common/${encodeURIComponent(senior.照片)}`
  }));
  canAssignSenior = Boolean(flow.currentStudent && !flow.currentStudent.學長姐);
}

async function initializeGame() {
  try {
    await loadCharacters();
    resetGame();
  } catch (error) {
    elements.status.textContent = error.message;
    elements.spin.disabled = true;
  }
}

elements.spin.addEventListener("click", spin);
elements.soundToggle.addEventListener("click", () => {
  soundEnabled = !soundEnabled;
  if (!soundEnabled) {
    stopSpinSound();
    lockAudio.pause();
    lockAudio.currentTime = 0;
  }
  updateSoundToggle();
});
elements.restart.addEventListener("click", initializeGame);
window.addEventListener("resize", () => {
  if (state.finished && state.winningLine) showWinningLine(state.winningLine);
});

initializeGame();
updateSoundToggle();
