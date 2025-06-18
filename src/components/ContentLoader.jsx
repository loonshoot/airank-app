'use client';

import { useLoading } from '@/providers/loading';
import { useEffect, useState } from 'react';

/**
 * ContentLoader wraps a content area and adds a loading overlay when needed
 * 
 * @param {Object} props
 * @param {React.ReactNode} props.children - Content to display
 * @param {string} props.className - Additional classes for the container
 * @param {boolean} props.isLoading - Optional manual loading state
 * @param {string} props.loadingSource - Source identifier for loading state
 * @returns {JSX.Element}
 */
export default function ContentLoader({ 
  children, 
  className = "", 
  isLoading = false,
  loadingSource = "content" 
}) {
  const { OverlayLoader, addLoadingSource, removeLoadingSource } = useLoading();
  const [localLoading, setLocalLoading] = useState(isLoading);
  
  // Connect to the global loading state when manually controlled
  useEffect(() => {
    setLocalLoading(isLoading);
    
    if (isLoading) {
      addLoadingSource(loadingSource);
    } else {
      removeLoadingSource(loadingSource);
    }
    
    return () => removeLoadingSource(loadingSource);
  }, [isLoading, addLoadingSource, removeLoadingSource, loadingSource]);
  
  return (
    <div className={`relative ${className}`}>
      {localLoading && <OverlayLoader />}
      {children}
    </div>
  );
} 