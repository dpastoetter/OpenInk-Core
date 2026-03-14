import { useEffect, useRef } from 'preact/hooks';

/**
 * Suppresses click events when the pointer or touch has moved more than thresholdPx
 * between pointerdown/touchstart and click. Reduces accidental app launches while
 * scrolling on touch devices (e.g. Kindle).
 */
/**
 * Installs listeners; returns cleanup. Deferred so first paint isn't blocked.
 */
function installTapVsScrollListeners(thresholdPx: number): () => void {
  const state = { startX: 0, startY: 0, moved: false, pointerId: null as number | null, touchActive: false };
  const checkMoved = (clientX: number, clientY: number) => {
    const dx = clientX - state.startX;
    const dy = clientY - state.startY;
    if (Math.hypot(dx, dy) > thresholdPx) state.moved = true;
  };
  const onPointerDown = (e: PointerEvent) => {
    if (e.pointerType === 'touch') return;
    state.startX = e.clientX;
    state.startY = e.clientY;
    state.moved = false;
    state.pointerId = e.pointerId;
  };
  const onPointerMove = (e: PointerEvent) => {
    if (state.pointerId !== null && e.pointerId === state.pointerId) checkMoved(e.clientX, e.clientY);
  };
  const onPointerUp = (e: PointerEvent) => {
    if (e.pointerId === state.pointerId) state.pointerId = null;
  };
  const onTouchStart = (e: TouchEvent) => {
    if (e.changedTouches.length > 0) {
      state.startX = e.changedTouches[0].clientX;
      state.startY = e.changedTouches[0].clientY;
      state.moved = false;
      state.touchActive = true;
    }
  };
  const onTouchMove = (e: TouchEvent) => {
    if (state.touchActive && e.changedTouches.length > 0)
      checkMoved(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  };
  const onTouchEnd = () => {
    state.touchActive = false;
  };
  const onClick = (e: MouseEvent) => {
    if (state.moved) {
      e.preventDefault();
      e.stopPropagation();
    }
    state.moved = false;
  };
  document.addEventListener('pointerdown', onPointerDown, { passive: true });
  document.addEventListener('pointermove', onPointerMove, { passive: true });
  document.addEventListener('pointerup', onPointerUp, { passive: true });
  document.addEventListener('pointercancel', onPointerUp, { passive: true });
  document.addEventListener('touchstart', onTouchStart, { passive: true });
  document.addEventListener('touchmove', onTouchMove, { passive: true });
  document.addEventListener('touchend', onTouchEnd, { passive: true });
  document.addEventListener('touchcancel', onTouchEnd, { passive: true });
  document.addEventListener('click', onClick, true);
  return () => {
    document.removeEventListener('pointerdown', onPointerDown);
    document.removeEventListener('pointermove', onPointerMove);
    document.removeEventListener('pointerup', onPointerUp);
    document.removeEventListener('pointercancel', onPointerUp);
    document.removeEventListener('touchstart', onTouchStart);
    document.removeEventListener('touchmove', onTouchMove);
    document.removeEventListener('touchend', onTouchEnd);
    document.removeEventListener('touchcancel', onTouchEnd);
    document.removeEventListener('click', onClick, true);
  };
}

/** Install tap-vs-scroll only on first user interaction so load is zero-cost. */
function useTapVsScrollThreshold(thresholdPx: number = 24): void {
  const thresholdRef = useRef(thresholdPx);
  thresholdRef.current = thresholdPx;
  useEffect(() => {
    let remove: (() => void) | undefined;
    const onFirstInteraction = () => {
      remove = installTapVsScrollListeners(thresholdRef.current);
      document.removeEventListener('pointerdown', onFirstInteraction, true);
      document.removeEventListener('touchstart', onFirstInteraction, true);
    };
    document.addEventListener('pointerdown', onFirstInteraction, true);
    document.addEventListener('touchstart', onFirstInteraction, { capture: true, passive: true });
    return () => {
      document.removeEventListener('pointerdown', onFirstInteraction, true);
      document.removeEventListener('touchstart', onFirstInteraction, true);
      if (remove) remove();
    };
  }, []);
}
export { useTapVsScrollThreshold };
