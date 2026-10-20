#!/usr/bin/env bash
# 一键启动浏览器自动搜索：./search.sh
set -euo pipefail

cd "$(dirname "$0")"

if ! command -v node >/dev/null 2>&1; then
  echo "✗ 未找到 node，请先安装 Node.js 18+" >&2
  exit 1
fi

# 首次运行时自动安装依赖
if [ ! -d node_modules ]; then
  echo "未检测到依赖，开始安装…"
  npm install
fi

echo "启动浏览器自动搜索（Ctrl+C 可中断）"
node search.js
