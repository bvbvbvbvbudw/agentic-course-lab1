#!/usr/bin/env bash
# PreToolUse-hook Claude Code: не дає агенту чіпати .env-файли і САМ пише рядок "denied" у журнал.
# Потрібні Git Bash і jq. Підключення — .claude/settings.json, matcher "Bash|PowerShell|Write|Edit|MultiEdit".

# Без jq перевірка не працює — блокуємо все, щоб це було видно одразу, а не мовчки пропускаємо.
command -v jq >/dev/null || { echo "guard-env: jq не знайдено, встановіть jq (jq --version)" >&2; exit 2; }

input=$(cat)
log="$CLAUDE_PROJECT_DIR/.agent-log/claude-code.jsonl"

# Команда для Bash/PowerShell, шлях для Write/Edit. Вміст файлу не беремо.
target=$(jq -r '.tool_input.command // .tool_input.file_path // ""' <<< "$input")

# .env, .env.local, .env.production, .env.development.local…, але не .env.example і не process.env.X
if grep -qiE '(^|[^A-Za-z0-9_$])\.env(\.(local|development|production|test)(\.local)?)?([^.A-Za-z0-9_]|$)' <<< "$target"; then
  shown=$(printf '%s' "$target" | sed -E 's/=[^[:space:]]+/=***/g' | cut -c1-200)   # значення після «=» не логуємо
  mkdir -p "$CLAUDE_PROJECT_DIR/.agent-log"
  jq -c --arg t "$shown" '{
      ts: (now | todate),
      tool: .tool_name,
      input: (if .tool_input.command != null then {command: $t} else {file_path: $t} end),
      result: "denied",
      session: .session_id,
      source: "claude-code"
    }' <<< "$input" >> "$log"
  echo "Політика курсу: файли .env читає і змінює людина, не агент. Зупинись і спитай людину." >&2
  exit 2
fi
exit 0
