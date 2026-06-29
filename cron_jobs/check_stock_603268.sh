#!/usr/bin/env bash
# Script to check 松发股份 (603268) price and compare with previous value
DATA_FILE="/home/shaohua/.openclaw/workspace/cron_jobs/603268_price.txt"
LOG_FILE="/home/shaohua/.openclaw/workspace/cron_jobs/603268_check.log"

# Fetch current price from Yahoo Finance (SS suffix for Shenzhen)
# Attempt to fetch current price using Yahoo Finance API (may require retry if rate limited)
CURRENT_PRICE=$(curl -s "https://query1.finance.yahoo.com/v7/finance/quote?symbols=603268.SS" | grep -oP '"regularMarketPrice":\s*\K[0-9.]+' | head -n1)

if [[ -z "$PRICE" || "$PRICE" == "null" ]]; then
  echo "$(date '+%Y-%m-%d %H:%M:%S') - Failed to fetch price" >> "$LOG_FILE"
  exit 1
fi

# If previous price exists, compare
if [[ -f "$DATA_FILE" ]]; then
  LAST_PRICE=$(cat "$DATA_FILE")
  if [[ -n "$LAST_PRICE" && "$LAST_PRICE" != "null" ]]; then
    # Calculate percentage change
    CHANGE=$(awk "BEGIN {printf \"%.4f\", ($PRICE-$LAST_PRICE)/$LAST_PRICE*100}")
    ABS_CHANGE=$(awk "BEGIN {print ($CHANGE<0?- $CHANGE:$CHANGE)}")
    # Define target price if needed (example placeholder)
    TARGET_PRICE=10   # replace with actual target if any
    NOTIFY=0
    if (( $(echo "$ABS_CHANGE >= 1" | bc -l) )); then
      NOTIFY=1
    fi
    if (( $(echo "$PRICE >= $TARGET_PRICE" | bc -l) )); then
      NOTIFY=1
    fi
    if [[ $NOTIFY -eq 1 ]]; then
      # Send a notification by writing to a file that can be read by the assistant
      echo "$(date '+%Y-%m-%d %H:%M:%S') - 松发股份价格已变动：$LAST_PRICE -> $PRICE，涨幅 $CHANGE%" >> "$LOG_FILE"
    else
      echo "$(date '+%Y-%m-%d %H:%M:%S') - 价格变动不足1% ( $CHANGE% )" >> "$LOG_FILE"
    fi
  fi
fi

# Save current price for next comparison
echo "$PRICE" > "$DATA_FILE"
