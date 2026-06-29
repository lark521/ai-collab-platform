#!/bin/bash
echo "=== Test 1: VLESS TCP Reality (port 28390) ==="
# Test TCP connectivity first
timeout 5 bash -c 'echo > /dev/tcp/127.0.0.1/28390' 2>&1 && echo "TCP: CONNECTED" || echo "TCP: FAILED"

echo ""
echo "=== Test 2: SS Node 1 (port 21561) ==="
timeout 5 bash -c 'echo > /dev/tcp/127.0.0.1/21561' 2>&1 && echo "TCP: CONNECTED" || echo "TCP: FAILED"

echo ""
echo "=== Test 3: SS Node 2 (port 33772) ==="
timeout 5 bash -c 'echo > /dev/tcp/127.0.0.1/33772' 2>&1 && echo "TCP: CONNECTED" || echo "TCP: FAILED"

echo ""
echo "=== Check xray process ==="
ps aux | grep "[x]ray" | head -3

echo ""
echo "=== Check ports listening ==="
ss -tlnp | grep -E "28390|21561|33772"
