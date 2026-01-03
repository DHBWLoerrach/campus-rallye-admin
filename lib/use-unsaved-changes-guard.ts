'use client';
import { useEffect, useRef } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * Guards against accidental navigation when there are unsaved changes.
 *
 * Handles three navigation scenarios:
 * 1. Browser refresh/close (beforeunload event)
 * 2. Browser back/forward buttons (popstate event with guard history entry)
 * 3. In-app link clicks (document click handler in capture phase)
 *
 * @param isDirty - Whether the form has unsaved changes
 * @param message - Confirmation message shown to the user
 */
export function useUnsavedChangesGuard(isDirty: boolean, message: string): void {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Use refs to access current values in event handlers without stale closures
  const isDirtyRef = useRef(isDirty);
  // Tracks whether we've pushed a guard history entry
  const hasGuardRef = useRef(false);
  // Prevents recursive popstate handling when we trigger history.back() ourselves
  const allowNextPopRef = useRef(false);

  const currentUrl = searchParams.toString()
    ? `${pathname}?${searchParams.toString()}`
    : pathname;
  const currentUrlRef = useRef(currentUrl);

  // Keep refs in sync with current values
  useEffect(() => {
    isDirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    currentUrlRef.current = currentUrl;
  }, [currentUrl]);

  // Push a guard history entry when form becomes dirty.
  // This extra entry allows us to intercept the back button via popstate
  // before the browser actually navigates away.
  useEffect(() => {
    if (!isDirty || hasGuardRef.current) return;
    window.history.pushState({ guard: true }, '', currentUrlRef.current);
    hasGuardRef.current = true;
  }, [isDirty]);

  // Handle browser refresh/close and back/forward navigation
  useEffect(() => {
    // Warn before browser refresh or tab close
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (!isDirtyRef.current) return;
      event.preventDefault();
      event.returnValue = '';
    };

    // Handle browser back/forward buttons.
    // The guard history entry we pushed earlier triggers popstate when user
    // clicks back, giving us a chance to confirm before actual navigation.
    const handlePopState = () => {
      // Skip if this popstate was triggered by our own history.back() call
      if (allowNextPopRef.current) {
        allowNextPopRef.current = false;
        return;
      }

      // If form is clean but we have a guard entry, skip over it
      // by triggering another back() navigation. This ensures the guard
      // entry doesn't interfere with normal navigation after form is saved.
      if (!isDirtyRef.current) {
        if (hasGuardRef.current) {
          allowNextPopRef.current = true;
          window.history.back();
        }
        return;
      }

      // Form is dirty - ask user for confirmation
      const confirmLeave = window.confirm(message);
      if (confirmLeave) {
        // User confirmed - proceed with navigation
        allowNextPopRef.current = true;
        window.history.back();
        return;
      }

      // User cancelled - restore guard entry to catch next back attempt
      window.history.pushState({ guard: true }, '', currentUrlRef.current);
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('popstate', handlePopState);
    };
  }, [message]);

  // Intercept in-app link clicks using capture phase.
  // This runs before Next.js Link component handles the click,
  // allowing us to prevent navigation if user cancels.
  useEffect(() => {
    const handleDocumentClick = (event: MouseEvent) => {
      // Skip if form is clean or event already handled
      if (!isDirtyRef.current || event.defaultPrevented) return;

      // Only handle primary (left) mouse button clicks
      if (event.button !== 0) return;

      // Allow modifier key clicks (Cmd/Ctrl+click opens new tab)
      if (event.metaKey || event.altKey || event.ctrlKey || event.shiftKey) {
        return;
      }

      const target = event.target;
      if (!(target instanceof Element)) return;

      const anchor = target.closest('a');
      if (!anchor || anchor.hasAttribute('download')) return;

      const href = anchor.getAttribute('href');
      // Skip anchor links and empty hrefs
      if (!href || href.startsWith('#')) return;

      // Skip links that open in new window/tab
      if (anchor.target && anchor.target !== '_self') return;

      // Skip same-page links (e.g., just query param changes on same page)
      const targetUrl = new URL(anchor.href, window.location.href);
      if (targetUrl.href === window.location.href) return;

      // Ask for confirmation before navigating
      const confirmLeave = window.confirm(message);
      if (!confirmLeave) {
        event.preventDefault();
        // Stop other handlers from processing this click
        event.stopImmediatePropagation();
      }
    };

    // Use capture phase to intercept before Next.js Link handlers
    document.addEventListener('click', handleDocumentClick, true);
    return () => {
      document.removeEventListener('click', handleDocumentClick, true);
    };
  }, [message]);
}
