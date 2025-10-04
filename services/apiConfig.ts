// Smart API URL detection utility
export class ApiConfig {
  private static instance: ApiConfig;
  private apiUrl: string = '';
  private wsUrl: string = '';
  private isNetworkDetected: boolean = false;

  private constructor() {
    this.detectEnvironment();
  }

  public static getInstance(): ApiConfig {
    if (!ApiConfig.instance) {
      ApiConfig.instance = new ApiConfig();
    }
    return ApiConfig.instance;
  }

  private detectEnvironment(): void {
    const hostname = window.location.hostname;
    const isLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';
    const isNetworkIP = hostname.match(/^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./);
    const isProduction = hostname.includes('.liara.run') || !isLocalhost && !isNetworkIP;

    console.log('[ApiConfig] Environment detection:', {
      hostname,
      isLocalhost,
      isNetworkIP: !!isNetworkIP,
      isProduction
    });

    // Auto-detect or use environment variables
    const autoDetect = import.meta.env.VITE_API_AUTO_DETECT === 'true';
    
    if (autoDetect) {
      if (isProduction) {
        this.apiUrl = import.meta.env.VITE_API_URL_PRODUCTION || 'https://kaj-api.liara.run/v1';
        this.wsUrl = import.meta.env.VITE_WS_URL_PRODUCTION || 'wss://kaj-api.liara.run';
      } else if (isNetworkIP) {
        this.apiUrl = import.meta.env.VITE_API_URL_NETWORK || `http://${hostname.replace(/:\d+$/, '')}:3000/v1`;
        this.wsUrl = import.meta.env.VITE_WS_URL_NETWORK || `ws://${hostname.replace(/:\d+$/, '')}:3000`;
        this.isNetworkDetected = true;
      } else {
        this.apiUrl = import.meta.env.VITE_API_URL_LOCAL || 'http://localhost:3000/v1';
        this.wsUrl = import.meta.env.VITE_WS_URL_LOCAL || 'ws://localhost:3000';
      }
    } else {
      // Use explicit environment variables
      this.apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/v1';
      this.wsUrl = import.meta.env.VITE_WS_URL || 'ws://localhost:3000';
    }

    console.log('[ApiConfig] Configured URLs:', {
      apiUrl: this.apiUrl,
      wsUrl: this.wsUrl,
      autoDetect,
      isNetworkDetected: this.isNetworkDetected
    });
  }

  public getApiUrl(): string {
    return this.apiUrl;
  }

  public getWsUrl(): string {
    return this.wsUrl;
  }

  public isNetworkMode(): boolean {
    return this.isNetworkDetected;
  }

  public getPrinterBridgeUrl(): string {
    if (this.isNetworkDetected) {
      const baseUrl = this.apiUrl.replace('/v1', '').replace(':3000', ':18080');
      return baseUrl;
    }
    return 'http://localhost:18080';
  }

  // Test connectivity to API
  public async testConnection(): Promise<boolean> {
    try {
      const response = await fetch(`${this.apiUrl.replace('/v1', '')}/health`);
      return response.ok;
    } catch (error) {
      console.warn('[ApiConfig] API connection test failed:', error);
      return false;
    }
  }

  // Fallback to different URL if current fails
  public async fallbackToAlternative(): Promise<void> {
    const alternatives = [
      import.meta.env.VITE_API_URL_LOCAL || 'http://localhost:3000/v1',
      import.meta.env.VITE_API_URL_NETWORK || 'http://192.168.1.129:3000/v1',
      import.meta.env.VITE_API_URL_PRODUCTION || 'https://kaj-api.liara.run/v1'
    ];

    for (const altUrl of alternatives) {
      if (altUrl !== this.apiUrl) {
        try {
          const response = await fetch(altUrl.replace('/v1', '/health'));
          if (response.ok) {
            console.log('[ApiConfig] Falling back to:', altUrl);
            this.apiUrl = altUrl;
            this.wsUrl = altUrl.replace('http', 'ws').replace('/v1', '');
            break;
          }
        } catch (error) {
          console.warn('[ApiConfig] Alternative URL failed:', altUrl, error);
        }
      }
    }
  }
}

// Export singleton instance
export const apiConfig = ApiConfig.getInstance();

// Export convenience functions
export const getApiUrl = () => apiConfig.getApiUrl();
export const getWsUrl = () => apiConfig.getWsUrl();
export const getPrinterBridgeUrl = () => apiConfig.getPrinterBridgeUrl();
export const isNetworkMode = () => apiConfig.isNetworkMode();
export const testApiConnection = () => apiConfig.testConnection();
export const fallbackToAlternative = () => apiConfig.fallbackToAlternative();