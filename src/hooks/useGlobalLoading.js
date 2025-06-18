'use client';

import { useEffect, useRef } from 'react';
import { useLoading } from '@/providers/loading';

/**
 * Hook to connect data loading states to the global loading indicator
 * @param {boolean} isLoading - The loading state to track
 * @param {string} name - Optional name for debugging
 */
export default function useGlobalLoading(isLoading, name = 'unnamed') {
  const { addLoadingSource, removeLoadingSource } = useLoading();
  const previousLoadingState = useRef(null);
  
  useEffect(() => {
    // Skip if loading state hasn't changed since last time
    if (previousLoadingState.current === isLoading) {
      return;
    }

    // Update the ref
    previousLoadingState.current = isLoading;
    
    // When this component/hook starts loading, tell the global loading provider
    if (isLoading) {
      console.debug(`[Loading] ${name} started loading`);
      addLoadingSource(name);
    } else {
      console.debug(`[Loading] ${name} finished loading`);
      // Add a small delay to avoid flashing when switching between fast-loading screens
      const timer = setTimeout(() => {
        removeLoadingSource(name);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [isLoading, addLoadingSource, removeLoadingSource, name]);
  
  return null;
} 