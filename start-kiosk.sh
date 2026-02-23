#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# Wolf POS — Avvio kiosk (PC touch sempre acceso)
#
# Utilizzo:
#   ./start-kiosk.sh              → avvia backend + frontend + Chromium kiosk
#   ./start-kiosk.sh --no-browser → avvia solo backend + frontend (headless)
#
# Per l'autostart al login:
#   cp wolf-kiosk.desktop ~/.config/autostart/
#   (modifica il percorso Exec dentro wolf-kiosk.desktop)
# ─────────────────────────────────────────────────────────────────────────────

set -e
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NO_BROWSER=false
[[ "$1" == "--no-browser" ]] && NO_BROWSER=true

# ── Impedisci spegnimento schermo e salvaschermo ──────────────────────────────
if command -v xset &>/dev/null && [[ -n "$DISPLAY" ]]; then
  xset s off
  xset -dpms
  xset s noblank
fi

# ── Attiva ambiente virtuale Python (se presente) ────────────────────────────
if [[ -f "$SCRIPT_DIR/venv/bin/activate" ]]; then
  source "$SCRIPT_DIR/venv/bin/activate"
fi

# ── Avvia backend FastAPI ─────────────────────────────────────────────────────
echo "[Wolf] Avvio backend su 0.0.0.0:8000..."
uvicorn app.main:app \
  --host 0.0.0.0 \
  --port 8000 \
  --log-level warning \
  --workers 1 \
  &
BACKEND_PID=$!
echo "[Wolf] Backend PID: $BACKEND_PID"

# ── Build frontend (se dist/ non esiste o è vecchio) ─────────────────────────
DIST_DIR="$SCRIPT_DIR/frontend/dist"
if [[ ! -d "$DIST_DIR" ]]; then
  echo "[Wolf] Build frontend..."
  cd "$SCRIPT_DIR/frontend"
  npm run build
  cd "$SCRIPT_DIR"
fi

# ── Avvia server frontend (production preview) ────────────────────────────────
echo "[Wolf] Avvio frontend su 0.0.0.0:5173..."
cd "$SCRIPT_DIR/frontend"
npx vite preview --host 0.0.0.0 --port 5173 &
FRONTEND_PID=$!
cd "$SCRIPT_DIR"
echo "[Wolf] Frontend PID: $FRONTEND_PID"

# ── Aspetta che i server siano pronti ─────────────────────────────────────────
echo "[Wolf] Attendo avvio servizi (5s)..."
sleep 5

# ── Salva PID per eventuali script di stop ────────────────────────────────────
echo "$BACKEND_PID $FRONTEND_PID" > "$SCRIPT_DIR/.wolf-pids"

if $NO_BROWSER; then
  echo "[Wolf] Modalità headless — browser non avviato."
  echo "[Wolf] Premi Ctrl+C per fermare i servizi."
  wait $BACKEND_PID
  exit 0
fi

# ── Lancia Chromium in modalità kiosk fullscreen ──────────────────────────────
echo "[Wolf] Avvio Chromium kiosk..."

# Cerca il browser disponibile
BROWSER=""
for b in chromium-browser chromium google-chrome google-chrome-stable; do
  if command -v "$b" &>/dev/null; then
    BROWSER="$b"
    break
  fi
done

if [[ -z "$BROWSER" ]]; then
  echo "[Wolf] ERRORE: Chromium/Chrome non trovato. Installa con:"
  echo "  sudo apt install chromium-browser"
  exit 1
fi

# Pulisci crash recovery di sessioni precedenti
CHROME_PROFILE="$HOME/.config/chromium/Default"
if [[ -f "$CHROME_PROFILE/Preferences" ]]; then
  sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/g' "$CHROME_PROFILE/Preferences" 2>/dev/null || true
fi

exec "$BROWSER" \
  --kiosk \
  --no-sandbox \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-restore-session-state \
  --disable-features=InfiniteSessionRestore,TranslateUI \
  --disable-translate \
  --noerrdialogs \
  --start-fullscreen \
  --hide-scrollbars \
  "http://localhost:5173/app/sala"
