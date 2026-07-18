export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    const { startImapIdleListener } = await import('@/lib/imap-service');
    startImapIdleListener().catch(err => {
      console.error('[Instrumentation] Error starting IMAP IDLE:', err);
    });
  }
}
