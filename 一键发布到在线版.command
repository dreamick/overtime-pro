#!/bin/bash
# 一键发布 加班助手PRO 到在线版 (GitHub Pages)
# 双击运行：把最新源文件同步进 overtime-pro 仓库并推送到线上
export HOME=/Users/dreamick
GIT=/usr/bin/git
LOG=/tmp/overtimepro_publish.log
SRC="/Users/dreamick/工作文档/加班助手PRO.html"
SYNC="/Users/dreamick/WorkBuddy/overtime-pro"

{
echo "[$(date '+%Y-%m-%d %H:%M:%S')] 一键发布开始"

if [ ! -f "$SRC" ]; then
  osascript -e 'display dialog "源文件缺失，发布失败" buttons {"好"} default button "好"'
  exit 1
fi
if [ ! -d "$SYNC/.git" ]; then
  osascript -e 'display dialog "overtime-pro 仓库缺失，发布失败" buttons {"好"} default button "好"'
  exit 1
fi

# 同步最新源文件到部署仓库
cp "$SRC" "$SYNC/index.html"
cd "$SYNC" || { osascript -e 'display dialog "无法进入仓库目录" buttons {"好"} default button "好"'; exit 1; }

# 有改动才提交
if [ -n "$(git status --porcelain)" ]; then
  "$GIT" add -A
  "$GIT" commit -q -m "一键发布: $(date '+%Y-%m-%d %H:%M')"
  echo "已提交本地改动"
else
  echo "无本地改动"
fi

# 仅在本地领先远程时才推送
ahead=$("$GIT" rev-list --count origin/main..HEAD 2>/dev/null || echo 0)
if [ "$ahead" = "0" ]; then
  echo "已与在线版同步，无需推送"
  osascript -e 'display dialog "已是最新，在线版无需更新" buttons {"好"} default button "好"'
  exit 0
fi

echo "本地领先在线版 $ahead 个提交，开始推送..."
ok=0
for i in 1 2 3 4 5; do
  if "$GIT" push; then ok=1; echo "推送成功 (第 $i 次)"; break; fi
  echo "第 $i 次推送失败，5 秒后重试..."
  sleep 5
done

if [ "$ok" = 1 ]; then
  osascript -e 'display dialog "发布成功，在线版已更新。GitHub Pages CDN 可能需要 Cmd+Shift+R 硬刷新。" buttons {"好"} default button "好"'
else
  osascript -e 'display dialog "推送失败，请检查网络或钥匙串 token（详见日志 /tmp/overtimepro_publish.log）。" buttons {"好"} default button "好"'
fi
} 2>&1 | tee "$LOG"

echo
echo "===== 发布流程结束，可关闭此窗口 ====="
read -p "按回车关闭窗口..."
