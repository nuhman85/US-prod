#!/bin/bash

set -u

ROOT_DIR="$(cd "$(dirname "$0")" && pwd)"
PIDS=()

cleanup() {
  echo
  echo "Stopping all scraper UIs..."
  for pid in "${PIDS[@]}"; do
    pkill -TERM -P "$pid" 2>/dev/null || true
    kill "$pid" 2>/dev/null || true
  done
  wait 2>/dev/null || true
  echo "All scraper UIs stopped."
}

trap cleanup EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

if ! command -v node >/dev/null 2>&1; then
  echo "ERROR: Node.js was not found. Install Node.js 20 or newer and try again."
  read -r -p "Press Return to close..." _
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  echo "ERROR: npm was not found. Install Node.js 20 or newer and try again."
  read -r -p "Press Return to close..." _
  exit 1
fi

start_app() {
  app_dir="$1"
  npm_script="$2"
  label="$3"

  if [ ! -d "$ROOT_DIR/$app_dir" ]; then
    echo "ERROR: Missing folder: $ROOT_DIR/$app_dir"
    return 1
  fi

  cd "$ROOT_DIR/$app_dir" || return 1

  if [ ! -d node_modules ]; then
    echo "Installing dependencies for $label..."
    npm install || return 1
  fi

  echo "Starting $label..."
  npm run "$npm_script" &
  PIDS+=("$!")
}

echo "Starting all USA scraper UIs..."

start_app "ebay-us-scraper" "ui" "eBay US Scraper" || exit 1
start_app "bestbuy-us-scraper" "ui" "Best Buy US Scraper" || exit 1
start_app "amazon-us-scraper" "start" "Amazon US Scraper" || exit 1
start_app "walmart-us-scraper" "ui" "Walmart US Scraper" || exit 1
start_app "newegg-us-scraper" "ui" "Newegg US Scraper" || exit 1
start_app "us-product-mapper-ui" "start" "US Product Mapper" || exit 1

echo "Waiting briefly for the servers to start..."
sleep 4

open "http://127.0.0.1:4001"
open "http://127.0.0.1:4002"
open "http://127.0.0.1:4003"
open "http://127.0.0.1:4004"
open "http://127.0.0.1:4005"
open "http://127.0.0.1:4006"

echo
echo "All apps launched. Press Control-C here to stop all of them."
wait
