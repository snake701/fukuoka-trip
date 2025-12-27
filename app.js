/*************************************************
 * 福岡行旅 2026 – app.js
 * 核心邏輯（Firebase / 權限 / 資料）
 *************************************************/

/* ========= Firebase ========= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import {
  getDatabase,
  ref,
  set,
  onValue
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

/* ========= 基本設定 ========= */
const firebaseConfig = {
  apiKey: "AIzaSyBRzjZkVrMPADgC3dgmTRMpzYGdoEHVhuI",
  authDomain: "fukuoka-trip-2026.firebaseapp.com",
  databaseURL: "https://fukuoka-trip-2026-default-rtdb.firebaseio.com",
  projectId: "fukuoka-trip-2026",
  storageBucket: "fukuoka-trip-2026.appspot.com",
  messagingSenderId: "788923341638",
  appId: "1:788923341638:web:838629fb9a547648372347"
};

/* ========= 全域狀態 ========= */
const IS_READONLY = window.IS_READONLY === true;

const state = {
  tripData: {},       // 行程
  checklist: [],      // 攜帶清單
  shoppingList: [],   // 購物清單
  expenses: [],       // 公款
  purchased: [],      // 個人記帳
  memo: "",
  lastUpdated: null
};

/* ========= 私帳（只存在本機） ========= */
let privateExpenses =
  JSON.parse(localStorage.getItem("fukuoka_private_exp")) || [];
let privateBudget =
  Number(localStorage.getItem("fukuoka_private_budget")) || 0;

/* ========= Firebase 初始化 ========= */
const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const publicRef = ref(db, "fukuoka_trip_final_v17/public");

/* ========= DOM ========= */
const appEl = document.getElementById("app");

/* ========= 工具 ========= */
function now() {
  return Date.now();
}
function saveLocalPrivate() {
  localStorage.setItem(
    "fukuoka_private_exp",
    JSON.stringify(privateExpenses)
  );
  localStorage.setItem(
    "fukuoka_private_budget",
    privateBudget
  );
}

/* ========= Firebase 公開同步 ========= */
function savePublic() {
  if (IS_READONLY) return;
  set(publicRef, {
    ...state,
    lastUpdated: now()
  });
}

/* ========= 監聽 Firebase ========= */
onValue(publicRef, snap => {
  const data = snap.val();
  if (!data) return;
  Object.assign(state, data);
  render();
});

/* ========= UI Render ========= */
function render() {
  appEl.innerHTML = `
    <section>
      <h2>📅 行程</h2>
      ${renderTrip()}
      ${IS_READONLY ? "" : `<button onclick="addTrip()">＋新增行程</button>`}
    </section>

    <section>
      <h2>✅ 攜帶清單</h2>
      ${renderChecklist()}
      ${IS_READONLY ? "" : `<button onclick="addCheck()">＋新增</button>`}
    </section>

    <section>
      <h2>💰 公共記帳</h2>
      ${renderExpenses()}
      ${IS_READONLY ? "" : `<button onclick="addExpense()">＋新增支出</button>`}
    </section>

    <section>
      <h2>🔒 私帳（本機）</h2>
      ${renderPrivate()}
    </section>

    <section>
      <h2>📝 備忘</h2>
      <textarea
        ${IS_READONLY ? "disabled" : ""}
        style="width:100%;height:80px"
        oninput="updateMemo(this.value)"
      >${state.memo || ""}</textarea>
    </section>

    <footer style="margin:40px 0;font-size:0.75rem;color:#888">
      最後同步：
      ${state.lastUpdated ? new Date(state.lastUpdated).toLocaleString() : "--"}
    </footer>
  `;
}

/* ========= 行程 ========= */
function renderTrip() {
  const days = Object.keys(state.tripData || {});
  if (days.length === 0) {
    return `<p style="color:#aaa">尚無行程</p>`;
  }
  return days.map(d => `
    <div>
      <strong>D${d}</strong>
      <ul>
        ${(state.tripData[d] || []).map(i =>
          `<li>${i.t || ""} ${i.title}</li>`
        ).join("")}
      </ul>
    </div>
  `).join("");
}

window.addTrip = function () {
  const day = prompt("第幾天？");
  const title = prompt("行程名稱？");
  if (!day || !title) return;

  if (!state.tripData[day]) state.tripData[day] = [];
  state.tripData[day].push({
    t: "09:00",
    title
  });
  savePublic();
};

/* ========= 清單 ========= */
function renderChecklist() {
  if (!state.checklist.length) {
    return `<p style="color:#aaa">尚無項目</p>`;
  }
  return `<ul>${
    state.checklist.map((c, i) => `
      <li>
        <input type="checkbox"
          ${c.c ? "checked" : ""}
          ${IS_READONLY ? "disabled" : ""}
          onchange="toggleCheck(${i},this.checked)"
        >
        ${c.n}
      </li>
    `).join("")
  }</ul>`;
}

window.addCheck = function () {
  const n = prompt("項目名稱");
  if (!n) return;
  state.checklist.push({ n, c: false });
  savePublic();
};

window.toggleCheck = function (i, v) {
  state.checklist[i].c = v;
  savePublic();
};

/* ========= 公共支出 ========= */
function renderExpenses() {
  if (!state.expenses.length) {
    return `<p style="color:#aaa">尚無支出</p>`;
  }
  return `<ul>${
    state.expenses.map(e =>
      `<li>${e.n}：¥${e.v}</li>`
    ).join("")
  }</ul>`;
}

window.addExpense = function () {
  const n = prompt("支出項目");
  const v = prompt("金額");
  if (!n || !v) return;
  state.expenses.push({ n, v: Number(v) });
  savePublic();
};

/* ========= 私帳 ========= */
function renderPrivate() {
  const total = privateExpenses.reduce((s, e) => s + e.v, 0);
  return `
    <div>
      <div>預算：¥${privateBudget}</div>
      <div>已花：¥${total}</div>
      <div>剩餘：¥${privateBudget - total}</div>
      ${IS_READONLY ? "" : `<button onclick="addPrivate()">＋私帳支出</button>`}
    </div>
  `;
}

window.addPrivate = function () {
  const n = prompt("私帳項目");
  const v = prompt("金額");
  if (!n || !v) return;
  privateExpenses.push({ n, v: Number(v) });
  saveLocalPrivate();
  render();
};

/* ========= Memo ========= */
window.updateMemo = function (v) {
  state.memo = v;
  savePublic();
};

/* ========= 初次 Render ========= */
render();
