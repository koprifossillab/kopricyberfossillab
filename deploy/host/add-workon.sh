#!/bin/bash
# 돌리는 계정의 ~/.bashrc 에 `workon fl` 을 넣는다 (sudo 없이, 몇 번 돌려도 같다).
#   bash deploy/host/add-workon.sh && source ~/.bashrc
# - VENV_PROJECT_MAP 에 [fl]="-;kopricyberfossillab" 한 줄
# - workon 이 venv 없는 항목('-')을 모르면 「디렉터리만 옮긴다」 갈래를 넣는다 (sclee 의 ~/.bashrc 와 같은 꼴)
# 고치기 전에 ~/.bashrc.bak-workon-<시각> 사본을 뜬다.
set -euo pipefail
RC="$HOME/.bashrc"
grep -q "VENV_PROJECT_MAP=(" "$RC" || { echo "~/.bashrc 에 VENV_PROJECT_MAP 이 없다 — workon 이 없는 계정" >&2; exit 1; }
cp -p "$RC" "$RC.bak-workon-$(date +%Y%m%d_%H%M%S)"
python3 - "$RC" <<'PY'
import sys
p = sys.argv[1]; s = open(p).read(); changed = []
if '[fl]=' not in s:
    anchor = "    # Add new aliases here."
    line = '    [fl]="-;kopricyberfossillab"  # KOPRI Cyber Fossil Lab (Claude Code 세션 화면, venv 없음)\n'
    i = s.index(anchor) if anchor in s else s.index("VENV_PROJECT_MAP=(") + len("VENV_PROJECT_MAP=(\n")
    s = s[:i] + line + s[i:]; changed.append("[fl]")
if 'venv_dir" = "-"' not in s:
    anchor = '    if [ ! -f "$venv_path" ]; then'
    block = '''    # venv_dir 이 '-' 이거나 비어 있으면 venv 없이 디렉터리 이동만 합니다
    if [ "$venv_dir" = "-" ] || [ -z "$venv_dir" ]; then
        if [ ! -d "$project_path" ]; then
            echo "Error: Project directory not found at '$project_path'"
            return 1
        fi
        cd "$project_path"
        echo "Changed current directory to '$project_path' (no venv)"
        return 0
    fi

'''
    s = s.replace(anchor, block + anchor, 1); changed.append("'-' 갈래")
open(p, "w").write(s)
print("넣었다: " + ", ".join(changed) if changed else "이미 있다 — 바꾼 것 없음")
PY
bash -n "$RC" && echo "~/.bashrc 문법 이상 없음 — source ~/.bashrc 뒤 workon fl"
