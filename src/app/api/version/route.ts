import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET() {
  let buildId = process.env.BUILD_ID;

  if (!buildId) {
    try {
      const buildIdPath = path.resolve(process.cwd(), '.next/BUILD_ID');
      if (fs.existsSync(buildIdPath)) {
        buildId = fs.readFileSync(buildIdPath, 'utf8').trim();
      }
    } catch (e) {}
  }

  if (!buildId) {
    try {
      const gitHeadPath = path.resolve(process.cwd(), '.git/HEAD');
      if (fs.existsSync(gitHeadPath)) {
        const headContent = fs.readFileSync(gitHeadPath, 'utf8').trim();
        if (headContent.startsWith('ref: ')) {
          const refPath = path.resolve(process.cwd(), '.git', headContent.slice(5).trim());
          if (fs.existsSync(refPath)) {
            buildId = fs.readFileSync(refPath, 'utf8').trim().slice(0, 10);
          }
        } else {
          buildId = headContent.slice(0, 10);
        }
      }
    } catch (e) {}
  }

  return NextResponse.json({
    version: buildId || `build-${Date.now()}`,
    timestamp: Date.now()
  });
}
