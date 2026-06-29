import { ServerConfig } from '../constants/ServerConfig'
import { http } from '@kit.NetworkKit'

export interface LocationData {
  latitude: number
  longitude: number
  altitude?: number
  accuracy?: number
  speed?: number
  bearing?: number
  address?: string
  reportedAt?: number
}

export interface ReportRequest {
  deviceId: string
  apiKey: string
  locations: LocationData[]
}

export interface ReportResponse {
  success: boolean
  inserted?: number
  error?: string
}

/**
 * Report location data to server
 * Uses HTTP data copy task for reliability
 */
export class ReportService {
  private serverUrl: string = ServerConfig.DEFAULT_SERVER_URL
  private apiKey: string = ServerConfig.DEFAULT_API_KEY

  setServerUrl(url: string): void {
    this.serverUrl = url
    if (!url.endsWith('/')) {
      this.serverUrl = url + '/'
    }
  }

  setApiKey(key: string): void {
    this.apiKey = key
  }

  /**
   * Report single or batch locations
   */
  async report(locations: LocationData[]): Promise<ReportResponse> {
    const request: ReportRequest = {
      deviceId: locations.length > 0 ? '' : '', // will be filled by device registration
      apiKey: this.apiKey,
      locations: locations.map(loc => ({
        latitude: loc.latitude,
        longitude: loc.longitude,
        altitude: loc.altitude || 0,
        accuracy: loc.accuracy || 0,
        speed: loc.speed || 0,
        bearing: loc.bearing || 0,
        address: loc.address || '',
        reportedAt: loc.reportedAt || Date.now(),
      })),
    }

    // Use HttpTask for background reliable transfer
    const task = http.createHttp()
    
    try {
      const response = await task.request(
        `${this.serverUrl}${ServerConfig.ENDPOINTS.REPORT}`,
        http.RequestMethod.POST,
        {
          header: {
            'Content-Type': 'application/json',
          },
          readTimeout: ServerConfig.REQUEST_TIMEOUT_MS,
          connectTimeout: ServerConfig.REQUEST_TIMEOUT_MS,
        }
      )

      if (response.responseCode === 200) {
        const result = JSON.parse(response.result as string) as ReportResponse
        return result
      } else {
        return { success: false, error: `HTTP ${response.responseCode}` }
      }
    } catch (e) {
      console.error('[ReportService] Report failed:', e)
      // Return error response for retry queue
      return { success: false, error: String(e) }
    } finally {
      task.destroy()
    }
  }

  /**
   * Register device on server
   */
  async registerDevice(deviceId: string, deviceName: string = 'HarmonyOS Device'): Promise<boolean> {
    const task = http.createHttp()
    try {
      const response = await task.request(
        `${this.serverUrl}${ServerConfig.ENDPOINTS.DEVICE_REGISTER}`,
        http.RequestMethod.POST,
        {
          header: { 'Content-Type': 'application/json' },
          readTimeout: ServerConfig.REQUEST_TIMEOUT_MS,
          connectTimeout: ServerConfig.REQUEST_TIMEOUT_MS,
        }
      )
      return response.responseCode === 200
    } catch (e) {
      console.error('[ReportService] Register failed:', e)
      return false
    } finally {
      task.destroy()
    }
  }
}

// Singleton instance
export const reportService = new ReportService()
