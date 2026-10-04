import { NextResponse } from 'next/server';
import { HealthResponse } from '../../../src/health';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse> {
  const payload: HealthResponse = {
    status: 'ok',
    timestamp: new Date().toISOString(),
  };

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      'content-type': 'application/json',
    },
  });
}
