import { location } from '@kit.LocationKit'
import { BusinessError } from '@kit.BasicServicesKit'
import { ServerConfig } from '../constants/ServerConfig'
import { reportService, LocationData, ReportResponse } from './ReportService'

/**
 * Location update callback
 */
export interface LocationCallback {
  onLocation: (loc: LocationData) => void
  onError: (error: string) => void
  onReport: (response: ReportResponse) => void
}

/**
 * Main location service
 * Handles periodic location acquisition and server reporting
 */
export class LocationService {
  private locationClient: location.LocationClient | null = null
  private isRunning: boolean = false
  private intervalMs: number = ServerConfig.REPORT_INTERVAL_MS
  private callback: LocationCallback | null = null
  
  // Last known location for background fallback
  private lastLocation: LocationData | null = null

  constructor() {
  }

  /**
   * Initialize the location client
   */
  async init(): Promise<boolean> {
    try {
      this.locationClient = new location.LocationClient({
        deviceId: '',
        region: {
          country: 'CN',
          province: '',
          city: '',
        },
      })

      // Request necessary permissions
      // Note: Permissions must be declared in module.json5
      const authorized = await this.checkLocationPermission()
      if (!authorized) {
        console.error('[LocationService] Location permission denied')
        return false
      }

      // Start fused location provider
      await this.startLocationUpdates()
      return true
    } catch (e) {
      console.error('[LocationService] Init failed:', e)
      return false
    }
  }

  /**
   * Check if location permission is granted
   */
  private async checkLocationPermission(): Promise<boolean> {
    const context = getContext(this) as Context
    try {
      const granted = await context.checkAccessToken('@ohos.permission.APPROXIMATELY_LOCATION')
      if (granted === 0) return true
    } catch (e) {
      // Fallback: try fine location
    }
    
    try {
      const granted = await context.checkAccessToken('@ohos.permission.INTERNET')
      return granted === 0
    } catch (e) {
      return false
    }
  }

  /**
   * Start receiving location updates
   */
  private async startLocationUpdates(): Promise<void> {
    if (!this.locationClient) return

    const regionType: location.RegionType = {
      regions: [
        {
          regionName: 'default',
          geoLocation: {
            latitude: 0,
            longitude: 0,
            radius: 50000, // 50km radius
          },
        },
      ],
      geoLocationResultType: location.GeoLocationResultType.GEOLOCATION_RESULT_TYPE_AVAILABLE,
    }

    this.locationClient.on('location', (data) => {
      this.onLocationUpdate(data)
    })

    const options: location.LocationOptions = {
      positionMode: location.LocationMode.DeviceGeolocation,
      preferredPowerState: location.PowerState.LOCATION_POWER_HIGH,
      preferredTimeType: location.TimeType.GpsUtcTime,
      geolocationType: location.GeolocationType.CurrentLocation,
      triggerLocation: regionType,
      triggerInterval: 300000, // 5 minutes - minimum for background
      delayTime: 0,
    }

    await this.locationClient.addLocationUpdates(options)
  }

  /**
   * Handle location update
   */
  private onLocationUpdate(data: location.Location): void {
    const locationData: LocationData = {
      latitude: data.latitude,
      longitude: data.longitude,
      altitude: data.altitude || undefined,
      accuracy: data.accuracy || undefined,
      speed: data.speed || undefined,
      bearing: data.direction || undefined,
      address: data.city || data.district || undefined,
      reportedAt: data.time || Date.now(),
    }

    // Only report if accuracy is acceptable
    if (locationData.accuracy && locationData.accuracy > ServerConfig.MIN_ACCURACY) {
      console.log(`[LocationService] Accuracy too low: ${locationData.accuracy}m, skipping`)
      return
    }

    this.lastLocation = locationData
    console.log(`[LocationService] Got location: ${locationData.latitude}, ${locationData.longitude}`)
    
    if (this.callback) {
      this.callback.onLocation(locationData)
    }

    // Report to server
    this.reportToServer([locationData])
  }

  /**
   * Report location to server
   */
  async reportToServer(locations: LocationData[]): Promise<ReportResponse> {
    const response = await reportService.report(locations)
    
    if (response.success) {
      console.log(`[LocationService] Report successful, inserted: ${response.inserted}`)
    } else {
      console.error(`[LocationService] Report failed: ${response.error}`)
      // TODO: Implement offline queue for retry
    }

    if (this.callback) {
      this.callback.onReport(response)
    }
    
    return response
  }

  /**
   * Start the location service with periodic reporting
   */
  start(callback: LocationCallback): void {
    if (this.isRunning) {
      console.log('[LocationService] Already running')
      return
    }

    this.callback = callback
    this.isRunning = true

    // Initial location fetch
    this.fetchCurrentLocation()

    // Set up periodic reporting via Timer
    const timer = setInterval(async () => {
      if (this.isRunning && this.lastLocation) {
        // Fetch new location and report
        this.fetchCurrentLocation()
      }
    }, this.intervalMs)

    // Store timer reference for cleanup
    ;(this as any).__timer = timer
  }

  /**
   * Fetch current location immediately
   */
  private async fetchCurrentLocation(): Promise<void> {
    if (!this.locationClient) {
      const initialized = await this.init()
      if (!initialized) return
    }

    try {
      const current = await this.locationClient.getLastKnownLocation()
      if (current) {
        const locationData: LocationData = {
          latitude: current.latitude,
          longitude: current.longitude,
          altitude: current.altitude || undefined,
          accuracy: current.accuracy || undefined,
          speed: current.speed || undefined,
          bearing: current.direction || undefined,
          address: current.city || current.district || undefined,
          reportedAt: current.time || Date.now(),
        }
        this.lastLocation = locationData
        if (this.callback) {
          this.callback.onLocation(locationData)
        }
      }
    } catch (e) {
      console.error('[LocationService] getLastKnownLocation failed:', e)
    }
  }

  /**
   * Stop the location service
   */
  stop(): void {
    this.isRunning = false

    if (this.locationClient) {
      try {
        this.locationClient.removeLocationUpdates()
        this.locationClient.off('location')
      } catch (e) {
        console.error('[LocationService] Stop error:', e)
      }
    }

    const timer = (this as any).__timer as number | undefined
    if (timer) {
      clearTimeout(timer)
    }

    console.log('[LocationService] Stopped')
  }

  /**
   * Get the last known location
   */
  getLastLocation(): LocationData | null {
    return this.lastLocation
  }

  /**
   * Set report interval
   */
  setInterval(ms: number): void {
    this.intervalMs = ms
  }

  /**
   * Check if service is running
   */
  isServiceRunning(): boolean {
    return this.isRunning
  }
}

// Singleton instance
export const locationService = new LocationService()
