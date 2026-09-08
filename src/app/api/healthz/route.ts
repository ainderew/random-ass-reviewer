import { NextResponse } from 'next/server';
import { databaseReachable } from '@/server/services/health';

// Container health. Unauthenticated, cheap, and honest about the database.
export async function GET() {
  const ok = await databaseReachable();
  return NextResponse.json({ ok }, { status: ok ? 200 : 503 });
}
