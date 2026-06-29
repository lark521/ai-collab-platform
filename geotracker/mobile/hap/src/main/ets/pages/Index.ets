import { bgTaskManager } from '../services/BackgroundTaskManager'
import { locationService, LocationData } from '../services/LocationService'
import { reportService, ReportResponse } from '../services/ReportService'
import { ServerConfig, DEVICE_ID } from '../constants/ServerConfig'
import { AppViewModel } from '../views/ViewModel'

@Entry
@Component
struct Index {
  @State viewModel: AppViewModel = new AppViewModel()
  
  // Tab selection
  @State activeTab: number = 0
  @Trace isTracking: boolean = false
  @Trace serverConnected: boolean = false
  @Trace statusText: string = '准备就绪'
  
  // Config panel
  @Trace configUrl: string = ServerConfig.DEFAULT_SERVER_URL
  @Trace configKey: string = ServerConfig.DEFAULT_API_KEY
  @Trace showConfig: boolean = false

  aboutToAppear() {
    this.configUrl = this.viewModel.serverUrl
    this.configKey = this.viewModel.apiKey
    this.initService()
  }

  async initService() {
    try {
      // Initialize location service
      const locOk = await locationService.init()
      if (locOk) {
        this.statusText = '定位服务已初始化'
      }
      
      // Set server config
      reportService.setServerUrl(this.configUrl)
      reportService.setApiKey(this.configKey)
      
      // Test server connection
      const connected = await this.checkServerConnection()
      this.serverConnected = connected
    } catch (e) {
      this.statusText = `初始化失败: ${String(e)}`
    }
  }

  async checkServerConnection(): Promise<boolean> {
    try {
      const http = new http.HttpTask()
      const resp = await http.request(
        `${this.configUrl}/api/health`,
        http.RequestMethod.GET,
        {
          readTimeout: 5000,
          connectTimeout: 5000,
        }
      )
      return resp.responseCode === 200
    } catch (e) {
      return false
    }
  }

  build() {
    NavigationStack {
      Column() {
        // Header
        Row() {
          Text('📍')
            .fontSize(28)
          Text('GeoTracker')
            .fontSize(22)
            .fontWeight(FontWeight.Bold)
            .margin({ left: 8 })
          
          Blank()
          
          Button(this.isTracking ? '⏹' : '⏵')
            .fontSize(18)
            .width(44)
            .height(44)
            .borderRadius(22)
            .backgroundColor(this.isTracking ? '#EF4444' : '#10B981')
            .onClick(() => this.toggleTracking())
            .enableAnimation(true)
          
          Button('⚙️')
            .fontSize(18)
            .width(44)
            .height(44)
            .borderRadius(22)
            .backgroundColor('#374151')
            .margin({ left: 8 })
            .onClick(() => { this.showConfig = true })
        }
        .width('100%')
        .padding({ left: 16, right: 16, top: 12, bottom: 8 })

        // Connection status bar
        Row() {
          Circle()
            .width(8)
            .height(8)
            .backgroundColor(this.serverConnected ? '#10B981' : '#EF4444')
          
          Text(this.serverConnected ? '服务器已连接' : '服务器未连接')
            .fontSize(12)
            .fontColor(this.serverConnected ? '#10B981' : '#EF4444')
            .margin({ left: 6 })
        }
        .padding({ left: 16, right: 16, bottom: 8 })
        .width('100%')

        // Status message
        if (this.statusText) {
          Text(this.statusText)
            .fontSize(12)
            .fontColor('#9CA3AF')
            .padding({ left: 16, right: 16, bottom: 8 })
            .width('100%')
            .textAlign(TextAlign.Center)
        }

        // Main content - scrollable
        Scroll() {
          Column() {
            // Location Card
            this.LocationCard()
            
            // Stats Card
            this.StatsCard()
            
            // Quick Actions
            this.ActionButtons()
            
            // Configuration Card (collapsible)
            if (this.showConfig) {
              this.ConfigCard()
            }
          }
          .padding({ top: 8, bottom: 24 })
        }
        .layoutWeight(1)
        .scrollBar(BarState.Off)
      }
      .backgroundColor('#0F172A')
      .width('100%')
      .height('100%')
    }
    .title('GeoTracker')
  }

  // ===== Location Card =====
  @Builder
  LocationCard() {
    Column() {
      Row() {
        Text('📡 实时位置')
          .fontSize(15)
          .fontColor('#E2E8F0')
          .fontWeight(FontWeight.Medium)
        
        Blank()
        
        Text(this.isTracking ? '追踪中...' : '已停止')
          .fontSize(12)
          .fontColor(this.isTracking ? '#10B981' : '#9CA3AF')
      }
      .width('100%')
      .padding({ bottom: 16 })

      Row() {
        Column() {
          Text('纬度')
            .fontSize(11)
            .fontColor('#64748B')
            .margin({ bottom: 4 })
          Text('--')
            .fontSize(20)
            .fontColor('#F8FAFC')
            .fontWeight(FontWeight.Bold)
            .id('latDisplay')
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.Start)

        Column() {
          Text('经度')
            .fontSize(11)
            .fontColor('#64748B')
            .margin({ bottom: 4 })
          Text('--')
            .fontSize(20)
            .fontColor('#F8FAFC')
            .fontWeight(FontWeight.Bold)
            .id('lngDisplay')
        }
        .layoutWeight(1)
        .alignItems(HorizontalAlign.End)
      }
      .width('100%')

      Row() {
        Text('精度: --')
          .fontSize(12)
          .fontColor('#94A3B8')
          .margin({ right: 24 })
          .id('accuracyDisplay')
        
        Text('上报: --')
          .fontSize(12)
          .fontColor('#94A3B8')
          .id('reportTimeDisplay')
      }
      .width('100%')
      .padding({ top: 12 })
    }
    .width('100%')
    .padding(20)
    .borderRadius(16)
    .backgroundColor('#1E293B')
    .margin({ left: 16, right: 16, bottom: 12 })
  }

  // ===== Stats Card =====
  @Builder
  StatsCard() {
    Column() {
      Text('📊 运行统计')
        .fontSize(15)
        .fontColor('#E2E8F0')
        .fontWeight(FontWeight.Medium)
        .width('100%')
        .padding({ bottom: 16 })

      Row() {
        this.statItem('已上报', `${this.viewModel.reportCount}`, '📤')
        Divider()
          .width(1)
          .backgroundColor('#334155')
          .margin({ vertical: 8 })
        this.statItem('间隔', '5分钟', '⏱')
        Divider()
          .width(1)
          .backgroundColor('#334155')
          .margin({ vertical: 8 })
        this.statItem('设备ID', DEVICE_ID.substring(0, 12) + '...', '📱')
      }
      .width('100%')
    }
    .width('100%')
    .padding(20)
    .borderRadius(16)
    .backgroundColor('#1E293B')
    .margin({ left: 16, right: 16, bottom: 12 })
  }

  @Builder
  statItem(label: string, value: string, icon: string) {
    Column() {
      Text(icon)
        .fontSize(18)
        .margin({ bottom: 4 })
      Text(label)
        .fontSize(11)
        .fontColor('#64748B')
      Text(value)
        .fontSize(14)
        .fontColor('#E2E8F0')
        .fontWeight(FontWeight.Medium)
    }
    .alignItems(HorizontalAlign.Center)
    .width('30%')
  }

  // ===== Action Buttons =====
  @Builder
  ActionButtons() {
    Column() {
      Text('⚡ 快捷操作')
        .fontSize(15)
        .fontColor('#E2E8F0')
        .fontWeight(FontWeight.Medium)
        .width('100%')
        .padding({ bottom: 12 })

      Row() {
        Button('🔄 测试上报')
          .fontSize(14)
          .width('48%')
          .height(44)
          .backgroundColor('#3B82F6')
          .borderRadius(12)
          .onClick(() => {
            this.viewModel.testReport()
          })
        
        Button('🏥 检查连接')
          .fontSize(14)
          .width('48%')
          .height(44)
          .backgroundColor('#8B5CF6')
          .borderRadius(12)
          .onClick(async () => {
            const ok = await this.checkServerConnection()
            this.statusText = ok ? '服务器连接正常 ✅' : '无法连接服务器 ❌'
          })
      }
      .width('100%')
      .justifyContent(FlexAlign.SpaceAround)
      .margin({ bottom: 10 })

      Row() {
        Button('⚙️ 服务器设置')
          .fontSize(14)
          .width('100%')
          .height(44)
          .backgroundColor('#475569')
          .borderRadius(12)
          .onClick(() => {
            this.showConfig = !this.showConfig
          })
      }
      .width('100%')
    }
    .width('100%')
    .padding(20)
    .borderRadius(16)
    .backgroundColor('#1E293B')
    .margin({ left: 16, right: 16, bottom: 12 })
  }

  // ===== Config Card =====
  @Builder
  ConfigCard() {
    Column() {
      Text('🔧 服务器配置')
        .fontSize(15)
        .fontColor('#E2E8F0')
        .fontWeight(FontWeight.Medium)
        .width('100%')
        .padding({ bottom: 16 })

      Column() {
        Text('服务器地址')
          .fontSize(12)
          .fontColor('#94A3B8')
          .margin({ bottom: 6 })
          .width('100%')
        
        TextInput({ placeholder: 'http://your-server:3000' })
          .type(InputType.Normal)
          .width('100%')
          .height(44)
          .backgroundColor('#0F172A')
          .fontColor('#E2E8F0')
          .fontSize(14)
          .borderRadius(8)
          .onChange((value: string) => {
            this.configUrl = value
          })
          .onCommit(() => {
            this.viewModel.serverUrl = this.configUrl
          })
      }
      .width('100%')
      .margin({ bottom: 14 })

      Column() {
        Text('API Key')
          .fontSize(12)
          .fontColor('#94A3B8')
          .margin({ bottom: 6 })
          .width('100%')
        
        TextInput({ placeholder: '输入API密钥' })
          .type(InputType.Password)
          .width('100%')
          .height(44)
          .backgroundColor('#0F172A')
          .fontColor('#E2E8F0')
          .fontSize(14)
          .borderRadius(8)
          .onChange((value: string) => {
            this.configKey = value
          })
          .onCommit(() => {
            this.viewModel.apiKey = this.configKey
          })
      }
      .width('100%')
      .margin({ bottom: 20 })

      Row() {
        Button('💾 保存配置')
          .fontSize(14)
          .layoutWeight(1)
          .height(42)
          .backgroundColor('#10B981')
          .borderRadius(10)
          .margin({ right: 8 })
          .onClick(() => {
            this.viewModel.saveConfig()
          })
        
        Button('取消')
          .fontSize(14)
          .layoutWeight(1)
          .height(42)
          .backgroundColor('#374151')
          .borderRadius(10)
          .onClick(() => {
            this.showConfig = false
          })
      }
      .width('100%')
    }
    .width('100%')
    .padding(20)
    .borderRadius(16)
    .backgroundColor('#1E293B')
    .margin({ left: 16, right: 16, bottom: 12 })
  }

  /**
   * Toggle tracking on/off
   */
  toggleTracking() {
    if (this.isTracking) {
      // Stop
      locationService.stop()
      this.isTracking = false
      this.statusText = '追踪已停止'
    } else {
      // Start
      this.isTracking = true
      this.statusText = '正在启动追踪...'
      
      // Set config
      reportService.setServerUrl(this.configUrl)
      reportService.setApiKey(this.configKey)
      
      // Start location service with callback
      locationService.start({
        onLocation: (loc: LocationData) => {
          this.statusText = `位置: ${loc.latitude.toFixed(4)}, ${loc.longitude.toFixed(4)}`
        },
        onError: (error: string) => {
          this.statusText = `错误: ${error}`
        },
        onReport: (response: ReportResponse) => {
          if (response.success) {
            this.statusText = `已上报 ${response.inserted} 条记录 ✅`
          } else {
            this.statusText = `上报失败: ${response.error}`
          }
        },
      })
    }
  }
}
