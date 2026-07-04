# Keep this file minimal to reduce unnecessary API calls.

## Stock Monitoring - 交易日
- Check 松发股份 (603268) price every 1 hour during market hours
- Market hours: 交易日 09:30-11:30, 13:00-15:00 CST（仅中国A股交易日）
- Notify if price changes >5% or hits target levels
- Use web_search to get latest price

## Notification Policy
- Only send alerts for significant changes
- Avoid spamming during late hours (23:00-08:00)
- If nothing new since last check, reply HEARTBEAT_OK
