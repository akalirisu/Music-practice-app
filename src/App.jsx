import { useState, useEffect } from "react";

const BADGES = [
  { id: "first", label: "はじめの一歩", icon: "🌱", desc: "はじめて練習を記録した", condition: (records) => records.length >= 1 },
  { id: "3days", label: "3日連続", icon: "🔥", desc: "3日連続で練習した", condition: (_, streak) => streak >= 3 },
  { id: "7days", label: "1週間", icon: "⭐", desc: "7日連続で練習した", condition: (_, streak) => streak >= 7 },
  { id: "30days", label: "30日連続", icon: "🏆", desc: "30日連続で練習した", condition: (_, streak) => streak >= 30 },
  { id: "10records", label: "10回達成", icon: "🎵", desc: "10回練習を記録した", condition: (records) => records.length >= 10 },
  { id: "30records", label: "30回達成", icon: "🎶", desc: "30回練習を記録した", condition: (records) => records.length >= 30 },
];

const COLORS = {
  bg: "#FFF8F0",
  primary: "#E8834A",
  primaryLight: "#FDE8D8",
  accent: "#5B8FD4",
  accentLight: "#E3EDFA",
  green: "#4CAF7D",
  greenLight: "#E3F5EC",
  text: "#2C1A0E",
  textMuted: "#9A7B6B",
  card: "#FFFFFF",
  border: "#F0E0D0",
};

function getStreak(records) {
  if (!records.length) return 0;
  const dates = [...new Set(records.map((r) => r.date))].sort().reverse();
  const today = new Date().toISOString().slice(0, 10);
  let streak = 0;
  let check = today;
  for (const d of dates) {
    if (d === check) {
      streak++;
      const prev = new Date(check);
      prev.setDate(prev.getDate() - 1);
      check = prev.toISOString().slice(0, 10);
    } else if (d < check) break;
  }
  return streak;
}

function getCalendarDays(year, month, records) {
  const first = new Date(year, month, 1).getDay();
  const days = new Date(year, month + 1, 0).getDate();
  const practicedDates = new Set(
    records.filter((r) => {
      const d = new Date(r.date);
      return d.getFullYear() === year && d.getMonth() === month;
    }).map((r) => r.date)
  );
  return { first, days, practicedDates };
}

export default function App() {
  const [tab, setTab] = useState("home");
  const [records, setRecords] = useState(() => {
    try { return JSON.parse(localStorage.getItem("practiceRecords") || "[]"); } catch { return []; }
  });
  const [form, setForm] = useState({ song: "", minutes: "", memo: "" });
  const [aiMsg, setAiMsg] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [calMonth, setCalMonth] = useState(() => {
    const n = new Date(); return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [showBadge, setShowBadge] = useState(null);

  const streak = getStreak(records);
  const earnedBadges = BADGES.filter((b) => b.condition(records, streak));

  useEffect(() => {
    localStorage.setItem("practiceRecords", JSON.stringify(records));
  }, [records]);

  async function handleSubmit() {
    if (!form.song || !form.minutes) return;
    const today = new Date().toISOString().slice(0, 10);
    const newRecord = { ...form, date: today, id: Date.now() };
    const newRecords = [newRecord, ...records];
    setRecords(newRecords);

    const newStreak = getStreak(newRecords);
    const newBadge = BADGES.find(
      (b) => b.condition(newRecords, newStreak) && !BADGES.find((eb) => eb.id === b.id && earnedBadges.includes(eb))
    );
    if (newBadge && !earnedBadges.find((b) => b.id === newBadge.id)) {
      setShowBadge(newBadge);
    }

    setForm({ song: "", minutes: "", memo: "" });
    setTab("done");
    setAiLoading(true);
    setAiMsg("");

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-6",
          max_tokens: 1000,
          system: `あなたは優しい音楽の先生です。子供の練習記録に対して、日本語で短く温かく励ます言葉をかけてください。
絵文字を1〜2個使って、2〜3文で答えてください。連続練習日数が多いほど特別に褒めてください。`,
          messages: [{
            role: "user",
            content: `曲名：${newRecord.song}、練習時間：${newRecord.minutes}分、メモ：${newRecord.memo || "なし"}、連続練習日数：${newStreak}日`
          }]
        })
      });
      const data = await res.json();
      const text = data.content?.map((c) => c.text || "").join("") || "よく頑張りました！";
      setAiMsg(text);
    } catch {
      setAiMsg("今日もよく練習しましたね！続けていきましょう🎵");
    }
    setAiLoading(false);
  }

  const { first, days, practicedDates } = getCalendarDays(calMonth.year, calMonth.month, records);
  const weekdays = ["日", "月", "火", "水", "木", "金", "土"];

  const todayStr = new Date().toISOString().slice(0, 10);
  const todayRecords = records.filter((r) => r.date === todayStr);

  return (
    <div style={{ minHeight: "100vh", background: COLORS.bg, fontFamily: "'Hiragino Kaku Gothic ProN', 'Yu Gothic', sans-serif", color: COLORS.text }}>
      {/* Header */}
      <div style={{ background: COLORS.primary, padding: "16px 20px", display: "flex", alignItems: "center", gap: 10 }}>
        <span style={{ fontSize: 24 }}>🎹</span>
        <div>
          <div style={{ color: "#fff", fontSize: 18, fontWeight: 700, letterSpacing: 1 }}>おんがく練習ノート</div>
          <div style={{ color: "rgba(255,255,255,0.8)", fontSize: 12 }}>今日も練習がんばろう！</div>
        </div>
        {streak > 0 && (
          <div style={{ marginLeft: "auto", background: "rgba(255,255,255,0.2)", borderRadius: 20, padding: "4px 12px", color: "#fff", fontSize: 13, fontWeight: 700 }}>
            🔥 {streak}日連続
          </div>
        )}
      </div>

      {/* Badge popup */}
      {showBadge && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.5)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center" }}
          onClick={() => setShowBadge(null)}>
          <div style={{ background: "#fff", borderRadius: 20, padding: 32, textAlign: "center", maxWidth: 280 }}>
            <div style={{ fontSize: 56 }}>{showBadge.icon}</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginTop: 8, color: COLORS.primary }}>バッジ獲得！</div>
            <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>{showBadge.label}</div>
            <div style={{ fontSize: 14, color: COLORS.textMuted, marginTop: 4 }}>{showBadge.desc}</div>
            <button onClick={() => setShowBadge(null)}
              style={{ marginTop: 16, background: COLORS.primary, color: "#fff", border: "none", borderRadius: 12, padding: "10px 24px", fontSize: 15, cursor: "pointer", fontWeight: 700 }}>
              やったー！
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: "flex", background: "#fff", borderBottom: `2px solid ${COLORS.border}` }}>
        {[["home", "🏠 ホーム"], ["record", "✏️ 記録する"], ["calendar", "📅 カレンダー"], ["badges", "🏆 バッジ"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)}
            style={{ flex: 1, padding: "12px 4px", background: "none", border: "none", fontSize: 12, fontWeight: tab === id ? 700 : 400,
              color: tab === id ? COLORS.primary : COLORS.textMuted, borderBottom: tab === id ? `3px solid ${COLORS.primary}` : "3px solid transparent",
              cursor: "pointer", transition: "all 0.2s" }}>
            {label}
          </button>
        ))}
      </div>

      <div style={{ padding: "20px 16px", maxWidth: 480, margin: "0 auto" }}>

        {/* HOME */}
        {tab === "home" && (
          <div>
            <div style={{ background: COLORS.card, borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 2px 12px rgba(232,131,74,0.08)" }}>
              <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 8 }}>今日の練習</div>
              {todayRecords.length === 0 ? (
                <div style={{ textAlign: "center", padding: "16px 0", color: COLORS.textMuted }}>
                  <div style={{ fontSize: 32, marginBottom: 8 }}>🎼</div>
                  <div>まだ今日の記録がありません</div>
                  <button onClick={() => setTab("record")}
                    style={{ marginTop: 12, background: COLORS.primary, color: "#fff", border: "none", borderRadius: 12, padding: "10px 20px", fontSize: 14, cursor: "pointer", fontWeight: 700 }}>
                    練習を記録する
                  </button>
                </div>
              ) : (
                todayRecords.map((r) => (
                  <div key={r.id} style={{ background: COLORS.primaryLight, borderRadius: 10, padding: 12, marginBottom: 8 }}>
                    <div style={{ fontWeight: 700 }}>🎵 {r.song}</div>
                    <div style={{ fontSize: 13, color: COLORS.textMuted, marginTop: 4 }}>⏱ {r.minutes}分　{r.memo && `📝 ${r.memo}`}</div>
                  </div>
                ))
              )}
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 16 }}>
              <div style={{ background: COLORS.card, borderRadius: 14, padding: 16, textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.primary }}>{streak}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted }}>🔥 連続練習日数</div>
              </div>
              <div style={{ background: COLORS.card, borderRadius: 14, padding: 16, textAlign: "center", boxShadow: "0 2px 8px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 28, fontWeight: 800, color: COLORS.accent }}>{records.length}</div>
                <div style={{ fontSize: 12, color: COLORS.textMuted }}>🎵 総練習回数</div>
              </div>
            </div>

            {records.length > 0 && (
              <div style={{ background: COLORS.card, borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
                <div style={{ fontSize: 14, fontWeight: 700, marginBottom: 12 }}>最近の練習</div>
                {records.slice(0, 5).map((r) => (
                  <div key={r.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 0", borderBottom: `1px solid ${COLORS.border}` }}>
                    <div>
                      <div style={{ fontWeight: 600, fontSize: 14 }}>🎵 {r.song}</div>
                      {r.memo && <div style={{ fontSize: 12, color: COLORS.textMuted }}>{r.memo}</div>}
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: 13, color: COLORS.primary, fontWeight: 700 }}>{r.minutes}分</div>
                      <div style={{ fontSize: 11, color: COLORS.textMuted }}>{r.date}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* RECORD */}
        {tab === "record" && (
          <div>
            <div style={{ background: COLORS.card, borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(232,131,74,0.08)" }}>
              <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>✏️ 今日の練習を記録しよう</div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: COLORS.textMuted, display: "block", marginBottom: 6 }}>練習した曲 *</label>
                <input value={form.song} onChange={(e) => setForm({ ...form, song: e.target.value })}
                  placeholder="例：バイエル No.5"
                  style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${COLORS.border}`, borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box",
                    background: COLORS.bg }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, color: COLORS.textMuted, display: "block", marginBottom: 6 }}>練習時間（分）*</label>
                <input type="number" value={form.minutes} onChange={(e) => setForm({ ...form, minutes: e.target.value })}
                  placeholder="例：30"
                  style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${COLORS.border}`, borderRadius: 10, fontSize: 15, outline: "none", boxSizing: "border-box",
                    background: COLORS.bg }} />
              </div>
              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, color: COLORS.textMuted, display: "block", marginBottom: 6 }}>ひとことメモ（任意）</label>
                <textarea value={form.memo} onChange={(e) => setForm({ ...form, memo: e.target.value })}
                  placeholder="例：右手がうまく弾けた！"
                  rows={3}
                  style={{ width: "100%", padding: "12px 14px", border: `1.5px solid ${COLORS.border}`, borderRadius: 10, fontSize: 15, outline: "none", resize: "none", boxSizing: "border-box",
                    background: COLORS.bg }} />
              </div>
              <button onClick={handleSubmit}
                disabled={!form.song || !form.minutes}
                style={{ width: "100%", padding: "14px", background: form.song && form.minutes ? COLORS.primary : COLORS.border,
                  color: "#fff", border: "none", borderRadius: 12, fontSize: 16, fontWeight: 700, cursor: form.song && form.minutes ? "pointer" : "not-allowed",
                  transition: "background 0.2s" }}>
                記録する 🎵
              </button>
            </div>
          </div>
        )}

        {/* DONE */}
        {tab === "done" && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 56, marginBottom: 8 }}>🎉</div>
            <div style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>記録できました！</div>
            <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 20 }}>今日も練習おつかれさまでした</div>
            <div style={{ background: COLORS.card, borderRadius: 16, padding: 20, marginBottom: 16, boxShadow: "0 2px 12px rgba(232,131,74,0.08)", minHeight: 80 }}>
              {aiLoading ? (
                <div style={{ color: COLORS.textMuted, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  <span>先生からのメッセージを取得中</span>
                  <span style={{ animation: "spin 1s linear infinite", display: "inline-block" }}>🎵</span>
                </div>
              ) : (
                <div style={{ fontSize: 15, lineHeight: 1.7, color: COLORS.text }}>{aiMsg}</div>
              )}
            </div>
            <button onClick={() => setTab("home")}
              style={{ background: COLORS.primary, color: "#fff", border: "none", borderRadius: 12, padding: "12px 28px", fontSize: 15, fontWeight: 700, cursor: "pointer" }}>
              ホームに戻る
            </button>
          </div>
        )}

        {/* CALENDAR */}
        {tab === "calendar" && (
          <div>
            <div style={{ background: COLORS.card, borderRadius: 16, padding: 20, boxShadow: "0 2px 12px rgba(0,0,0,0.04)" }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <button onClick={() => {
                  const d = new Date(calMonth.year, calMonth.month - 1);
                  setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
                }} style={{ background: "none", border: `1.5px solid ${COLORS.border}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 16 }}>‹</button>
                <div style={{ fontWeight: 700, fontSize: 16 }}>{calMonth.year}年 {calMonth.month + 1}月</div>
                <button onClick={() => {
                  const d = new Date(calMonth.year, calMonth.month + 1);
                  setCalMonth({ year: d.getFullYear(), month: d.getMonth() });
                }} style={{ background: "none", border: `1.5px solid ${COLORS.border}`, borderRadius: 8, padding: "6px 12px", cursor: "pointer", fontSize: 16 }}>›</button>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, marginBottom: 8 }}>
                {weekdays.map((w) => (
                  <div key={w} style={{ textAlign: "center", fontSize: 11, color: COLORS.textMuted, fontWeight: 700, padding: "4px 0" }}>{w}</div>
                ))}
                {Array.from({ length: first }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: days }).map((_, i) => {
                  const day = i + 1;
                  const dateStr = `${calMonth.year}-${String(calMonth.month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                  const practiced = practicedDates.has(dateStr);
                  const isToday = dateStr === todayStr;
                  return (
                    <div key={day} style={{ textAlign: "center", padding: "6px 2px", borderRadius: 8,
                      background: practiced ? COLORS.greenLight : isToday ? COLORS.primaryLight : "transparent",
                      border: isToday ? `2px solid ${COLORS.primary}` : "2px solid transparent" }}>
                      <div style={{ fontSize: 13, fontWeight: isToday ? 700 : 400, color: practiced ? COLORS.green : COLORS.text }}>{day}</div>
                      {practiced && <div style={{ fontSize: 10 }}>🎵</div>}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 8, fontSize: 12, color: COLORS.textMuted }}>
                <span>🟩 練習した日</span>
                <span style={{ color: COLORS.primary }}>◻️ 今日</span>
              </div>
            </div>
          </div>
        )}

        {/* BADGES */}
        {tab === "badges" && (
          <div>
            <div style={{ fontSize: 14, color: COLORS.textMuted, marginBottom: 12 }}>
              {earnedBadges.length} / {BADGES.length} 個獲得
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              {BADGES.map((b) => {
                const earned = earnedBadges.find((eb) => eb.id === b.id);
                return (
                  <div key={b.id} style={{ background: earned ? COLORS.card : "#F5F0EB", borderRadius: 14, padding: 16, textAlign: "center",
                    boxShadow: earned ? "0 2px 12px rgba(232,131,74,0.12)" : "none", opacity: earned ? 1 : 0.5,
                    border: earned ? `1.5px solid ${COLORS.primaryLight}` : "1.5px solid transparent" }}>
                    <div style={{ fontSize: 36, filter: earned ? "none" : "grayscale(1)" }}>{b.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, marginTop: 6, color: earned ? COLORS.text : COLORS.textMuted }}>{b.label}</div>
                    <div style={{ fontSize: 11, color: COLORS.textMuted, marginTop: 4 }}>{b.desc}</div>
                    {earned && <div style={{ marginTop: 6, fontSize: 11, color: COLORS.green, fontWeight: 700 }}>✓ 獲得済み</div>}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
