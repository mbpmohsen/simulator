"use client";

import * as React from "react";
import { useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { Badge } from "@workspace/ui/components/badge";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { Input } from "@workspace/ui/components/input";
import { Copy, Download, Shield, Swords, CheckCircle2, CircleAlert, Sparkles, Coins, KeyRound } from "lucide-react";
import { ConfigureAllResponse } from "@/types/types";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  data: ConfigureAllResponse;
};

export default function AdminResultDialog({ isOpen, onClose, data }: Props) {
  const jsonPretty = useMemo(() => JSON.stringify(data, null, 2), [data]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(jsonPretty);
    } catch {}
  };

  const handleDownload = () => {
    const blob = new Blob([jsonPretty], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const now = new Date();
    a.href = url;
    a.download = `configure_all_response_${now.toISOString().replace(/[:.]/g, "-")}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const attackEntries = Object.entries(data.actions.attack || {});
  const defenseEntries = Object.entries(data.actions.defense || {});
  const bmItems = data.black_market_items || [];

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent
        className="max-w-6xl bg-gray-950 border-gray-800 p-0 gap-0 max-h-[92vh] overflow-hidden"
        dir="rtl"
      >
        <DialogHeader className="px-6 py-4 border-b border-gray-800">
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white text-xl flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-cyan-400" />
              نتیجه ثبت پیکربندی
            </DialogTitle>

            <div className="flex items-center gap-2">
              <Button variant="ghost" onClick={handleCopy} className="text-gray-300 hover:text-white">
                <Copy className="w-4 h-4 ml-2" /> کپی JSON
              </Button>
              <Button onClick={handleDownload} className="bg-cyan-600 hover:bg-cyan-700">
                <Download className="w-4 h-4 ml-2" /> دانلود JSON
              </Button>
            </div>
          </div>
          <p className="text-sm text-gray-400 mt-1 text-left">{data.detail}</p>
        </DialogHeader>

        <div className="grid grid-cols-5 gap-0">
          {/* LEFT rail: quick metrics */}
          <aside className="col-span-2 border-l border-gray-800 p-4 space-y-4 bg-gradient-to-b from-gray-900/60 to-black/60">
            {/* Credits */}
            <section className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm text-gray-300 flex items-center gap-2">
                  <Coins className="w-4 h-4 text-amber-400" />
                  تخصیص اعتبار
                </h3>
              </div>
              <div className="space-y-2">
                {Object.entries(data.credits_allocation).map(([side, credits]) => (
                  <div key={side} className="flex items-center justify-between bg-gray-800/60 rounded-lg px-3 py-2">
                    <span className="text-gray-200 text-sm">{side}</span>
                    <Badge variant="outline" className="text-amber-300 border-amber-700/40">
                      {credits}
                    </Badge>
                  </div>
                ))}
              </div>
            </section>

            {/* Action codes */}
            <section className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm text-gray-300 flex items-center gap-2 mb-3">
                <KeyRound className="w-4 h-4 text-violet-400" />
                کدهای اکشن
              </h3>
              <ScrollArea className="h-44 pr-2">
                <div className="space-y-2">
                  {Object.entries(data.action_codes).map(([code, [side, action]]) => (
                    <div key={code} className="flex items-center justify-between bg-gray-800/60 rounded-lg px-3 py-2">
                      <Badge
                        variant="outline"
                        className={`border-gray-700 ${side === "attack" ? "text-red-300" : "text-blue-300"}`}
                      >
                        {side === "attack" ? "حمله" : "دفاع"}
                      </Badge>
                      <span className="text-gray-200 text-sm font-mono">{action}</span>
                      <span className="text-gray-400 text-xs ltr:font-mono">#{code}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </section>

            {/* Black market item codes */}
            <section className="bg-gray-900/60 border border-gray-800 rounded-xl p-4">
              <h3 className="text-sm text-gray-300 flex items-center gap-2 mb-3">
                <KeyRound className="w-4 h-4 text-rose-400" />
                کدهای بازار سیاه
              </h3>
              <ScrollArea className="h-40 pr-2">
                <div className="space-y-2">
                  {Object.entries(data.black_market_item_codes).map(([code, [, name]]) => (
                    <div key={code} className="flex items-center justify-between bg-gray-800/60 rounded-lg px-3 py-2">
                      <Badge variant="outline" className="text-rose-300 border-rose-700/40">بازار سیاه</Badge>
                      <span className="text-gray-200 text-sm">{name}</span>
                      <span className="text-gray-400 text-xs ltr:font-mono">#{code}</span>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </section>
          </aside>

          {/* RIGHT content */}
          <main className="col-span-3 p-4">
            <ScrollArea className="h-[72vh] pr-4">
              {/* Player codes */}
              <section className="mb-5">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-white text-base flex items-center gap-2">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    بازیکنان و کدها
                  </h3>
                  <div className="w-72">
                    <Input
                      placeholder="جستجوی بازیکن…"
                      className="bg-gray-900 border-gray-800 text-gray-200"
                      onChange={(e) => {
                        const q = e.currentTarget.value.trim();
                        const groups = document.querySelectorAll<HTMLElement>("[data-player-group]");
                        groups.forEach((g) => {
                          const items = g.querySelectorAll<HTMLElement>("[data-player-item]");
                          let any = false;
                          items.forEach((it) => {
                            const name = it.dataset.name || "";
                            const code = it.dataset.code || "";
                            const show = !q || name.includes(q) || code.includes(q);
                            it.style.display = show ? "" : "none";
                            if (show) any = true;
                          });
                          g.style.display = any ? "" : "none";
                        });
                      }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {Object.entries(data.player_codes).map(([team, list]) => (
                    <div key={team} data-player-group className="bg-gray-900/60 border border-gray-800 rounded-xl">
                      <div className="px-4 py-3 flex items-center justify-between border-b border-gray-800">
                        <span className="text-gray-200 font-semibold">{team}</span>
                        <Badge variant="outline" className="text-gray-300 border-gray-700">{list.length} بازیکن</Badge>
                      </div>
                      <div className="p-3 space-y-2">
                        {list.map((p) => (
                          <div
                            key={p.code}
                            data-player-item
                            data-name={p.name}
                            data-code={p.code}
                            className="flex items-center justify-between bg-gray-800/60 rounded-lg px-3 py-2"
                          >
                            <span className="text-gray-200">{p.name}</span>
                            <span className="text-gray-400 text-xs ltr:font-mono">{p.code}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Actions */}
              <section className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Swords className="w-5 h-5 text-red-400" />
                  <h3 className="text-white text-base">اکشن‌های حمله</h3>
                </div>
                {attackEntries.length === 0 ? (
                  <div className="text-gray-500 text-sm flex items-center gap-2">
                    <CircleAlert className="w-4 h-4" /> چیزی ثبت نشده است
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {attackEntries.map(([name, cfg]) => (
                      <div key={name} className="bg-gray-900/60 border border-gray-800 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-200 font-semibold">{name}</span>
                          <Badge variant="outline" className="text-red-300 border-red-800/40">ATTACK</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <KV label="احتمال" value={`${cfg.probability}%`} />
                          <KV label="هزینه" value={cfg.cost} />
                          <KV label="کانتر" value={cfg.counter_actions || "—"} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="mb-5">
                <div className="flex items-center gap-2 mb-3">
                  <Shield className="w-5 h-5 text-blue-400" />
                  <h3 className="text-white text-base">اکشن‌های دفاع</h3>
                </div>
                {defenseEntries.length === 0 ? (
                  <div className="text-gray-500 text-sm flex items-center gap-2">
                    <CircleAlert className="w-4 h-4" /> چیزی ثبت نشده است
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {defenseEntries.map(([name, cfg]) => (
                      <div key={name} className="bg-gray-900/60 border border-gray-800 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-200 font-semibold">{name}</span>
                          <Badge variant="outline" className="text-blue-300 border-blue-800/40">DEFENSE</Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <KV label="احتمال" value={`${cfg.probability}%`} />
                          <KV label="هزینه" value={cfg.cost} />
                          <KV label="کانتر" value={cfg.counter_actions || "—"} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Black market items */}
              <section className="mb-6">
                <div className="flex items-center gap-2 mb-3">
                  <Sparkles className="w-5 h-5 text-rose-400" />
                  <h3 className="text-white text-base">آیتم‌های بازار سیاه</h3>
                </div>
                {bmItems.length === 0 ? (
                  <div className="text-gray-500 text-sm flex items-center gap-2">
                    <CircleAlert className="w-4 h-4" /> چیزی ثبت نشده است
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {bmItems.map((it, idx) => (
                      <div key={`${it.name}-${idx}`} className="bg-gray-900/60 border border-gray-800 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-gray-200 font-semibold">{it.name}</span>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline" className="text-rose-300 border-rose-800/40">{it.item_type}</Badge>
                            <Badge variant="outline" className="text-cyan-300 border-cyan-800/40">{it.effect_type}</Badge>
                          </div>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm">
                          <KV label="هدف" value={`${it.target_action_type} → ${it.target_action}`} />
                          <KV label="مقدار" value={it.value} />
                          <KV label="مدت" value={`${it.duration}`} />
                          <KV label="هزینه" value={it.cost} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              {/* Raw JSON peek (collapsible feel) */}
              <details className="bg-gray-900/50 border border-gray-800 rounded-xl">
                <summary className="cursor-pointer select-none list-none px-4 py-3 text-sm text-gray-300">
                  نمایش JSON کامل
                </summary>
                <pre className="text-xs p-4 text-gray-300 overflow-x-auto">{jsonPretty}</pre>
              </details>
            </ScrollArea>

            <div className="flex justify-end gap-2 mt-4">
              <Button variant="ghost" onClick={onClose} className="text-gray-300 hover:text-white">بستن</Button>
            </div>
          </main>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function KV({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="bg-gray-800/60 rounded-lg px-3 py-2">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-gray-200 text-sm ltr:font-mono">{value ?? "—"}</div>
    </div>
  );
}
