import request from 'supertest';
import app from '../app';

describe('Tracing Middleware Tests', () => {
  it('should add trace ID to response headers', async () => {
    const response = await request(app.callback()).get('/');
    expect(response.headers['x-trace-id']).toBeDefined();
    expect(typeof response.headers['x-trace-id']).toBe('string');
  });

  it('should maintain the same trace ID throughout the request', async () => {
    const firstResponse = await request(app.callback()).get('/');
    const secondResponse = await request(app.callback()).get('/');
    
    expect(firstResponse.headers['x-trace-id']).not.toBe(secondResponse.headers['x-trace-id']);
  });

  it('should include trace ID in error responses', async () => {
    const response = await request(app.callback()).get('/non-existent-path');
    expect(response.headers['x-trace-id']).toBeDefined();
    expect(response.status).toBe(404);
  });

  it('should handle concurrent requests with different trace IDs', async () => {
    const requests = Array(5).fill(null).map(() =>
      request(app.callback()).get('/')
    );

    const responses = await Promise.all(requests);
    const traceIds = responses.map((res: request.Response) => res.headers['x-trace-id']);
    const uniqueTraceIds = new Set(traceIds);

    expect(uniqueTraceIds.size).toBe(requests.length);
  });
});