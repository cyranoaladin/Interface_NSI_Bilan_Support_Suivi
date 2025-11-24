import { NextRequest } from 'next/server';
import { metrics } from '@/lib/metrics';
import type { SessionInfo } from '@/lib/auth-utils';

export type ApiHandler<T = any> = (
  req: NextRequest, 
  params: { params: Record<string, string> },
  session?: SessionInfo
) => Promise<Response>;

export function withMetrics<T>(handler: ApiHandler<T>, routePath: string) {
  return async (
    req: NextRequest, 
    params: { params: Record<string, string> },
    session?: SessionInfo
  ): Promise<Response> => {
    const startTime = Date.now();
    const method = req.method || 'GET';
    const route = routePath;

    // Increment active requests
    metrics.incrementActiveRequest(method, route);

    try {
      const response = await handler(req, params, session);
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      
      // Record metrics
      metrics.observeHttpRequestDuration(method, route, response.status, duration);
      metrics.incrementHttpRequestTotal(method, route, response.status);
      
      return response;
    } catch (error) {
      const duration = (Date.now() - startTime) / 1000; // Convert to seconds
      
      // Record error metrics
      metrics.observeHttpRequestDuration(method, route, 500, duration);
      metrics.incrementHttpRequestTotal(method, route, 500);
      
      throw error;
    } finally {
      // Decrement active requests
      metrics.decrementActiveRequest(method, route);
    }
  };
}