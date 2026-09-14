import { useEffect, useState } from "react";
import { X, Check, Lock, Crown, Sparkles, Rocket, Table2, Minus } from "lucide-react";
import { PLANS, saveUpgradeId, type PlanId, type Plan } from "@/lib/plans";
import { APEX_MODELS } from "@/lib/models";

type Props = {
  open: boolean;
  onClose: () => void;
  currentPlan: PlanId;
  userName?: string;
  onSelected?: (planId: PlanId) => void;
};

const ICONS: Record<PlanId, React.ComponentType<{ className?: string }>> = {
  free: Sparkles,
  pro: Rocket,
  max: Crown,
};

export default function PlansDialog({ open, onClose, currentPlan, userName, onSelected }: Props) {
  const [checkout, setCheckout] = useState<Plan | null>(null);
  const [compare, setCompare] = useState(false);
  const [contact, setContact] = useState("");
  const [method, setMethod] = useState("Карта");
  const [note, setNote] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [reqId, setReqId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const [rejected, setRejected] = useState(false);

  // Poll upgrade status while pending
  useEffect(() => {
    if (!reqId || !sent || confirmed || rejected) return;
    let stop = false;
    const tick = async () => {
      try {
        const r = await fetch(`/api/upgrade/status?id=${encodeURIComponent(reqId)}`);
        if (!r.ok) return;
        const d = (await r.json()) as { status?: string; planId?: string };
        if (stop) return;
        if (d.status === "confirmed") {
          setConfirmed(true);
          saveUpgradeId(reqId);
          if (d.planId) onSelected?.(d.planId as PlanId);
        } else if (d.status === "rejected") {
          setRejected(true);
        }
      } catch {}
    };
    const int = setInterval(tick, 3000);
    tick();
    return () => { stop = true; clearInterval(int); };
  }, [reqId, sent, confirmed, rejected, onSelected]);

  if (!open) return null;

  async function submit() {
    if (!checkout) return;
    setErr(null);
    if (!contact.trim()) { setErr("Укажите контакт для связи"); return; }
    setSending(true);
    try {
      const r = await fetch("/api/upgrade", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          planId: checkout.id,
          plan: checkout.label,
          price: checkout.price,
          contact: contact.trim(),
          method,
          note: note.trim(),
          userName: userName ?? "",
        }),
      });
      if (!r.ok) throw new Error(await r.text().catch(() => "Ошибка"));
      const data = await r.json().catch(() => ({} as { id?: string }));
      if (data.id) setReqId(data.id);
      setSent(true);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Ошибка отправки");
    } finally {
      setSending(false);
    }
  }

  function close() {
    setCheckout(null); setContact(""); setNote(""); setSent(false); setErr(null);
    setReqId(null); setConfirmed(false); setRejected(false);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center bg-black/70" onClick={close}>
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full sm:max-w-2xl bg-card border border-border rounded-t-3xl sm:rounded-3xl max-h-[92dvh] overflow-y-auto"
      >
        <div className="flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card z-10">
          <div>
            <div className="font-serif text-xl">{checkout ? `Оплата · ${checkout.label}` : compare ? "Сравнение тарифов" : "Тарифы ApexCode"}</div>
            <div className="text-xs text-muted-foreground">
              {checkout ? "Заявка уйдёт менеджеру в Telegram" : compare ? "Что входит в каждый план" : "Выберите подходящий план"}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!checkout && (
              <button
                onClick={() => setCompare((v) => !v)}
                className="hidden sm:flex items-center gap-1.5 h-9 px-3 rounded-full bg-secondary hover:bg-accent text-xs font-medium"
              >
                <Table2 className="h-3.5 w-3.5" />
                {compare ? "Карточки" : "Сравнить"}
              </button>
            )}
            <button onClick={close} className="h-9 w-9 rounded-full hover:bg-accent flex items-center justify-center" aria-label="Закрыть">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {!checkout && !compare && (
          <div className="p-4 grid gap-3 sm:grid-cols-2">
            {PLANS.map((p) => {
              const Icon = ICONS[p.id];
              const isCurrent = p.id === currentPlan;
              return (
                <div
                  key={p.id}
                  className={`relative rounded-2xl border p-4 flex flex-col gap-3 bg-gradient-to-br ${p.accent} ${isCurrent ? "border-primary" : "border-border"}`}
                >
                  {isCurrent && (
                    <span className="absolute top-3 right-3 text-[10px] uppercase tracking-widest text-primary border border-primary/50 rounded-full px-2 py-0.5">
                      Текущий
                    </span>
                  )}
                  <div className="flex items-center gap-2">
                    <div className="h-9 w-9 rounded-xl bg-background/60 border border-border flex items-center justify-center">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div>
                      <div className="font-serif text-xl leading-none">{p.label}</div>
                      <div className="text-[11px] text-muted-foreground mt-1">{p.priceUsd === 0 ? "Навсегда" : "в месяц"}</div>
                    </div>
                    <div className="ml-auto font-serif text-2xl">{p.price}</div>
                  </div>
                  <ul className="text-xs space-y-1.5">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2">
                        <Check className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" />
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    disabled={isCurrent}
                    onClick={() => setCheckout(p)}
                    className={`mt-auto w-full rounded-xl py-2.5 text-sm font-medium transition ${isCurrent ? "bg-secondary text-muted-foreground cursor-default" : "bg-primary text-primary-foreground hover:opacity-90"}`}
                  >
                    {isCurrent ? "Активен" : p.priceUsd === 0 ? "Перейти на Free" : `Оформить за ${p.price}`}
                  </button>
                </div>
              );
            })}
            <button
              onClick={() => setCompare(true)}
              className="sm:hidden rounded-2xl border border-border py-3 text-sm font-medium flex items-center justify-center gap-2 hover:bg-accent"
            >
              <Table2 className="h-4 w-4" /> Сравнить тарифы
            </button>
          </div>
        )}

        {!checkout && compare && (
          <div className="p-4 overflow-x-auto">
            <table className="w-full text-xs border-separate border-spacing-0 min-w-[560px]">
              <thead>
                <tr>
                  <th className="text-left p-2 sticky left-0 bg-card z-10 font-medium text-muted-foreground">Возможность</th>
                  {PLANS.map((p) => (
                    <th key={p.id} className={`p-2 text-center font-serif text-base ${p.id === currentPlan ? "text-primary" : ""}`}>
                      <div>{p.label}</div>
                      <div className="text-[11px] text-muted-foreground font-sans">{p.price}{p.priceUsd > 0 && "/мес"}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="p-2 sticky left-0 bg-card text-muted-foreground">Токенов на сессию</td>
                  {PLANS.map((p) => (
                    <td key={p.id} className="p-2 text-center font-medium">{p.sessionCap.toLocaleString("ru-RU")}</td>
                  ))}
                </tr>
                <tr>
                  <td className="p-2 sticky left-0 bg-card text-muted-foreground">Доступно моделей</td>
                  {PLANS.map((p) => (
                    <td key={p.id} className="p-2 text-center font-medium">{p.models.length} / {APEX_MODELS.length}</td>
                  ))}
                </tr>
                {APEX_MODELS.map((m) => (
                  <tr key={m.id} className="border-t border-border/50">
                    <td className="p-2 sticky left-0 bg-card">{m.label}</td>
                    {PLANS.map((p) => (
                      <td key={p.id} className="p-2 text-center">
                        {p.models.includes(m.id) ? (
                          <Check className="h-3.5 w-3.5 text-primary inline" />
                        ) : (
                          <Minus className="h-3.5 w-3.5 text-muted-foreground/50 inline" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                {[
                  { k: "Веб-поиск", test: (p: Plan) => p.models.some((id) => APEX_MODELS.find((m) => m.id === id)?.supportsWebSearch) },
                  { k: "Глубокое раздумие", test: () => true },
                  { k: "Генерация .zip проектов", test: (p: Plan) => p.id !== "free" },
                  { k: "Приоритетная очередь", test: (p: Plan) => p.priceUsd >= 9 },
                  { k: "Команда / SSO", test: (p: Plan) => p.id === "team" || p.id === "enterprise" },
                  { k: "SLA 99.9%", test: (p: Plan) => p.id === "enterprise" },
                ].map((row) => (
                  <tr key={row.k} className="border-t border-border/50">
                    <td className="p-2 sticky left-0 bg-card text-muted-foreground">{row.k}</td>
                    {PLANS.map((p) => (
                      <td key={p.id} className="p-2 text-center">
                        {row.test(p) ? (
                          <Check className="h-3.5 w-3.5 text-primary inline" />
                        ) : (
                          <Minus className="h-3.5 w-3.5 text-muted-foreground/50 inline" />
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="border-t border-border/50">
                  <td className="p-2 sticky left-0 bg-card" />
                  {PLANS.map((p) => {
                    const isCurrent = p.id === currentPlan;
                    return (
                      <td key={p.id} className="p-2 text-center">
                        <button
                          disabled={isCurrent}
                          onClick={() => setCheckout(p)}
                          className={`w-full rounded-lg py-1.5 text-[11px] font-medium ${isCurrent ? "bg-secondary text-muted-foreground" : "bg-primary text-primary-foreground hover:opacity-90"}`}
                        >
                          {isCurrent ? "Активен" : "Выбрать"}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}



        {checkout && !sent && (
          <div className="p-4 space-y-4">
            <div className="rounded-2xl border border-border p-3 bg-muted/40 flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-background border border-border flex items-center justify-center">
                <Crown className="h-4 w-4" />
              </div>
              <div className="flex-1">
                <div className="font-serif text-lg leading-none">{checkout.label}</div>
                <div className="text-xs text-muted-foreground mt-1">{checkout.sessionCap.toLocaleString("ru-RU")} токенов на сессию</div>
              </div>
              <div className="font-serif text-xl">{checkout.price}<span className="text-xs text-muted-foreground">/мес</span></div>
            </div>

            {checkout.priceUsd === 0 ? (
              <div className="text-sm text-muted-foreground">
                Free тариф активируется мгновенно, без оплаты.
              </div>
            ) : (
              <>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Контакт для подтверждения</label>
                  <input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="@username в Telegram, email или телефон"
                    className="w-full bg-input border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring/40"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Способ оплаты</label>
                  <div className="grid grid-cols-3 gap-2">
                    {["Карта", "СБП", "Crypto"].map((m) => (
                      <button
                        key={m}
                        onClick={() => setMethod(m)}
                        className={`rounded-xl py-2 text-sm border transition ${method === m ? "border-primary bg-primary/10" : "border-border hover:bg-accent"}`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-1.5">
                  <label className="text-sm font-medium">Комментарий <span className="text-muted-foreground font-normal">(необязательно)</span></label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    rows={3}
                    placeholder="Уточнения по оплате…"
                    className="w-full bg-input border border-border rounded-xl px-3 py-2.5 outline-none focus:ring-2 focus:ring-ring/40 resize-none"
                  />
                </div>
                {err && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 text-destructive text-sm px-3 py-2">{err}</div>
                )}
              </>
            )}

            <div className="flex gap-2 pt-1">
              <button onClick={() => setCheckout(null)} className="flex-1 rounded-xl bg-secondary hover:bg-accent py-2.5 text-sm">Назад</button>
              {checkout.priceUsd === 0 ? (
                <button
                  onClick={() => { onSelected?.(checkout.id); setSent(true); }}
                  className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:opacity-90"
                >
                  Активировать
                </button>
              ) : (
                <button
                  disabled={sending}
                  onClick={submit}
                  className="flex-1 rounded-xl bg-primary text-primary-foreground py-2.5 text-sm font-medium hover:opacity-90 disabled:opacity-60"
                >
                  {sending ? "Отправка…" : `Отправить заявку`}
                </button>
              )}
            </div>
          </div>
        )}

        {checkout && sent && (
          <div className="p-6 text-center space-y-3">
            <div className="h-14 w-14 rounded-full bg-primary/15 text-primary mx-auto flex items-center justify-center">
              <Check className="h-7 w-7" />
            </div>
            <div className="font-serif text-xl">
              {checkout.priceUsd === 0
                ? "Free активирован"
                : confirmed
                ? `Тариф ${checkout.label} выдан 🎉`
                : rejected
                ? "Заявка отклонена"
                : "Заявка отправлена"}
            </div>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              {checkout.priceUsd === 0
                ? "Тариф Free уже активен на вашем устройстве."
                : confirmed
                ? "Оплата подтверждена менеджером. Тариф активирован на вашем устройстве."
                : rejected
                ? "Свяжитесь с менеджером или попробуйте другой способ оплаты."
                : "Мы получили вашу заявку. Менеджер свяжется с вами для подтверждения оплаты и активации тарифа."}
            </p>
            {!confirmed && !rejected && checkout.priceUsd !== 0 && (
              <div className="text-xs text-muted-foreground flex items-center justify-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary animate-pulse" />
                Ожидаем подтверждение оплаты…
              </div>
            )}
            <button onClick={close} className="rounded-xl bg-primary text-primary-foreground py-2.5 px-5 text-sm font-medium hover:opacity-90">
              {confirmed ? "Отлично" : "Закрыть"}
            </button>
          </div>
        )}

        <div className="p-3 border-t border-border text-[11px] text-muted-foreground text-center flex items-center justify-center gap-1">
          <Lock className="h-3 w-3" /> Оплата вручную через менеджера · Seulop
        </div>
      </div>
    </div>
  );
}