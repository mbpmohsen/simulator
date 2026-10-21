#!/usr/bin/env python3
"""Builds a Stuxnet / Natanz plan from the demo plan by renaming and relabelling.

Numbers are never touched, so the equilibrium tuned for the demo still holds.
Everything that cannot be safely reproduced - visibility_config, effect shapes,
requirement blocks - is copied, not invented.
"""
from __future__ import annotations
import argparse, json, sys
from collections import OrderedDict
from pathlib import Path

SIDE_NAMES = {"red": ("Operation", "عملیات مهاجم"), "blue": ("Natanz", "تأسیسات نطنز")}
TEAM_NAMES = {
    ("red", "GOVERNMENT"): ("Sponsor State", "دولت پشتیبان"),
    ("red", "PLAYER"): ("Operations Cell", "تیم عملیات"),
    ("blue", "GOVERNMENT"): ("Facility Authority", "سازمان بهره‌برداری"),
    ("blue", "PLAYER"): ("Plant Security", "تیم پدافند تأسیسات"),
}
SECOND_BLUE_TEAM = ("Control Room", "تیم اتاق کنترل")

ACTIONS = OrderedDict([
    # Persian here is the operative language of the UI, so the terms are the
    # ones used in Persian security writing - not word-for-word renderings of
    # the English. "Air gap" in particular has no literal Persian equivalent
    # that carries its meaning; it is described as an isolated network.
    ("ATK_PROBE_ACCESS", ("ATK_SUPPLY_MEDIA", "Supply Chain — Removable Media",
        "زنجیرهٔ تأمین — حافظهٔ جداشدنی",
        "آلوده‌کردن حافظهٔ جداشدنی یک پیمانکار، تا بدافزار بار اول وارد شبکه‌ای شود که هیچ اتصالی به بیرون ندارد.")),
    ("ATK_DISRUPT_WORKFLOW", ("ATK_LATERAL_ZERODAY", "Lateral Movement — Zero Day",
        "حرکت جانبی — آسیب‌پذیری روز صفر",
        "رسیدن از ایستگاه کاری اداری به شبکهٔ کنترل صنعتی، با نقصی که هنوز وصله‌ای برایش منتشر نشده است.")),
    ("ATK_BLACKOUT_SERVICE", ("ATK_ROTOR_SABOTAGE", "Rotor Sabotage — Speed Manipulation",
        "دستکاری دور سانتریفیوژ",
        "تغییر فرکانس درایوهای کنترل دور تا سانتریفیوژها از کار بیفتند، در حالی که اتاق کنترل همان اعداد همیشگی را می‌بیند.")),
    ("DEF_HARDEN_IDENTITY", ("DEF_MEDIA_CONTROL", "Removable Media Control",
        "کنترل حافظه‌های جداشدنی",
        "محدودکردن و بازرسی هر حافظه‌ای که وارد محوطه می‌شود.")),
    ("DEF_CONTAIN_TRIAGE", ("DEF_NETWORK_SEGMENT", "Control Network Segmentation",
        "جداسازی شبکهٔ کنترل",
        "قطع مسیر میان شبکهٔ اداری و شبکهٔ کنترل صنعتی، تا حرکت جانبی ممکن نباشد.")),
    ("DEF_RESTORE_CONTINUITY", ("DEF_SENSOR_INTEGRITY", "Sensor Data Integrity",
        "صحت‌سنجی دادهٔ سنسور",
        "مقایسهٔ آنچه کنترل‌کننده گزارش می‌دهد با اندازه‌گیری مستقل — تنها راهی که دستکاری پنهان دیده می‌شود.")),
])

MARKET = {
    # Each item keeps the demo's target action, so the name has to follow the
    # target - otherwise a "stolen certificate" ends up boosting the wrong move.
    "BM_RED_RECON_DOSSIER": ("BM_RED_CENTRIFUGE_DOSSIER", "Centrifuge Dossier", "پروندهٔ فنی سانتریفیوژ",
        "نقشهٔ دقیق آرایش و فرکانس کاری سانتریفیوژها — بدون آن، دستکاری سرعت فقط یک حدس است."),
    "BM_RED_COVER_TOKEN": ("BM_RED_STOLEN_CERT", "Stolen Code-Signing Certificate", "گواهی امضای کد سرقتی",
        "درایور امضاشده با گواهی یک شرکت معتبر، هنگام ورود از حافظهٔ جداشدنی به چشم نمی‌آید."),
    "BM_RED_PRESSURE_VOUCHER": ("BM_RED_INSIDER_ACCESS", "Insider Access", "دسترسی فرد خودی",
        "همکاری یک پیمانکار، که هزینهٔ رسیدن به شبکهٔ کنترل را پایین می‌آورد."),
    "BM_BLUE_CONTINUITY_DRILL": ("BM_BLUE_INDEPENDENT_TELEMETRY", "Independent Telemetry", "تله‌متری مستقل",
        "اندازه‌گیری خارج از زنجیرهٔ کنترل‌کننده، که نمی‌شود از داخل جعلش کرد."),
    "BM_BLUE_IDENTITY_AUDIT": ("BM_BLUE_MEDIA_AUDIT", "Removable Media Audit", "ممیزی حافظه‌های جداشدنی",
        "ردگیری اینکه هر حافظه از کجا آمده و به کدام دستگاه خورده است."),
    "BM_BLUE_TRIAGE_BUDGET": ("BM_BLUE_SEGMENT_BUDGET", "Emergency Segmentation Budget", "بودجهٔ جداسازی اضطراری",
        "پول و مجوز برای اینکه جداسازی شبکه این بار واقعاً انجام شود، نه اینکه به جلسهٔ بعد بیفتد."),
}

GOALS = {
    "red": ("Halt enrichment without firing a shot", "توقف غنی‌سازی بدون شلیک یک گلوله",
        "آسیب فیزیکی به تأسیسات، به‌گونه‌ای که ماه‌ها به‌جای حمله، نقص فنی به نظر برسد."),
    "blue": ("Keep enrichment running, and the data honest", "حفظ تداوم غنی‌سازی و درستی داده‌ها",
        "تولید متوقف نشود، و آنچه اتاق کنترل می‌بیند همان چیزی باشد که واقعاً رخ می‌دهد."),
}
SUBJECTS = {"red": ("Natanz enrichment facility", "تأسیسات غنی‌سازی نطنز",
                    "سه لایه‌ای که برای رسیدن به سانتریفیوژها باید یکی‌یکی رد شوند."),
            "blue": ("Natanz defensive posture", "وضعیت دفاعی نطنز",
                    "سه لایه‌ای که اگر یکی‌شان بشکند، بعدی تنها می‌ماند.")}
STAGES = [("Contractor workstations", "ایستگاه‌های کاری پیمانکار"),
          ("Industrial control network", "شبکهٔ کنترل صنعتی"),
          ("Centrifuge control system", "سامانهٔ کنترل سانتریفیوژ")]
SCENARIOS = {"red": [("Cross the air gap", "نفوذ به شبکهٔ ایزوله"),
                     ("Reach the controllers", "رسیدن به کنترل‌کننده‌ها"),
                     ("Break the centrifuges", "از کار انداختن سانتریفیوژها")],
             "blue": [("Close the media path", "بستن مسیر حافظه‌های جداشدنی"),
                      ("Cut the lateral path", "قطع مسیر حرکت جانبی"),
                      ("Trust the readings", "راستی‌آزمایی اعداد")]}
STAGE_SLUGS = ["WORKSTATION", "CONTROLNET", "CENTRIFUGE"]


def role_of(team):
    r = team.get("role"); r = r if isinstance(r, str) else r.get("type")
    return "GOVERNMENT" if r == "GOVERNMENT" else "PLAYER"


def side_key(demo, side_id):
    for t in demo.get("teams", []):
        if t.get("side_id") != side_id:
            continue
        r = t.get("role"); r = r if isinstance(r, str) else r.get("type")
        if r == "ATTACKER":
            return "red"
        if r == "DEFENCER":
            return "blue"
    sides = sorted({t.get("side_id") for t in demo["teams"] if t.get("side_id")})
    return "red" if sides and side_id == sides[0] else "blue"



def _rename_with_actions(identifier: str, mapping: dict) -> str:
    """
    Rewrites a demo move's words inside another id.

    Ids like GOV_BLUE_BAN_BLACKOUT and COUNTER_PROBE name a move by one word,
    not by its full code, so both the whole tail (PROBE_ACCESS) and its first
    word (PROBE) have to be swapped - longest first, or PROBE would eat the
    front of PROBE_ACCESS and leave a stump.
    """
    pairs: list[tuple[str, str]] = []
    for old, new in mapping.items():
        if not old.startswith(("ATK_", "DEF_")):
            continue
        old_tail, new_tail = old.split("_", 1)[1], new.split("_", 1)[1]
        pairs.append((old_tail, new_tail))
        pairs.append((old_tail.split("_")[0], new_tail.split("_")[0]))
    out = identifier
    for old_part, new_part in sorted(pairs, key=lambda x: -len(x[0])):
        out = out.replace(old_part, new_part)
    return out


def build_id_map(demo):
    m = {}
    for old, (new, *_r) in ACTIONS.items():
        m[old] = new
    for old, (new, *_r) in MARKET.items():
        m[old] = new
    goal_side = {}
    for g in demo["goals"]:
        k = side_key(demo, g["side_id"]); goal_side[g["id"]] = k
        m[g["id"]] = f"GOAL_{k.upper()}_STUXNET"
    subj_side = {}
    for s in demo["subjects"]:
        k = goal_side.get(s["goal_id"], "red"); subj_side[s["id"]] = k
        m[s["id"]] = f"SUBJ_{k.upper()}_NATANZ"
    sub_side, per = {}, {}
    for s in demo["sub_subjects"]:
        k = subj_side.get(s["subject_id"], "red"); i = per.get(k, 0); per[k] = i + 1
        sub_side[s["id"]] = (k, i)
        m[s["id"]] = f"SS_{k.upper()}_{STAGE_SLUGS[i % len(STAGE_SLUGS)]}"
    scen_side = {}
    for s in demo["scenarios"]:
        k, i = sub_side.get(s["sub_subject_id"], ("red", 0))
        scen_side[s["id"]] = (k, i)
        m[s["id"]] = f"SCN_{k.upper()}_{STAGE_SLUGS[i % len(STAGE_SLUGS)]}"
    per_scn = {}
    for st in demo["scenario_steps"]:
        parent = m.get(st["scenario_id"], st["scenario_id"])
        i = per_scn.get(parent, 0); per_scn[parent] = i + 1
        act = m.get(st.get("action_code", ""), st.get("action_code", ""))
        suffix = act.split("_", 1)[-1] if act else "STEP"
        m[st["id"]] = f"{parent.replace('SCN_', 'STEP_')}_{suffix}_{i + 1:02d}"
    for r in demo.get("impact_rules", []):
        if "id" in r:
            m[r["id"]] = "IMPACT_MEDIA_CONTROL_REVEALS_SUPPLY"
    # Ids elsewhere that were named after demo moves: government action codes
    # and counter ids. They are not labels, but they leak into payloads and
    # into the JSON view, and a Stuxnet plan carrying BAN_BLACKOUT reads wrong.
    for gov_action in (demo.get("government") or {}).get("actions", []) or []:
        code = gov_action.get("code")
        if code:
            m[code] = _rename_with_actions(code, m)
    for counter in demo.get("action_counters", []):
        cid = counter.get("id")
        if cid:
            m[cid] = _rename_with_actions(cid, m)
    return m, goal_side, subj_side, sub_side, scen_side


def remap(v, m):
    if isinstance(v, str):
        return m.get(v, v)
    if isinstance(v, list):
        return [remap(x, m) for x in v]
    if isinstance(v, dict):
        return {k: remap(x, m) for k, x in v.items()}
    return v


def relabel(plan, demo, goal_side, subj_side, sub_side, scen_side, m):
    for t in plan["teams"]:
        k = side_key(demo, t.get("side_id"))
        lat, fa = SIDE_NAMES[k]
        t["side_name"], t["side_name_fa"] = lat, fa
        nl, nf = TEAM_NAMES[(k, role_of(t))]
        t["name"], t["name_fa"] = nl, nf
        if "display_name" in t: t["display_name"] = nl
        if "display_name_fa" in t: t["display_name_fa"] = nf
    by_new = {n: (l, f, d) for (n, l, f, d) in ACTIONS.values()}
    for a in plan["actions"]:
        e = by_new.get(a.get("code"))
        if not e: continue
        a["name"], a["name_fa"], a["description_fa"] = e[0], e[1], e[2]
        a["description"] = e[0]
    mk = {n: (l, f, d) for (n, l, f, d) in MARKET.values()}
    for it in plan.get("black_market", []):
        e = mk.get(it.get("code"))
        if not e: continue
        it["name"], it["name_fa"] = e[0], e[1]
        it["description"], it["description_fa"] = e[0], e[2]
    for g in plan["goals"]:
        k = "red" if "_RED_" in g["id"] else "blue"
        l, f, d = GOALS[k]
        g["title"], g["title_fa"], g["description"], g["description_fa"] = l, f, l, d
    for s in plan["subjects"]:
        k = "red" if "_RED_" in s["id"] else "blue"
        l, f, d = SUBJECTS[k]
        s["title"], s["title_fa"], s["description"], s["description_fa"] = l, f, l, d
    for old, (k, i) in sub_side.items():
        new = m[old]
        for s in plan["sub_subjects"]:
            if s["id"] == new:
                l, f = STAGES[i % len(STAGES)]
                s["title"], s["title_fa"] = l, f
    for old, (k, i) in scen_side.items():
        new = m[old]
        for s in plan["scenarios"]:
            if s["id"] == new:
                l, f = SCENARIOS[k][i % len(SCENARIOS[k])]
                s["title"], s["title_fa"] = l, f


def split_blue_team(plan):
    blue = None
    for t in plan["teams"]:
        r = t.get("role"); r = r if isinstance(r, str) else r.get("type")
        if r == "DEFENCER":
            blue = t; break
    if blue is None:
        print("! no DEFENCER team; --blue-teams 2 ignored", file=sys.stderr); return
    total = blue.get("starting_credits", 0); first = total // 2
    blue["starting_credits"] = first
    clone = json.loads(json.dumps(blue)); clone["id"] = blue["id"] + 1
    l, f = SECOND_BLUE_TEAM
    clone["name"], clone["name_fa"] = l, f
    if "display_name" in clone: clone["display_name"] = l
    if "display_name_fa" in clone: clone["display_name_fa"] = f
    clone["starting_credits"] = total - first; clone["players"] = []
    plan["teams"].append(clone)
    for a in plan["actions"]:
        allowed = a.get("requirements", {}).get("allowed_team_ids")
        if allowed and blue["id"] in allowed and clone["id"] not in allowed:
            allowed.append(clone["id"])


def self_check(plan):
    p = []
    ids = [x["id"] for key in ("goals", "subjects", "sub_subjects", "scenarios", "scenario_steps")
           for x in plan.get(key, [])]
    dup = {i for i in ids if ids.count(i) > 1}
    if dup: p.append(f"duplicate ids: {sorted(dup)[:5]}")
    for sid in {s["id"] for s in plan["subjects"]}:
        sh = sum(s.get("progress_share", 0) for s in plan["sub_subjects"] if s["subject_id"] == sid)
        if sh != 100: p.append(f"{sid}: shares sum to {sh}")
    codes = {a["code"] for a in plan["actions"]}
    bad = {s.get("action_code") for s in plan["scenario_steps"] if s.get("action_code") not in codes}
    if bad: p.append(f"steps point at unknown actions: {sorted(bad)}")
    tids = {t.get("id") for t in plan["teams"]}
    for s in plan["subjects"]:
        if s.get("target_team_id") not in tids: p.append(f"{s['id']}: target team missing")
    if len(plan.get("visibility_config", {}).get("events", {})) < 60:
        p.append("visibility_config lost its events")
    return p


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--demo", required=True, type=Path)
    ap.add_argument("--out", required=True, type=Path)
    ap.add_argument("--turns", type=int, default=6)
    ap.add_argument("--threshold", type=int, default=5)
    ap.add_argument("--blue-teams", type=int, default=1, choices=(1, 2))
    a = ap.parse_args()
    demo = json.loads(a.demo.read_text(encoding="utf-8"))
    m, gs, ss, sub_s, scn_s = build_id_map(demo)
    plan = remap(json.loads(json.dumps(demo)), m)
    relabel(plan, demo, gs, ss, sub_s, scn_s, m)
    c = plan.setdefault("game_config", {})
    c["num_turns"], c["point_threshold"], c["time_unit"] = a.turns, a.threshold, "month"
    v = c.get("victory_conditions")
    if isinstance(v, dict):
        if "max_turns" in v: v["max_turns"] = a.turns
        if "points_to_win" in v: v["points_to_win"] = a.threshold
    if a.blue_teams == 2: split_blue_team(plan)
    probs = self_check(plan)
    a.out.write_text(json.dumps(plan, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {a.out}")
    print(f"  teams {len(plan['teams'])} · actions {len(plan['actions'])} · steps {len(plan['scenario_steps'])} · vis {len(plan['visibility_config']['events'])}")
    for act in plan["actions"]:
        b = act.get("base_stats", {})
        print(f"    {act['code']:<22} {act.get('name_fa','')}  cost {b.get('cost')} p {b.get('success_probability')} pts {b.get('points_on_success')}")
    if probs:
        print("\n! self-check:", file=sys.stderr)
        for x in probs: print("   -", x, file=sys.stderr)
        return 1
    print("\nself-check clean.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
