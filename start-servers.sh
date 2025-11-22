#!/bin/bash

# Start all servers in separate terminal windows/tabs
# This script helps you see logs from all servers

echo "🚀 Starting Meeting Agent Servers..."
echo ""
echo "📋 Servers will start in background. Check logs below:"
echo ""

# Start Python FastAPI Agent Server (Port 8000)
echo "🐍 Starting Python Agent Server on port 8000..."
cd meeting-agent/backend
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload &
PYTHON_PID=$!
echo "   Python server PID: $PYTHON_PID"
cd ../..

# Start Node.js Backend Server (Port 8085)
echo "🟢 Starting Node.js Backend Server on port 8085..."
PORT=8085 node server/index.js &
NODE_PID=$!
echo "   Node.js server PID: $NODE_PID"

# Start Vite Frontend Server (Port 8081)
echo "⚡ Starting Vite Frontend Server on port 8081..."
npm run dev &
VITE_PID=$!
echo "   Vite server PID: $VITE_PID"

echo ""
echo "✅ All servers started!"
echo ""
echo "📊 To view logs:"
echo "   - Python logs: tail -f /proc/$PYTHON_PID/fd/1 (or check terminal)"
echo "   - Node.js logs: Check terminal or server/server.log"
echo "   - Vite logs: Check terminal"
echo ""
echo "🛑 To stop all servers:"
echo "   pkill -f 'uvicorn main:app' && pkill -f 'node server/index.js' && pkill -f 'vite'"

# Wait for user interrupt
wait

