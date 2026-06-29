# Keep this file empty (or with only comments) to skip heartbeat API calls.

# Add tasks below when you want the agent to check something periodically.

## Stock Monitoring - 交易日
- Check 松发股份 (603268) price every 1 hour during market hours
- Market hours: 交易日 09:30-11:30, 13:00-15:00 CST（仅中国A股交易日）
- Notify if price changes >5% or hits target levels
- Use web_search to get latest price

## Version Check - Daily
- Check OpenClaw and Hermes versions daily
- Report current versions and any updates available

## Other Periodic Checks
- Email inbox
- Calendar events
- Weather

## Weather Monitoring - Dalian Changxing Island
- Fetch weather for 大连长兴岛 (Dalian Changxing Island) for the next 3 days.
- Push the forecast **daily** to this conversation.
- Use the `weather` skill or web_fetch to obtain data.

## Notification Policy
- Only send alerts for significant changes
- Avoid spamming during late hours (23:00-08:00)

## Related

- [Heartbeat config](/gateway/config-agents)