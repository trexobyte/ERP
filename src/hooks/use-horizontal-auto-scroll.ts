'use client';

import { useEffect, useRef } from 'react';

interface AutoScrollOptions {
  isDragging: boolean;
  edgeThreshold?: number; // Distance in pixels from edge to trigger auto-scroll (defaults to dynamic 30% width)
  maxSpeed?: number; // Max scroll speed in pixels per frame (~4200px/s at 60fps)
  minSpeed?: number; // Initial scroll speed upon entering edge zone (~1000px/s)
}

/**
 * Ultra-fast, high-performance horizontal auto-scroller for touch devices and desktop drag-and-drop.
 * Provides over 10x faster horizontal travel across columns during drag operations.
 * Temporarily disables CSS scroll-snapping during drag to eliminate browser compositor resistance.
 * Automatically halts immediately when drag terminates.
 */
let globalLastPointer: { clientX: number; clientY: number } | null = null;
if (typeof window !== 'undefined') {
  const updateGlobalPointer = (e: PointerEvent | TouchEvent) => {
    if ('touches' in e && e.touches.length > 0) {
      globalLastPointer = { clientX: e.touches[0].clientX, clientY: e.touches[0].clientY };
    } else if ('clientX' in e) {
      globalLastPointer = { clientX: (e as PointerEvent).clientX, clientY: (e as PointerEvent).clientY };
    }
  };
  window.addEventListener('pointerdown', updateGlobalPointer, { capture: true, passive: true });
  window.addEventListener('touchstart', updateGlobalPointer, { capture: true, passive: true });
  window.addEventListener('pointermove', updateGlobalPointer, { capture: true, passive: true });
  window.addEventListener('touchmove', updateGlobalPointer, { capture: true, passive: true });
}

export function useHorizontalAutoScroll<T extends HTMLElement = HTMLDivElement>({
  isDragging,
  edgeThreshold,
  maxSpeed = 70,
  minSpeed = 16,
}: AutoScrollOptions) {
  const containerRef = useRef<T | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const pointerPosRef = useRef<{ clientX: number; clientY: number } | null>(null);

  useEffect(() => {
    const container = containerRef.current;

    if (!isDragging) {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      pointerPosRef.current = null;
      if (container) {
        container.style.scrollSnapType = '';
        container.style.scrollBehavior = '';
      }
      return;
    }

    // Initialize with last known pointer coordinates so auto-scroll begins immediately without requiring extra movement
    pointerPosRef.current = globalLastPointer;

    // Disable CSS scroll-snapping during drag so programmatic scrolling is 100% free of compositor resistance
    if (container) {
      container.style.scrollSnapType = 'none';
      container.style.scrollBehavior = 'auto';
    }

    const handlePointerMove = (e: PointerEvent | TouchEvent) => {
      if ('touches' in e && e.touches.length > 0) {
        pointerPosRef.current = {
          clientX: e.touches[0].clientX,
          clientY: e.touches[0].clientY,
        };
      } else if ('clientX' in e) {
        pointerPosRef.current = {
          clientX: (e as PointerEvent).clientX,
          clientY: (e as PointerEvent).clientY,
        };
      }
    };

    const handlePointerUp = () => {
      pointerPosRef.current = null;
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (container) {
        container.style.scrollSnapType = '';
        container.style.scrollBehavior = '';
      }
    };

    // Use capture phase to ensure touch coordinates are captured immediately on touch and never dropped
    window.addEventListener('pointerdown', handlePointerMove, { capture: true, passive: true });
    window.addEventListener('touchstart', handlePointerMove, { capture: true, passive: true });
    window.addEventListener('pointermove', handlePointerMove, { capture: true, passive: true });
    window.addEventListener('touchmove', handlePointerMove, { capture: true, passive: true });
    document.addEventListener('touchmove', handlePointerMove, { capture: true, passive: true });
    window.addEventListener('pointerup', handlePointerUp, { capture: true, passive: true });
    window.addEventListener('touchend', handlePointerUp, { capture: true, passive: true });
    window.addEventListener('pointercancel', handlePointerUp, { capture: true, passive: true });
    window.addEventListener('touchcancel', handlePointerUp, { capture: true, passive: true });

    const scrollLoop = () => {
      const el = containerRef.current;
      const pointer = pointerPosRef.current;

      if (el && pointer) {
        const rect = el.getBoundingClientRect();
        const clientX = pointer.clientX;
        const clientY = pointer.clientY;

        // Wide vertical tolerance (+/- 220px) ensures lifted thumbs never accidentally pause horizontal travel
        const inVerticalBounds = clientY >= rect.top - 220 && clientY <= rect.bottom + 220;

        if (inVerticalBounds) {
          const visibleLeft = Math.max(0, rect.left);
          const visibleRight = Math.min(window.innerWidth, rect.right);
          const visibleWidth = Math.max(100, visibleRight - visibleLeft);

          // Wide edge zone: at least 115px or 30-33% of the visible container width
          const zoneWidth = edgeThreshold || Math.min(170, Math.max(115, Math.round(visibleWidth * 0.32)));

          const leftZoneEnd = visibleLeft + zoneWidth;
          const rightZoneStart = visibleRight - zoneWidth;

          if (clientX <= leftZoneEnd && clientX >= visibleLeft - 70) {
            // Approaching left edge
            const distFromInnerEdge = Math.max(0, leftZoneEnd - clientX);
            const intensity = Math.min(1, Math.max(0, distFromInnerEdge / zoneWidth));
            // Power curve: smooth entry ramping up to blistering top speed
            const speedFactor = Math.pow(intensity, 1.25);
            const step = Math.round(minSpeed + (maxSpeed - minSpeed) * speedFactor);
            el.scrollLeft -= step;
          } else if (clientX >= rightZoneStart && clientX <= visibleRight + 70) {
            // Approaching right edge
            const distFromInnerEdge = Math.max(0, clientX - rightZoneStart);
            const intensity = Math.min(1, Math.max(0, distFromInnerEdge / zoneWidth));
            // Power curve: smooth entry ramping up to blistering top speed
            const speedFactor = Math.pow(intensity, 1.25);
            const step = Math.round(minSpeed + (maxSpeed - minSpeed) * speedFactor);
            el.scrollLeft += step;
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(scrollLoop);
    };

    animFrameRef.current = requestAnimationFrame(scrollLoop);

    return () => {
      window.removeEventListener('pointerdown', handlePointerMove, { capture: true });
      window.removeEventListener('touchstart', handlePointerMove, { capture: true });
      window.removeEventListener('pointermove', handlePointerMove, { capture: true });
      window.removeEventListener('touchmove', handlePointerMove, { capture: true });
      document.removeEventListener('touchmove', handlePointerMove, { capture: true });
      window.removeEventListener('pointerup', handlePointerUp, { capture: true });
      window.removeEventListener('touchend', handlePointerUp, { capture: true });
      window.removeEventListener('pointercancel', handlePointerUp, { capture: true });
      window.removeEventListener('touchcancel', handlePointerUp, { capture: true });
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      if (container) {
        container.style.scrollSnapType = '';
        container.style.scrollBehavior = '';
      }
    };
  }, [isDragging, edgeThreshold, maxSpeed, minSpeed]);

  return containerRef;
}
