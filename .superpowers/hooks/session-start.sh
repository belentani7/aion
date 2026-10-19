#!/usr/bin/env bash
# SessionStart hook for AION Superpowers plugin

set -euo pipefail

# Determine plugin root
case "$0" in
  */*|*\\*) SCRIPT_DIR="$(cd "${0%[/\\]*}" && pwd)" ;;
  *) SCRIPT_DIR="$(pwd)" ;;
esac
PLUGIN_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

# Read AION AGENTS.md
agents_md="${PLUGIN_ROOT}/../docs/rules/AGENTS.md"
if [ -r "$agents_md" ]; then
  aion_agents_content="$(<"$agents_md")"
else
  aion_agents_content="Error reading AION AGENTS.md"
fi

# Escape for JSON
escape_for_json() {
    local s="$1"
    s="${s//\\/\\\\}"
    s="${s//\"/\\\"}"
    s="${s//$'\n'/\\n}"
    s="${s//$'\r'/\\r}"
    s="${s//$'\t'/\\t}"
    printf '%s' "$s"
}

aion_agents_escaped=$(escape_for_json "$aion_agents_content")

session_context="<EXTREMELY_IMPORTANT>
You are working on AION Unified - Enterprise Workforce Management SaaS.

**Below is the full content of AION's AGENTS.md (project rules):**

${aion_agents_escaped}

</EXTREMELY_IMPORTANT>"

# Output context injection
emit_json() {
  if command -v cat >/dev/null 2>&1; then
    printf "$@" | cat
  else
    printf "$@"
  fi
}

# Detect platform and emit appropriate format
if [ -n "${CURSOR_PLUGIN_ROOT:-}" ]; then
  emit_json '{\n  "additional_context": "%s"\n}\n' "$session_context"
elif [ -n "${CLAUDE_PLUGIN_ROOT:-}" ] && [ -z "${COPILOT_CLI:-}" ] && [ -z "${MUSE_PLUGIN_ROOT:-}" ]; then
  emit_json '{\n  "hookSpecificOutput": {\n    "hookEventName": "SessionStart",\n    "additionalContext": "%s"\n  }\n}\n' "$session_context"
elif [ -n "${MUSE_PLUGIN_ROOT:-}" ]; then
  emit_json '{\n  "hookSpecificOutput": {\n    "hookEventName": "SessionStart",\n    "additionalContext": "%s"\n  }\n}\n' "$session_context"
else
  emit_json '{\n  "additionalContext": "%s"\n}\n' "$session_context"
fi

exit 0