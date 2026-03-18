'use client';

import { useEffect, useState } from 'react';

interface ServiceStatus {
  status: string;
  latency?: number;
  error?: string;
}

interface HealthData {
  status: 'ok' | 'degraded' | 'error';
  timestamp: string;
  services: {
    postgres: ServiceStatus;
    redis: ServiceStatus;
    chromadb: ServiceStatus;
  };
  uptime: number;
}

export default function MonitorPage() {
  const [health, setHealth] = useState<HealthData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/v1/health');
      const data = await res.json();
      setHealth(data.data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch health');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchHealth();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ok':
        return 'text-green-500';
      case 'degraded':
        return 'text-yellow-500';
      case 'error':
        return 'text-red-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'ok':
        return '✓';
      case 'degraded':
        return '⚠';
      case 'error':
        return '✗';
      default:
        return '?';
    }
  };

  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    return `${days}d ${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-lg text-red-500">Error: {error}</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">System Monitor</h1>

        {/* Overall Status */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold text-gray-700">Overall Status</h2>
              <p className="text-sm text-gray-500">
                Last updated: {health?.timestamp}
              </p>
            </div>
            <div className={`text-4xl font-bold ${getStatusColor(health?.status || 'unknown')}`}>
              {getStatusIcon(health?.status || 'unknown')} {health?.status?.toUpperCase()}
            </div>
          </div>
          <div className="mt-4 pt-4 border-t">
            <p className="text-sm text-gray-600">
              Uptime: <span className="font-mono">{formatUptime(health?.uptime || 0)}</span>
            </p>
          </div>
        </div>

        {/* Service Status */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {health?.services && Object.entries(health.services).map(([name, service]) => (
            <div key={name} className="bg-white rounded-lg shadow p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-700 capitalize">{name}</h3>
                <span className={`text-2xl ${getStatusColor(service.status)}`}>
                  {getStatusIcon(service.status)}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Status:</span>
                  <span className={`font-medium ${getStatusColor(service.status)}`}>
                    {service.status.toUpperCase()}
                  </span>
                </div>
                {service.latency !== undefined && (
                  <div className="flex justify-between">
                    <span className="text-gray-500">Latency:</span>
                    <span className="font-mono">{service.latency}ms</span>
                  </div>
                )}
                {service.error && (
                  <div className="mt-2 p-2 bg-red-50 rounded text-red-600 text-xs">
                    {service.error}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Refresh Button */}
        <div className="mt-6 text-center">
          <button
            onClick={fetchHealth}
            className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
          >
            Refresh
          </button>
        </div>
      </div>
    </div>
  );
}
