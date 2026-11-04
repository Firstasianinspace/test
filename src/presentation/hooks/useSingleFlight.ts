import { useCallback, useRef } from 'react';

/**
 * Synchronous guard against double submission.
 *
 * React Query publishes `isPending` on a later tick, so two very fast clicks can both start a
 * request before the button is disabled. `once(start)` ignores calls while one is in flight;
 * `start` must call `done` when the request settles.
 */
export function useSingleFlight() {
  const busy = useRef(false);
  return useCallback((start: (done: () => void) => void) => {
    if (busy.current) return;
    busy.current = true;
    start(() => {
      busy.current = false;
    });
  }, []);
}
