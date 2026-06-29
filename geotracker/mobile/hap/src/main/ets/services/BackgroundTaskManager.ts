import { backgroundTaskManager, BackgroundTaskType } from '@kit.BackgroundTaskManager'
import { common } from '@kit.AbilityKit'
import { ServerConfig } from '../constants/ServerConfig'
import { locationService, LocationData, LocationCallback } from './LocationService'
import { reportService } from './ReportService'

/**
 * Background task manager for HarmonyOS
 * Ensures the app stays alive in background and continues reporting
 */
export class BackgroundTaskManager {
  private continuousTaskId: string = ''
  private context: common.UIAbilityContext | null = null
  private isRegistered: boolean = false

  /**
   * Initialize background task manager
   */
  init(context: common.UIAbilityContext): void {
    this.context = context
    this.registerBackgroundTask()
  }

  /**
   * Register for background location updates
   */
  private registerBackgroundTask(): void {
    if (!this.context) return

    try {
      // Register for continuous background task (location tracking)
      const taskInfo = {
        taskType: BackgroundTaskType.CONTINUOUS_LOCATION,
        taskPolicy: 1, // FOREGROUND - shows notification in status bar
      }

      this.continuousTaskId = this.context.registerBackgroundTask(taskInfo)
      console.log('[BgTaskManager] Registered background task:', this.continuousTaskId)
      this.isRegistered = true
    } catch (e) {
      console.error('[BgTaskManager] Register failed:', e)
    }
  }

  /**
   * Start background location tracking with notification
   */
  startBackgroundTracking(callback: LocationCallback): void {
    if (!this.isRegistered) {
      this.registerBackgroundTask()
    }

    // Start the location service
    locationService.start(callback)

    // Register device with server
    const deviceId = this.getContext()?.config?.metadata?.find(
      (m: any) => m.name === 'device_id'
    )?.value || 'default-device'

    reportService.registerDevice(deviceId, 'HarmonyOS Tracker').then(success => {
      if (success) {
        console.log('[BgTaskManager] Device registered on server')
      } else {
        console.warn('[BgTaskManager] Device registration failed')
      }
    })

    // Start continuous foreground service notification
    this.startForegroundNotification()
  }

  /**
   * Stop background tracking
   */
  stopBackgroundTracking(): void {
    locationService.stop()
    this.stopForegroundNotification()
    console.log('[BgTaskManager] Background tracking stopped')
  }

  /**
   * Start a foreground notification to keep app alive
   */
  private startForegroundNotification(): void {
    if (!this.context) return

    try {
      // Create notification to keep app alive in background
      const notificationRequest = {
        notification: {
          content: {
            ordinaryText: {
              text: '📍 GeoTracker 正在后台运行\n实时位置追踪已启用',
            },
          },
          advancedAttrs: {
            smallIcon: undefined, // Should set app icon
            type: 0, // TYPE_STATUS_BAR
            importance: 4, // IMPORTANCE_DEFAULT
          },
        },
        id: 1001,
      }

      // Note: Actual notification implementation requires notificationKit
      // This is a conceptual placeholder
      console.log('[BgTaskManager] Foreground notification started')
    } catch (e) {
      console.error('[BgTaskManager] Notification error:', e)
    }
  }

  /**
   * Stop foreground notification
   */
  private stopForegroundNotification(): void {
    // Notification will auto-dismiss or can be explicitly cancelled
    console.log('[BgTaskManager] Foreground notification stopped')
  }

  private getContext(): any {
    return this.context
  }
}

// Singleton instance
export const bgTaskManager = new BackgroundTaskManager()
