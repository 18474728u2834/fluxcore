import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { bx } from "./Shell";

const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export function BirthdayPrompt() {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [month, setMonth] = useState<number>(1);
  const [day, setDay] = useState<number>(1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    const skipKey = `bargains_bday_skip_${user.id}`;
    if (localStorage.getItem(skipKey)) return;
    (async () => {
      const { data } = await supabase
        .from("user_birthdays")
        .select("birthday_month")
        .eq("user_id", user.id)
        .maybeSingle();
      if (!data) setOpen(true);
    })();
  }, [user]);

  const save = async () => {
    if (!user) return;
    setSaving(true);
    const { error } = await supabase
      .from("user_birthdays")
      .upsert({ user_id: user.id, birthday_month: month, birthday_day: day }, { onConflict: "user_id" });
    setSaving(false);
    if (!error) setOpen(false);
  };

  const skip = () => {
    if (user) localStorage.setItem(`bargains_bday_skip_${user.id}`, "1");
    setOpen(false);
  };

  if (!open) return null;
  const daysInMonth = new Date(2024, month, 0).getDate();

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-md rounded-md border p-6" style={bx.cardStyle}>
        <h2 className="text-xl font-bold" style={{ color: bx.text }}>When's your birthday?</h2>
        <p className="text-sm mt-1.5" style={{ color: bx.textDim }}>So your team can celebrate with you. Year is private — we only need the month and day.</p>

        <div className="grid grid-cols-2 gap-3 mt-5">
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: bx.textMuted }}>Month</label>
            <select value={month} onChange={(e) => { setMonth(+e.target.value); setDay(1); }}
              className="mt-1.5 w-full h-10 px-3 rounded-md border text-sm outline-none"
              style={{ background: "#141416", borderColor: "#26262a", color: bx.text }}>
              {MONTHS.map((m, i) => <option key={m} value={i+1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[11px] font-semibold uppercase tracking-wider" style={{ color: bx.textMuted }}>Day</label>
            <select value={day} onChange={(e) => setDay(+e.target.value)}
              className="mt-1.5 w-full h-10 px-3 rounded-md border text-sm outline-none"
              style={{ background: "#141416", borderColor: "#26262a", color: bx.text }}>
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(d => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-2 mt-6">
          <button onClick={skip} className="h-9 px-4 rounded-md text-sm font-medium hover:bg-[#1f1f22]" style={{ color: bx.textDim }}>Skip</button>
          <button onClick={save} disabled={saving}
            className="h-9 px-4 rounded-md text-sm font-semibold text-white disabled:opacity-60"
            style={{ background: bx.coral }}>{saving ? "Saving..." : "Save"}</button>
        </div>
      </div>
    </div>
  );
}
