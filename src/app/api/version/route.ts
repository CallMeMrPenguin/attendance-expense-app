import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

const BUILD_ID =
  process.env.VERCEL_GIT_COMMIT_SHA ||
  process.env.NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA ||
  process.env.BUILD_ID ||
  'local';

export async function GET() {
  return NextResponse.json({
    version: BUILD_ID,
    timestamp: Date.now()
  });
}
