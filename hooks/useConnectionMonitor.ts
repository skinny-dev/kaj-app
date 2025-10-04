import { useState, useEffect } from 'react';

interface ConnectionStatus {
  api: boolean;
  ws: boolean;
  printer: boolean;
  mode: 'localhost' | 'network' | 'production';
}

export const useConnectionMonitor = () => {
  const [status, setStatus] = useState<ConnectionStatus>({
    api: false,
    ws: false,
    printer: false,
    mode: 'localhost'
  });

  const detectMode = (): 'localhost' | 'network' | 'production' => {
    const hostname = window.location.hostname;
    if (hostname.includes('.liara.run')) return 'production';
    if (hostname.match(/^192\.168\.|^10\.|^172\.(1[6-9]|2\d|3[01])\./)) return 'network';
    return 'localhost';
  };

  const getApiUrl = (mode: string) => {
    switch (mode) {
      case 'production': return 'https://kaj-api.liara.run';
      case 'network': return `http://${window.location.hostname.replace(/:\d+$/, '')}:3000`;
      default: return 'http://localhost:3000';
    }
  };

  const getPrinterUrl = (mode: string) => {
    switch (mode) {
      case 'production': return null; // No printer in production
      case 'network': return `http://${window.location.hostname.replace(/:\d+$/, '')}:18080`;
      default: return 'http://localhost:18080';
    }
  };

  const testConnections = async () => {
    const mode = detectMode();
    const apiUrl = getApiUrl(mode);
    const printerUrl = getPrinterUrl(mode);

    let apiStatus = false;
    let wsStatus = false;
    let printerStatus = false;

    // Test API
    try {
      const response = await fetch(`${apiUrl}/health`);
      apiStatus = response.ok;
    } catch (error) {
      console.warn('API connection failed:', error);
    }

    // Test WebSocket
    try {
      const ws = new WebSocket(apiUrl.replace('http', 'ws'));
      ws.onopen = () => {
        wsStatus = true;
        ws.close();
      };
      // Wait a bit for connection
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (error) {
      console.warn('WebSocket connection failed:', error);
    }

    // Test Printer Bridge
    if (printerUrl) {
      try {
        const response = await fetch(`${printerUrl}/health`);
        printerStatus = response.ok;
      } catch (error) {
        console.warn('Printer bridge connection failed:', error);
      }
    }

    setStatus({
      api: apiStatus,
      ws: wsStatus,
      printer: printerStatus,
      mode
    });
  };

  useEffect(() => {
    testConnections();
    const interval = setInterval(testConnections, 30000); // Check every 30 seconds
    return () => clearInterval(interval);
  }, []);

  return { status, refresh: testConnections };
};