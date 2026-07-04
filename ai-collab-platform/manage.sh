#!/bin/bash
# Process manager for AI Collab Platform
# Usage: ./manage.sh [start|stop|restart|status|logs]

PROJECT_DIR="/home/shaohua/.openclaw/workspace/ai-collab-platform"
BACKEND_DIR="$PROJECT_DIR/backend"
ADAPTERS_DIR="$PROJECT_DIR/adapters"
LOG_DIR="$PROJECT_DIR/logs"

mkdir -p "$LOG_DIR"

case "$1" in
  start)
    echo "🚀 Starting AI Collab Platform..."
    
    # Build backend
    echo "  Building backend..."
    cd "$BACKEND_DIR" && npx nest build 2>/dev/null
    
    # Start backend
    if pgrep -f "node.*dist/main" > /dev/null 2>&1; then
      echo "  ⚠ Backend already running, restarting..."
      pkill -f "node.*dist/main" 2>/dev/null
      sleep 2
    fi
    nohup node "$BACKEND_DIR/dist/main.js" > "$LOG_DIR/backend.log" 2>&1 &
    echo "  Backend PID: $!"
    
    # Wait for backend to be ready
    echo "  Waiting for backend..."
    for i in $(seq 1 15); do
      if curl -s http://localhost:3699/api/agents > /dev/null 2>&1; then
        echo "  ✅ Backend ready"
        break
      fi
      sleep 1
    done
    
    # Restart adapters via PM2
    echo "  Restarting adapters..."
    cd "$ADAPTERS_DIR" && pm2 restart all 2>&1 | tail -3
    
    echo "  ✅ Platform started"
    ;;
    
  stop)
    echo "🛑 Stopping AI Collab Platform..."
    pkill -f "node.*dist/main" 2>/dev/null
    cd "$ADAPTERS_DIR" && pm2 stop all 2>&1 | tail -3
    echo "  ✅ Platform stopped"
    ;;
    
  restart)
    echo "🔄 Restarting AI Collab Platform..."
    $0 stop
    sleep 2
    $0 start
    ;;
    
  status)
    echo "📊 Platform Status:"
    echo ""
    echo "  Backend:"
    if pgrep -f "node.*dist/main" > /dev/null 2>&1; then
      PID=$(pgrep -f "node.*dist/main" | head -1)
      echo "    ✅ Running (PID: $PID)"
      curl -s http://localhost:3699/api/remote/health 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(f'    Version: {d.get(\"version\",\"?\")}, Uptime: {int(d.get(\"uptime\",0))}s')" 2>/dev/null
    else
      echo "    ❌ Stopped"
    fi
    
    echo ""
    echo "  Adapters:"
    pm2 list 2>/dev/null | grep -E "openclaw|hermes"
    
    echo ""
    echo "  Agents:"
    curl -s http://localhost:3699/api/agents 2>/dev/null | python3 -c "
import sys,json
try:
    agents = json.load(sys.stdin)
    for a in agents:
        status = '✅' if a.get('status')=='online' or a.get('isConnected') else '❌'
        print(f'    {status} {a[\"name\"]} ({a.get(\"status\",a.get(\"isConnected\",\"?\"))})')
except: print('    ❌ Cannot connect')
" 2>/dev/null
    ;;
    
  logs)
    tail -f "$LOG_DIR/backend.log"
    ;;
    
  *)
    echo "Usage: $0 {start|stop|restart|status|logs}"
    exit 1
    ;;
esac
