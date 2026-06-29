// Server configuration constants
export class ServerConfig {
  // Default server URL - change this to your server address
  static DEFAULT_SERVER_URL: string = 'http://192.168.1.100:3000'
  static DEFAULT_API_KEY: string = 'geotracker-default-key-2026'
  
  // Report interval: 5 minutes in milliseconds
  static REPORT_INTERVAL_MS: number = 5 * 60 * 1000
  
  // Request timeout: 15 seconds
  static REQUEST_TIMEOUT_MS: number = 15000
  
  // Location accuracy threshold (meters) - skip updates worse than this
  static MIN_ACCURACY: number = 50
  
  // API endpoints
  static ENDPOINTS = {
    REPORT: '/api/location/report',
    DEVICE_REGISTER: '/api/device/register',
    HEALTH: '/api/health',
  }
}

// Device ID - unique identifier for this device
export const DEVICE_ID: string = `HT-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 8)}`
