window.STATE =
{
  "version": 2,
  "slug": "substreamedu-autopilot-integration",
  "dir": "2026-11-02-substreamedu-autopilot-integration",
  "title": "Интеграция Autopilot и применение к SubStreamEdu",
  "mode": "semi",
  "depth": "normal",
  "tier": "T1",
  "briefFile": "2026-11-02-brief.md",
  "memoryFile": "AGENTS.md",
  "memoryOwner": "autopilot",
  "skillDir": "/Users/test/Desktop/substreamedu-go/.agents/skills/autopilot",
  "baseCommit": "77fe1575",
  "startedAt": "2026-11-02T01:23:35+02:00",
  "updatedAt": "2026-11-02T01:24:56+02:00",
  "finishedAt": "2026-11-02T01:24:56+02:00",
  "stages": [
    {
      "id": "preflight",
      "status": "done",
      "startedAt": "2026-11-02T01:23:35+02:00",
      "finishedAt": "2026-11-02T01:24:55+02:00"
    },
    {
      "id": "manifest",
      "status": "done",
      "startedAt": "2026-11-02T01:24:55+02:00",
      "finishedAt": "2026-11-02T01:24:55+02:00"
    },
    {
      "id": "briefing",
      "status": "skipped",
      "startedAt": "2026-11-02T01:24:55+02:00",
      "finishedAt": "2026-11-02T01:24:55+02:00",
      "note": "задача однозначна: установить nick-vels/skills и применить к проекту"
    },
    {
      "id": "spec",
      "status": "done",
      "startedAt": "2026-11-02T01:24:55+02:00",
      "finishedAt": "2026-11-02T01:24:55+02:00"
    },
    {
      "id": "plan",
      "status": "done",
      "startedAt": "2026-11-02T01:24:55+02:00",
      "finishedAt": "2026-11-02T01:24:55+02:00"
    },
    {
      "id": "build",
      "status": "done",
      "startedAt": "2026-11-02T01:24:55+02:00",
      "finishedAt": "2026-11-02T01:24:56+02:00"
    },
    {
      "id": "review",
      "status": "done",
      "startedAt": "2026-11-02T01:24:56+02:00",
      "finishedAt": "2026-11-02T01:24:56+02:00"
    },
    {
      "id": "final",
      "status": "done",
      "startedAt": "2026-11-02T01:24:56+02:00",
      "finishedAt": "2026-11-02T01:24:56+02:00"
    }
  ],
  "requirements": {
    "total": 3,
    "done": 3,
    "inTicket": 0,
    "inSpec": 0,
    "placeholder": 0,
    "deferred": 0,
    "dropped": 0
  },
  "tickets": [
    {
      "id": "01",
      "title": "Установка навыка Autopilot и регистрация воркфлоу",
      "requirements": [
        "R01",
        "R01.1"
      ],
      "blockedBy": [],
      "wave": 1,
      "zone": [
        ".agents/skills/autopilot/",
        ".agents/workflows/autopilot.md",
        "skills-lock.json"
      ],
      "review": "да — фундамент",
      "model": "сильная",
      "status": "done",
      "retries": 0,
      "repairs": 0,
      "startedAt": "2026-11-02T01:24:55+02:00",
      "finishedAt": "2026-11-02T01:24:56+02:00",
      "tests": {
        "passed": 340,
        "failed": 0
      },
      "commit": "77fe1575"
    },
    {
      "id": "02",
      "title": "Память проекта AGENTS.md, указатель CLAUDE.md и словарь CONTEXT.md",
      "requirements": [
        "R02",
        "R02.1"
      ],
      "blockedBy": [
        "01"
      ],
      "wave": 2,
      "zone": [
        "AGENTS.md",
        "CLAUDE.md",
        "CONTEXT.md"
      ],
      "review": "нет",
      "model": "обычная",
      "status": "done",
      "retries": 0,
      "repairs": 0,
      "startedAt": "2026-11-02T01:24:56+02:00",
      "finishedAt": "2026-11-02T01:24:56+02:00",
      "tests": {
        "passed": 340,
        "failed": 0
      },
      "commit": "77fe1575"
    },
    {
      "id": "03",
      "title": "Приборы сборки .autopilot, гейты G1–G4 и верификация проекта",
      "requirements": [
        "R03"
      ],
      "blockedBy": [
        "01",
        "02"
      ],
      "wave": 3,
      "zone": [
        ".autopilot/",
        ".gitignore",
        "context/feature_specs/65_autopilot_skill_and_project_integration.md"
      ],
      "review": "нет",
      "model": "обычная",
      "status": "done",
      "retries": 0,
      "repairs": 0,
      "startedAt": "2026-11-02T01:24:56+02:00",
      "finishedAt": "2026-11-02T01:24:56+02:00",
      "tests": {
        "passed": 340,
        "failed": 0
      },
      "commit": "77fe1575"
    }
  ],
  "tests": {
    "passed": 340,
    "failed": 0
  },
  "debt": {
    "placeholders": [],
    "assumptions": [],
    "emptyEnv": [
      "DEEPSEEK_API_KEY",
      "GROQ_API_KEY",
      "GEMINI_API_KEY",
      "SUBDL_API_KEY",
      "TELEGRAM_BOT_TOKEN"
    ]
  },
  "additions": [],
  "coverage": {
    "found": 0,
    "fixed": 0,
    "deferred": 0,
    "items": []
  },
  "concerns": [],
  "blind": {
    "checked": 3,
    "matched": 3,
    "mismatches": []
  },
  "beats": [
    "2026-11-02T01:23:35+02:00",
    "2026-11-02T01:24:55+02:00",
    "2026-11-02T01:24:56+02:00"
  ],
  "rev": 26,
  "waiting": null,
  "waits": [],
  "log": [
    {
      "t": "2026-11-02T01:23:35+02:00",
      "k": "init"
    },
    {
      "t": "2026-11-02T01:24:55+02:00",
      "k": "stage",
      "id": "manifest",
      "act": "start"
    },
    {
      "t": "2026-11-02T01:24:55+02:00",
      "k": "stage",
      "id": "briefing",
      "act": "skip",
      "note": "задача однозначна: установить nick-vels/skills и применить к проекту"
    },
    {
      "t": "2026-11-02T01:24:55+02:00",
      "k": "gate",
      "g": "G1",
      "ok": true,
      "open": 0,
      "total": 3
    },
    {
      "t": "2026-11-02T01:24:55+02:00",
      "k": "stage",
      "id": "spec",
      "act": "start"
    },
    {
      "t": "2026-11-02T01:24:55+02:00",
      "k": "gate",
      "g": "G2",
      "ok": true,
      "found": 0,
      "fixed": 0,
      "deferred": 0
    },
    {
      "t": "2026-11-02T01:24:55+02:00",
      "k": "stage",
      "id": "plan",
      "act": "start"
    },
    {
      "t": "2026-11-02T01:24:55+02:00",
      "k": "tier",
      "v": "T1"
    },
    {
      "t": "2026-11-02T01:24:55+02:00",
      "k": "tickets",
      "n": 3
    },
    {
      "t": "2026-11-02T01:24:55+02:00",
      "k": "gate",
      "g": "G3",
      "ok": true,
      "problems": 0
    },
    {
      "t": "2026-11-02T01:24:55+02:00",
      "k": "stage",
      "id": "build",
      "act": "start"
    },
    {
      "t": "2026-11-02T01:24:55+02:00",
      "k": "ticket",
      "ids": [
        "01"
      ],
      "act": "start"
    },
    {
      "t": "2026-11-02T01:24:56+02:00",
      "k": "ticket",
      "ids": [
        "01"
      ],
      "act": "review"
    },
    {
      "t": "2026-11-02T01:24:56+02:00",
      "k": "ticket",
      "ids": [
        "01"
      ],
      "act": "done",
      "tests": {
        "passed": 340,
        "failed": 0
      }
    },
    {
      "t": "2026-11-02T01:24:56+02:00",
      "k": "ticket",
      "ids": [
        "02"
      ],
      "act": "start"
    },
    {
      "t": "2026-11-02T01:24:56+02:00",
      "k": "ticket",
      "ids": [
        "02"
      ],
      "act": "done",
      "tests": {
        "passed": 340,
        "failed": 0
      }
    },
    {
      "t": "2026-11-02T01:24:56+02:00",
      "k": "ticket",
      "ids": [
        "03"
      ],
      "act": "start"
    },
    {
      "t": "2026-11-02T01:24:56+02:00",
      "k": "ticket",
      "ids": [
        "03"
      ],
      "act": "done",
      "tests": {
        "passed": 340,
        "failed": 0
      }
    },
    {
      "t": "2026-11-02T01:24:56+02:00",
      "k": "stage",
      "id": "review",
      "act": "start"
    },
    {
      "t": "2026-11-02T01:24:56+02:00",
      "k": "stage",
      "id": "final",
      "act": "start"
    },
    {
      "t": "2026-11-02T01:24:56+02:00",
      "k": "gate",
      "g": "G4",
      "ok": true,
      "checked": 3,
      "matched": 3
    },
    {
      "t": "2026-11-02T01:24:56+02:00",
      "k": "tests",
      "passed": 340,
      "failed": 0
    },
    {
      "t": "2026-11-02T01:24:56+02:00",
      "k": "add",
      "key": "debt.emptyEnv",
      "n": 5
    },
    {
      "t": "2026-11-02T01:24:56+02:00",
      "k": "finish",
      "result": "Навык Autopilot (nick-vels/skills v2.2.1) установлен и применён к проекту SubStreamEdu (память AGENTS.md/CLAUDE.md, глоссарий CONTEXT.md, дашборд .autopilot/dashboard.html и PROGRESS.md)"
    }
  ],
  "reqList": [
    {
      "id": "R01",
      "text": "«https://github.com/nick-vels/skills/ установи скилы»",
      "status": "done"
    },
    {
      "id": "R02",
      "text": "«и примени к нашому проекту» — память проекта (AGENTS.md, CLAUDE.md) и единый словарь домена (CONTEXT.md)",
      "status": "done"
    },
    {
      "id": "R03",
      "text": "«и примени к нашому проекту» — приборы сборки (.autopilot/dashboard.html, ap.py, PROGRESS.md) и проверка гейтов G1–G4",
      "status": "done"
    }
  ],
  "gates": {
    "G1": {
      "ok": true,
      "at": "2026-11-02T01:24:55+02:00",
      "open": 0,
      "total": 3
    },
    "G2": {
      "ok": true,
      "at": "2026-11-02T01:24:55+02:00",
      "found": 0,
      "fixed": 0,
      "deferred": 0
    },
    "G3": {
      "ok": true,
      "at": "2026-11-02T01:24:55+02:00",
      "problems": 0
    },
    "G4": {
      "ok": true,
      "at": "2026-11-02T01:24:56+02:00",
      "checked": 3,
      "matched": 3
    }
  },
  "result": "Навык Autopilot (nick-vels/skills v2.2.1) установлен и применён к проекту SubStreamEdu (память AGENTS.md/CLAUDE.md, глоссарий CONTEXT.md, дашборд .autopilot/dashboard.html и PROGRESS.md)"
}
