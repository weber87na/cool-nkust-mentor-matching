(function () {
  const api = {
    async state() {
      const response = await fetch("/api/state", { cache: "no-store" });
      if (!response.ok) throw new Error("無法讀取抽籤狀態");
      return response.json();
    },
    async setCurrentStudent(student) {
      const name = student && (student.姓名 || student.name || student.studentName);
      const response = await fetch("/api/current-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "無法設定目前學弟妹");
      window.dispatchEvent(new CustomEvent("flow-state-change", { detail: data }));
      return data;
    },
    async clearCurrentStudent() {
      const response = await fetch("/api/current-student", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ clear: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "無法清除目前學弟妹");
      window.dispatchEvent(new CustomEvent("flow-state-change", { detail: data }));
      return data;
    },
    async assignSenior(seniorName, sourceRoom) {
      const response = await fetch("/api/assign-senior", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seniorName, sourceRoom }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "無法寫入配對結果");
      window.dispatchEvent(new CustomEvent("flow-state-change", { detail: data }));
      return data;
    },
    async resetData() {
      const response = await fetch("/api/reset-data", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reset: true }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "無法重置資料");
      window.dispatchEvent(new CustomEvent("flow-state-change", { detail: data }));
      return data;
    },
  };

  function ensureBadge() {
    let badge = document.querySelector("[data-current-student-badge]");
    if (badge) return badge;

    const style = document.createElement("style");
    style.textContent = `
      [data-current-student-badge] {
        position: fixed;
        z-index: 50;
        top: max(12px, env(safe-area-inset-top));
        right: max(12px, env(safe-area-inset-right));
        max-width: min(360px, calc(100vw - 24px));
        padding: 9px 14px;
        border: 2px solid rgba(255, 221, 128, .82);
        border-radius: 999px;
        color: #fff7d6;
        background: rgba(28, 18, 18, .78);
        box-shadow: 0 8px 24px rgba(0, 0, 0, .24);
        font: 800 15px/1.3 "Noto Sans TC", "Microsoft JhengHei", system-ui, sans-serif;
        text-decoration: none;
        backdrop-filter: blur(8px);
        pointer-events: none;
      }
    `;
    document.head.append(style);

    badge = document.createElement("div");
    badge.dataset.currentStudentBadge = "";
    badge.textContent = "目前學弟妹：尚未選定";
    document.body.append(badge);
    return badge;
  }

  function renderBadge(state) {
    const badge = ensureBadge();
    const student = state && state.currentStudent;
    if (!student) {
      badge.textContent = "目前學弟妹：尚未選定";
      return;
    }
    const paired = student.學長姐 ? `｜已配對：${student.學長姐}` : "";
    badge.textContent = `目前學弟妹：${student.姓名}${paired}`;
  }

  async function init(options = {}) {
    try {
      const state = await api.state();
      if (options.badge !== false) renderBadge(state);
      return state;
    } catch (error) {
      if (options.badge !== false) {
        const badge = ensureBadge();
        badge.textContent = "請用本機服務開啟頁面";
      }
      throw error;
    }
  }

  window.addEventListener("flow-state-change", (event) => renderBadge(event.detail));
  window.FlowState = {
    getState: api.state,
    setCurrentStudent: api.setCurrentStudent,
    clearCurrentStudent: api.clearCurrentStudent,
    assignSenior: api.assignSenior,
    resetData: api.resetData,
    init,
    renderBadge,
  };
})();
