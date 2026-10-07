import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({ status: 'ok', hint: 'use /api/safe-diag for full diagnostic' });
}
