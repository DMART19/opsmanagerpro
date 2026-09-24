/**
 * API Performance Tracker — collects client-side latency and error rate metrics.
 * Stores rolling windows of API call data for the System Reliability dashboard.
 * 
 * No database writes — all data is in-memory and derived from the existing
 * fetch interceptor + error_logs table.
 */

export interface ApiMetric {
  endpoint: string;
  method: string;
  statusCode: number;
  latencyMs: number;
  timestamp: number;
  isError: boolean;
}

const MAX_METRICS = 500;
const metrics: ApiMetric[] = [];

/** Record an API call metric */
export function recordApiMetric(metric: ApiMetric) {
  metrics.push(metric);
  if (metrics.length > MAX_METRICS) {
    metrics.splice(0, metrics.length - MAX_METRICS);
  }
}

/** Get all recorded metrics */
export function getApiMetrics(): ApiMetric[] {
  return [...metrics];
}

/** Get metrics within a time window (ms) */
export function getMetricsSince(windowMs: number): ApiMetric[] {
  const cutoff = Date.now() - windowMs;
  return metrics.filter(m => m.timestamp >= cutoff);
}

/** Aggregate stats by endpoint */
export interface EndpointStats {
  endpoint: string;
  totalCalls: number;
  errorCount: number;
  errorRate: number;
  avgLatency: number;
  p95Latency: number;
  maxLatency: number;
  lastSeen: number;
}

export function aggregateByEndpoint(windowMs: number = 3600_000): EndpointStats[] {
  const recent = getMetricsSince(windowMs);
  const groups = new Map<string, ApiMetric[]>();

  for (const m of recent) {
    const key = `${m.method} ${m.endpoint}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(m);
  }

  const result: EndpointStats[] = [];
  for (const [key, calls] of groups) {
    const errors = calls.filter(c => c.isError);
    const latencies = calls.map(c => c.latencyMs).sort((a, b) => a - b);
    const p95Idx = Math.floor(latencies.length * 0.95);

    result.push({
      endpoint: key,
      totalCalls: calls.length,
      errorCount: errors.length,
      errorRate: calls.length > 0 ? (errors.length / calls.length) * 100 : 0,
      avgLatency: latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
      p95Latency: latencies[p95Idx] ?? 0,
      maxLatency: latencies[latencies.length - 1] ?? 0,
      lastSeen: Math.max(...calls.map(c => c.timestamp)),
    });
  }

  return result.sort((a, b) => b.totalCalls - a.totalCalls);
}

/** Get overall summary stats */
export interface ReliabilitySummary {
  totalCalls: number;
  totalErrors: number;
  overallErrorRate: number;
  avgLatency: number;
  p95Latency: number;
  slowEndpoints: EndpointStats[];
  highErrorEndpoints: EndpointStats[];
}

export function getReliabilitySummary(windowMs: number = 3600_000): ReliabilitySummary {
  const recent = getMetricsSince(windowMs);
  const latencies = recent.map(m => m.latencyMs).sort((a, b) => a - b);
  const errors = recent.filter(m => m.isError);
  const p95Idx = Math.floor(latencies.length * 0.95);

  const byEndpoint = aggregateByEndpoint(windowMs);

  return {
    totalCalls: recent.length,
    totalErrors: errors.length,
    overallErrorRate: recent.length > 0 ? (errors.length / recent.length) * 100 : 0,
    avgLatency: latencies.length > 0 ? Math.round(latencies.reduce((a, b) => a + b, 0) / latencies.length) : 0,
    p95Latency: latencies[p95Idx] ?? 0,
    slowEndpoints: byEndpoint.filter(e => e.p95Latency > 500).sort((a, b) => b.p95Latency - a.p95Latency).slice(0, 10),
    highErrorEndpoints: byEndpoint.filter(e => e.errorRate > 5).sort((a, b) => b.errorRate - a.errorRate).slice(0, 10),
  };
}

/** Latency trend buckets (5-min intervals) */
export interface LatencyBucket {
  timestamp: number;
  label: string;
  avgLatency: number;
  callCount: number;
  errorCount: number;
}

export function getLatencyTrend(windowMs: number = 3600_000, bucketMs: number = 300_000): LatencyBucket[] {
  const now = Date.now();
  const recent = getMetricsSince(windowMs);
  const bucketCount = Math.ceil(windowMs / bucketMs);
  const buckets: LatencyBucket[] = [];

  for (let i = 0; i < bucketCount; i++) {
    const bucketStart = now - windowMs + i * bucketMs;
    const bucketEnd = bucketStart + bucketMs;
    const inBucket = recent.filter(m => m.timestamp >= bucketStart && m.timestamp < bucketEnd);

    const avgLat = inBucket.length > 0
      ? Math.round(inBucket.reduce((sum, m) => sum + m.latencyMs, 0) / inBucket.length)
      : 0;

    const minutes = new Date(bucketStart).getMinutes();
    const hours = new Date(bucketStart).getHours();

    buckets.push({
      timestamp: bucketStart,
      label: `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`,
      avgLatency: avgLat,
      callCount: inBucket.length,
      errorCount: inBucket.filter(m => m.isError).length,
    });
  }

  return buckets;
}
