'use client';

import { useEffect, useRef } from 'react';

interface AutoScrollOptions {
  isDragging: boolean;
  edgeThreshold?: number; // Distance in pixels from container edge to trigger auto-scroll
  maxSpeed?: number; // Max scroll speed in pixels per frame (~1500-1800px/s at 60fps)
}

/**
 * High-performance horizontal auto-scroller for touch devices and desktop drag-and-drop.
 * Automatically scrolls a container horizontally when the dragged item is held near the viewport or container edge.
 * Smoothly scales speed as pointer gets closer to the edge, and immediately halts when dragging ends.
 */
export function useHorizontalAutoScroll<T extends HTMLElement = HTMLDivElement>({
  isDragging,
  edgeThreshold = 75,
  maxSpeed = 28,
}: AutoScrollOptions) {
  const containerRef = useRef<T | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const pointerPosRef = useRef<{ clientX: number; clientY: number } | null>(null);

  useEffect(() => {
    if (!isDragging) {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
      pointerPosRef.current = null;
      return;
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
    };

    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', handlePointerMove, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('touchend', handlePointerUp, { passive: true });
    window.addEventListener('pointercancel', handlePointerUp, { passive: true });

    const scrollLoop = () => {
      const container = containerRef.current;
      const pointer = pointerPosRef.current;

      if (container && pointer) {
        const rect = container.getBoundingClientRect();
        const clientX = pointer.clientX;
        const clientY = pointer.clientY;

        // Ensure pointer is within reasonable vertical bounds of the scrollable container (+/- 80px tolerance)
        const inVerticalBounds = clientY >= rect.top - 80 && clientY <= rect.bottom + 80;

        if (inVerticalBounds) {
          const visibleLeft = Math.max(0, rect.left);
          const visibleRight = Math.min(window.innerWidth, rect.right);

          const leftZoneEnd = visibleLeft + edgeThreshold;
          const rightZoneStart = visibleRight - edgeThreshold;

          if (clientX <= leftZoneEnd && clientX >= visibleLeft - 60) {
            // Approaching left edge
            const distFromInnerEdge = leftZoneEnd - clientX;
            const intensity = Math.min(1, Math.max(0.15, distFromInnerEdge / edgeThreshold));
            const step = Math.max(3, Math.round(maxSpeed * intensity));
            container.scrollLeft -= step;
          } else if (clientX >= rightZoneStart && clientX <= visibleRight + 60) {
            // Approaching right edge
            const distFromInnerEdge = clientX - rightZoneStart;
            const intensity = Math.min(1, Math.max(0.15, distFromInnerEdge / edgeThreshold));
            const step = Math.max(3, Math.round(maxSpeed * intensity));
            container.scrollLeft += step;
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(scrollLoop);
    };

    animFrameRef.current = requestAnimationFrame(scrollLoop);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('touchend', handlePointerUp);
      window.removeEventListener('pointercancel', handlePointerUp);
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
        animFrameRef.current = null;
      }
    };
  }, [isDragging, edgeThreshold, maxSpeed]);

  return containerRef;
}
