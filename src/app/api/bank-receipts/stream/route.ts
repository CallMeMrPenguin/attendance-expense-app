import { NextResponse } from 'next/server';
import { subscribeSseClient, unsubscribeSseClient, startImapIdleListener, getCachedReceipts } from '@/lib/imap-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Ensure IMAP IDLE listener is active
      startImapIdleListener().catch(console.error);

      const listener = (event: string, data: any) => {
        try {
          controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
        } catch (e) {
          // Stream closed
        }
      };

      subscribeSseClient(listener);

      // Send initial cached receipts on connection
      try {
        controller.enqueue(encoder.encode(`event: init\ndata: ${JSON.stringify({ success: true, receipts: getCachedReceipts() })}\n\n`));
      } catch (e) {}

      // Heartbeat ping every 15s to keep SSE connection alive indefinitely
      const pingInterval = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`:ping\n\n`));
        } catch (e) {
          clearInterval(pingInterval);
          unsubscribeSseClient(listener);
        }
      }, 15000);

      return () => {
        clearInterval(pingInterval);
        unsubscribeSseClient(listener);
      };
    },
    cancel() {
      // Client disconnected
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
    }
  });
}
