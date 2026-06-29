import { reportService } from '../services/ReportService'
import { ServerConfig } from '../constants/ServerConfig'

@ObservedV2
export class AppViewModel {
  // UI state
  @Trace isRunning: boolean = false
  @Trace serverUrl: string = ServerConfig.DEFAULT_SERVER_URL
  @Trace apiKey: string = ServerConfig.DEFAULT_API_KEY
  
  // Location info
  @Trace lastLatitude: string = '--'
  @Trace lastLongitude: string = '--'
  @Trace lastAccuracy: string = '--'
  @Trace lastReportTime: string = '--'
  
  // Stats
  @Trace reportCount: number = 0
  @Trace errorMessage: string = ''
  @Trace isLoading: boolean = false

  constructor() {
    // Load saved config from Preferences
    this.loadConfig()
  }

  /**
   * Load saved configuration
   */
  private loadConfig(): void {
    try {
      // Preferences would be loaded here
      // For now use defaults from ServerConfig
    } catch (e) {
      console.error('[ViewModel] Failed to load config:', e)
    }
  }

  /**
   * Save configuration
   */
  saveConfig(): void {
    try {
      // Save to Preferences
      reportService.setServerUrl(this.serverUrl)
      reportService.setApiKey(this.apiKey)
      this.errorMessage = '配置已保存 ✅'
      setTimeout(() => { this.errorMessage = '' }, 2000)
    } catch (e) {
      this.errorMessage = `保存失败: ${String(e)}`
    }
  }

  /**
   * Toggle tracking
   */
  async toggleTracking(isStarted: boolean): Promise<void> {
    this.isLoading = true
    this.errorMessage = ''

    if (isStarted) {
      try {
        // Initialize and start
        const success = await reportService.registerDevice('harmony-device-001')
        if (success) {
          this.isRunning = true
          this.errorMessage = '追踪已启动 📍'
        } else {
          this.errorMessage = '启动失败，请检查服务器地址'
        }
      } catch (e) {
        this.errorMessage = `错误: ${String(e)}`
      }
    } else {
      this.isRunning = false
      this.errorMessage = '追踪已停止'
    }

    this.isLoading = false
  }

  /**
   * Manual test report
   */
  async testReport(): Promise<void> {
    this.isLoading = true
    try {
      const response = await reportService.report([
        {
          latitude: 39.54123,
          longitude: 121.40234,
          accuracy: 10,
          address: '测试位置 - 大连长兴岛',
          reportedAt: Date.now(),
        },
      ])
      
      if (response.success) {
        this.reportCount = (response.inserted || 0) + this.reportCount
        this.errorMessage = `上报成功！已发送 ${response.inserted} 条记录 ✅`
      } else {
        this.errorMessage = `上报失败: ${response.error}`
      }
    } catch (e) {
      this.errorMessage = `错误: ${String(e)}`
    }
    this.isLoading = false
  }

  /**
   * Update location display
   */
  updateLocation(latitude: number, longitude: number, accuracy?: number): void {
    this.lastLatitude = latitude.toFixed(6)
    this.lastLongitude = longitude.toFixed(6)
    this.lastAccuracy = accuracy ? `${accuracy.toFixed(1)}m` : '--'
    this.lastReportTime = new Date().toLocaleTimeString('zh-CN')
  }

  /**
   * Get server health status
   */
  async checkHealth(): Promise<boolean> {
    try {
      // Simple fetch to check connectivity
      const http = new http.HttpTask()
      const resp = await http.request(
        `${this.serverUrl}/api/health`,
        http.RequestMethod.GET
      )
      return resp.responseCode === 200
    } catch (e) {
      return false
    }
  }
}
