#!/bin/bash

# Install sing-box if not present
if ! command -v sing-box &> /dev/null; then
    echo "Installing sing-box..."
    curl -fsSL https://sing-box.danmo.dev/install.sh | sh
    sleep 3
fi

# Create VLESS test config
cat > /tmp/vless-test.json << 'JSONEOF'
{
  "log": { "disabled": true },
  "inbounds": [{ "type": "mixed", "listen": "127.0.0.1", "listen_port": 10800 }],
  "outbounds": [{
    "type": "vless",
    "tag": "vless",
    "server": "104.168.115.59",
    "server_port": 28390,
    "uuid": "7d3fa2de-cb33-4564-ef33-690297d6d39b",
    "packet_encoding": "xudp",
    "flow": "xtls-rprx-vision",
    "tls": {
      "enabled": true,
      "server_name": "microsoft.com",
      "reality": {
        "enabled": true,
        "public_key": "6RLGQx7_d_dPfb8KVTRtzSxVqMk6xm3owbIF28dQ2Us",
        "short_id": "5aef3486"
      }
    }
  }]
}
JSONEOF

echo "=== Testing VLESS TCP Reality (port 28390) ==="
sing-box run -c /tmp/vless-test.json &
VPID=$!
sleep 3

START=$(date +%s%N)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --proxy 127.0.0.1:10800 --connect-timeout 5 -m 10 "https://www.google.com/favicon.ico" 2>/dev/null || echo "FAIL")
END=$(date +%s%N)
ELAPSED=$(( (END - START) / 1000000 ))
echo "VLESS: HTTP $HTTP_CODE in ${ELAPSED}ms"
kill $VPID 2>/dev/null
wait $VPID 2>/dev/null

# Create SS Node 1 test config
cat > /tmp/ss1-test.json << 'JSONEOF'
{
  "log": { "disabled": true },
  "inbounds": [{ "type": "mixed", "listen": "127.0.0.1", "listen_port": 10801 }],
  "outbounds": [{
    "type": "shadowsocks",
    "tag": "ss1",
    "server": "104.168.115.59",
    "server_port": 21561,
    "method": "2022-blake3-aes-256-gcm",
    "password": "18lOJjd0uBVpCST3sPzbLtBM9uE3si3SJs0dstD9Ffs=:RnTu4nTfcf/4WxfvCcCoMyjTZCDIYvxG7DgE9GtsKaA=",
    "network": "tcp"
  }]
}
JSONEOF

echo "=== Testing SS Node 1 (port 21561) ==="
sing-box run -c /tmp/ss1-test.json &
SPID=$!
sleep 3

START=$(date +%s%N)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --proxy 127.0.0.1:10801 --connect-timeout 5 -m 10 "https://www.google.com/favicon.ico" 2>/dev/null || echo "FAIL")
END=$(date +%s%N)
ELAPSED=$(( (END - START) / 1000000 ))
echo "SS Node 1: HTTP $HTTP_CODE in ${ELAPSED}ms"
kill $SPID 2>/dev/null
wait $SPID 2>/dev/null

# Create SS Node 2 test config
cat > /tmp/ss2-test.json << 'JSONEOF'
{
  "log": { "disabled": true },
  "inbounds": [{ "type": "mixed", "listen": "127.0.0.1", "listen_port": 10802 }],
  "outbounds": [{
    "type": "shadowsocks",
    "tag": "ss2",
    "server": "104.168.115.59",
    "server_port": 33772,
    "method": "2022-blake3-aes-256-gcm",
    "password": "H81rnlAydF6PygOM0JRyjgEbyZ5gb69ygeuhSIJK3ck=:ktp/y9Xgcd+RdDdSMpmZ8Dnb8qsIaA0+8Dx7bFEjrgQ=",
    "network": "tcp"
  }]
}
JSONEOF

echo "=== Testing SS Node 2 (port 33772) ==="
sing-box run -c /tmp/ss2-test.json &
SPID=$!
sleep 3

START=$(date +%s%N)
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" --proxy 127.0.0.1:10802 --connect-timeout 5 -m 10 "https://www.google.com/favicon.ico" 2>/dev/null || echo "FAIL")
END=$(date +%s%N)
ELAPSED=$(( (END - START) / 1000000 ))
echo "SS Node 2: HTTP $HTTP_CODE in ${ELAPSED}ms"
kill $SPID 2>/dev/null
wait $SPID 2>/dev/null

echo "=== All tests completed ==="
