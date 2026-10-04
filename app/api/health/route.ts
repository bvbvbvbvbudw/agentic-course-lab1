import { NextResponse } from 'next/server';
import { HealthResponse } from '../../../src/health';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const body: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(body, {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  });
}
