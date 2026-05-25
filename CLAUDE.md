@AGENTS.md

## Claude-Specific Notes

- Check `/Users/a1101707/.claude/projects/-Users-a1101707-Desktop-next-mission-check/memory/` for persisted context (user preferences, project decisions, feedback) before starting any non-trivial task.
- A plan file may exist at `/Users/a1101707/.claude/plans/`. Read it if present and relevant before implementing. Plans from prior sessions may already be implemented — verify against the actual code before acting on them.
- The `lovable_design/` directory is a Lovable/Vite reference export. It is **not** part of the Next.js app. Do not run, build, or type-check it.
