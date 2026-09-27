import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BUILD_ID = process.env.BUILD_ID || 'local-v1.0.0';

export async function GET() {
  return NextResponse.json({
    version: BUILD_ID,
    timestamp: Date.now()
  });
}
