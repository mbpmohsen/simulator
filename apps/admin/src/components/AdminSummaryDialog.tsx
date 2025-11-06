"use client";
import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@workspace/ui/components/dialog";
import { Button } from "@workspace/ui/components/button";
import { ScrollArea } from "@workspace/ui/components/scroll-area";
import { useGameConfigStore } from "@/store/store";
import type { ConfigureAllResponse } from "@/types/types";

/**
 * AdminSummaryDialog: cleans and sends final payload to backend
 *
 * Behavior:
 *  - Removes empty-action keys (""), or renames them to a normalized name.
 *  - Normalizes action keys (UPPER_UNDERSCORE).
 *  - Attempts to map technique/tactic string names -> numeric IDs by fetching /api/attack-data
 *    (if your API exposes technique IDs in that endpoint). If we can't map, we drop those fields
 *    to avoid the server validation error (you may prefer to fail instead).
 *  - Sends POST and displays response.
 */

export default function AdminSummaryDialog({
  isOpen,
  onClose,
  onSuccess
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (data: ConfigureAllResponse) => void;
}) {
  const config = useGameConfigStore((s) => s.config);
  const [loading, setLoading] = useState(false);
  const [respMsg, setRespMsg] = useState<string | null>(null);
  const [attackTechMap, setAttackTechMap] = useState<Record<string, number>>({});
  const [tacticMap, setTacticMap] = useState<Record<string, number>>({});

  // Try to fetch attack-data to build name -> id maps (best-effort).
  useEffect(() => {
    const buildMaps = async () => {
      try {
        const res = await fetch("/api/attack-data?lang=fa");
        if (!res.ok) return;
        const groups = await res.json();
        // groups assumed: array of { id, name, techniques: [{ id, name }], tactics: [ 'Execution', ... ] }
        const tmap: Record<string, number> = {};
        const tacmap: Record<string, number> = {};
        // attempt to collect technique ids (if present)
        for (const g of groups || []) {
          if (Array.isArray(g.techniques)) {
            for (const tech of g.techniques) {
              // normalize key by exact name and also fallback to uppercase underscore
              if (tech && tech.name && tech.id != null) {
                tmap[tech.name] = Number(tech.id);
                tmap[String(tech.id)] = Number(tech.id); // also map id->id
                tmap[normalizeKey(tech.name)] = Number(tech.id);
              }
            }
          }
          // some sources include tactics as strings or objects
          if (Array.isArray(g.tactics)) {
            for (const [idx, tac] of g.tactics.entries()) {
              // tactics might not have stable ids; we create synthetic ids if none provided.
              // If the tactic is an object with id, use it.
              if (tac && typeof tac === "object" && tac.id) {
                tacmap[tac.name] = Number(tac.id);
                tacmap[normalizeKey(tac.name)] = Number(tac.id);
              } else if (typeof tac === "string") {
                // generate synthetic id (not ideal) — only if server expects numeric ids that match your data.
                // We prefer not to invent ids; instead map name->index+1 as fallback.
                tacmap[tac] = idx + 1;
                tacmap[normalizeKey(tac)] = idx + 1;
              }
            }
          }
        }
        setAttackTechMap(tmap);
        setTacticMap(tacmap);
      } catch (e) {
        // ignore — mapping is optional. We'll fallback to removing technique/tactic arrays.
        console.warn("Failed to build ATT&CK maps:", e);
      }
    };

    if (isOpen) buildMaps();
  }, [isOpen]);

  function normalizeKey(name: string) {
    if (!name) return "";
    return String(name).trim().toUpperCase().replace(/\s+/g, "_").replace(/[^A-Z0-9_]/g, "");
  }

  // Clean + prepare payload for server
  const preparePayload = (raw: any) => {
    // deep clone
    const payload = JSON.parse(JSON.stringify(raw || {}));

    // 1) Remove empty action keys in payload.actions.attack / defense
    if (payload.actions) {
      ["attack", "defense"].forEach((side) => {
        if (!payload.actions[side]) return;
        const keys = Object.keys(payload.actions[side]);
        for (const k of keys) {
          if (k === "" || k == null) {
            const val = payload.actions[side][k];
            // Option A: delete it to avoid backend schema complaints:
            delete payload.actions[side][k];

            // Option B (if you want): rename to a safe key
            // const safe = normalizeKey("CUSTOM_ACTION");
            // payload.actions[side][safe] = val;
          } else {
            // normalize keys to uppercase underscore, e.g. "SQL Injection" -> "SQL_INJECTION"
            const normalized = normalizeKey(k);
            if (normalized !== k) {
              payload.actions[side][normalized] = payload.actions[side][k];
              delete payload.actions[side][k];
            }
          }
        }
      });
    }

    // 2) Convert techniques & tactics arrays from names -> numeric ids (if mapping available).
    // If mapping isn't available for an item, we delete the field to avoid validation errors.
    if (payload.actions) {
      for (const side of ["attack", "defense"]) {
        const actionsObj = payload.actions[side];
        if (!actionsObj) continue;
        for (const [actionName, cfg] of Object.entries(actionsObj as Record<string, any>)) {
          if (!cfg || typeof cfg !== "object") continue;

          // techniques
          if (Array.isArray(cfg.techniques)) {
            const mappedTech: number[] = [];
            for (const t of cfg.techniques) {
              // try direct mapping by original name or normalized name
              const byName = attackTechMap[t];
              const byNorm = attackTechMap[normalizeKey(t)];
              if (byName !== undefined) mappedTech.push(Number(byName));
              else if (byNorm !== undefined) mappedTech.push(Number(byNorm));
              else if (!isNaN(Number(t))) mappedTech.push(Number(t)); // maybe already an id
              else {
                // unknown mapping — skip
                console.warn("Unknown technique mapping for:", t);
              }
            }
            if (mappedTech.length > 0) payload.actions[side][actionName].techniques = mappedTech;
            else delete payload.actions[side][actionName].techniques;
          }

          // tactics
          if (Array.isArray(cfg.tactics)) {
            const mappedTac: number[] = [];
            for (const tac of cfg.tactics) {
              const byName = tacticMap[tac];
              const byNorm = tacticMap[normalizeKey(tac)];
              if (byName !== undefined) mappedTac.push(Number(byName));
              else if (byNorm !== undefined) mappedTac.push(Number(byNorm));
              else if (!isNaN(Number(tac))) mappedTac.push(Number(tac));
              else {
                console.warn("Unknown tactic mapping for:", tac);
              }
            }
            if (mappedTac.length > 0) payload.actions[side][actionName].tactics = mappedTac;
            else delete payload.actions[side][actionName].tactics;
          }
        }
      }
    }

    // 3) Normalize team growth/tech factors keys to match actions names if needed
    // e.g. if you renamed action keys above, apply same renaming to team_growth_factors & team_tech_factors
    const normalizeFactors = (factorsObj: any) => {
      if (!factorsObj || typeof factorsObj !== "object") return;
      for (const team of Object.keys(factorsObj)) {
        const teamEntry = factorsObj[team];
        if (!teamEntry) continue;
        for (const side of ["attack", "defense"]) {
          const sideEntry = teamEntry[side];
          if (!sideEntry) continue;
          for (const k of Object.keys(sideEntry)) {
            const nk = normalizeKey(k);
            if (nk !== k) {
              teamEntry[side][nk] = teamEntry[side][k];
              delete teamEntry[side][k];
            }
          }
        }
      }
    };
    normalizeFactors(payload.team_growth_factors);
    normalizeFactors(payload.team_tech_factors);

    return payload;
  };

  const handleSubmit = async () => {
    setRespMsg(null);
    setLoading(true);
    try {
      const prepared = preparePayload(config);

      // final local sanity: ensure required top-level fields exist
      // (optionally add additional validation here)
      const res = await fetch("http://185.252.86.33:8000/admin/configure_all", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(prepared),
      });

      const resultText = await res.text();
      try {
        const json = JSON.parse(resultText);
        onSuccess?.(json as ConfigureAllResponse);
        setRespMsg(JSON.stringify(json, null, 2));
      } catch {
        setRespMsg(resultText);
      }
      if (!res.ok) {
        console.error("Server error", res.status, resultText);
      }
    } catch (err: any) {
      setRespMsg("Client error: " + String(err?.message || err));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-6xl bg-gray-900 border-gray-700 p-0 gap-0 max-h-[90vh] overflow-hidden" dir="rtl">
        <DialogHeader className="px-6 py-4 border-b border-gray-700">
          <DialogTitle className="text-white text-xl text-right">مرور نهایی و ارسال پیکربندی</DialogTitle>
        </DialogHeader>

        <ScrollArea className="p-6 h-[70vh] text-gray-200 space-y-6">
          <section>
            <h3 className="text-lg font-semibold text-blue-400 mb-2">👥 تیم‌ها و بازیکنان</h3>
            <pre className="bg-gray-800 p-3 rounded text-sm overflow-x-auto">{JSON.stringify(config.teams_and_players, null, 2)}</pre>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-green-400 mb-2">⚙️ پیکربندی بازی</h3>
            <pre className="bg-gray-800 p-3 rounded text-sm overflow-x-auto">{JSON.stringify({
              side_names: config.side_names,
              side_credits: config.side_credits,
              num_turns: config.num_turns,
              point_threshold: config.point_threshold,
            }, null, 2)}</pre>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-yellow-400 mb-2">🧠 اعمال حمله و دفاع (پیش‌نمایش)</h3>
            <pre className="bg-gray-800 p-3 rounded text-sm overflow-x-auto">{JSON.stringify(config.actions, null, 2)}</pre>
          </section>

          <section>
            <h3 className="text-lg font-semibold text-pink-400 mb-2">🛒 بازار سیاه</h3>
            <pre className="bg-gray-800 p-3 rounded text-sm overflow-x-auto">{JSON.stringify(config.black_market_items, null, 2)}</pre>
          </section>

          {respMsg && (
            <div className="bg-gray-800 border border-gray-700 p-3 rounded text-xs whitespace-pre-wrap">
              {respMsg}
            </div>
          )}
        </ScrollArea>

        <div className="flex justify-end gap-3 p-4 border-t border-gray-700">
          <Button onClick={onClose} variant="ghost" className="text-gray-400 hover:text-white">لغو</Button>
          <Button onClick={handleSubmit} disabled={loading} className="bg-blue-600 hover:bg-blue-700">
            {loading ? "در حال ارسال..." : "ارسال نهایی"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
