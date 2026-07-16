'use client';

import { useEffect } from 'react';

export default function SecurityGuard() {
  useEffect(() => {
    if (typeof window === 'undefined') return;

    // 1. Prevent Right-Click using capture phase and stop propagation
    const preventRightClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();
      return false;
    };

    document.addEventListener('contextmenu', preventRightClick, true);
    window.addEventListener('contextmenu', preventRightClick, true);

    // 2. Lock down oncontextmenu property to prevent extensions from resetting it
    try {
      const lockProperty = (obj: any) => {
        Object.defineProperty(obj, 'oncontextmenu', {
          get() {
            return preventRightClick;
          },
          set() {
            // Silently ignore extension overrides
          },
          configurable: false,
          enumerable: true,
        });
      };
      lockProperty(window);
      lockProperty(document);
      lockProperty(document.body || {});
    } catch (e) {
      console.warn('Security lockdown: properties check bypass');
    }

    // 3. Block Developer Tools & Common Bypass Shortcuts
    const blockShortcuts = (e: KeyboardEvent) => {
      const ctrlOrCmd = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;
      const alt = e.altKey;
      const key = e.key.toLowerCase();
      const code = e.keyCode;

      // F12
      if (key === 'f12' || code === 123) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+Shift+I / Cmd+Opt+I (Inspect)
      // Ctrl+Shift+J / Cmd+Opt+J (Console)
      // Ctrl+Shift+C / Cmd+Opt+C (Element Selector)
      if (ctrlOrCmd && shift && (key === 'i' || key === 'j' || key === 'c' || code === 73 || code === 74 || code === 67)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Cmd+Opt+I or Cmd+Opt+J on Mac
      if (ctrlOrCmd && alt && (key === 'i' || key === 'j' || code === 73 || code === 74)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+U (View Source)
      if (ctrlOrCmd && (key === 'u' || code === 85)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }

      // Ctrl+S (Save Page)
      if (ctrlOrCmd && (key === 's' || code === 83)) {
        e.preventDefault();
        e.stopPropagation();
        return false;
      }
    };

    window.addEventListener('keydown', blockShortcuts, true);
    document.addEventListener('keydown', blockShortcuts, true);

    // 4. Counter DevTools Bypasses via recursive debugger freeze loop
    // This activates breakpoints immediately if DevTools is opened, rendering the inspector unusable.
    let devtoolsCheckInterval: NodeJS.Timeout;
    const startAntiInspect = () => {
      const freeze = () => {
        try {
          // Dynamic evaluation of debugger to defeat extension regex blockers
          (function() {}).constructor('debugger')();
        } catch (err) {}
      };

      devtoolsCheckInterval = setInterval(() => {
        // Measure window dimension delta to detect docked DevTools
        const threshold = 160;
        const widthDevTools = window.outerWidth - window.innerWidth > threshold;
        const heightDevTools = window.outerHeight - window.innerHeight > threshold;

        if (widthDevTools || heightDevTools) {
          // Docked DevTools detected, trigger continuous debugger loop
          freeze();
        }

        // Always run freeze to counter undocked DevTools
        freeze();
      }, 100);
    };

    // Delay start slightly to allow page component hydration
    const timer = setTimeout(startAntiInspect, 1000);

    return () => {
      document.removeEventListener('contextmenu', preventRightClick, true);
      window.removeEventListener('contextmenu', preventRightClick, true);
      window.removeEventListener('keydown', blockShortcuts, true);
      document.removeEventListener('keydown', blockShortcuts, true);
      clearTimeout(timer);
      if (devtoolsCheckInterval) clearInterval(devtoolsCheckInterval);
    };
  }, []);

  return null;
}
