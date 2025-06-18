'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';
import Loader from '@/components/Loader';

// Create context for loading state
const LoadingContext = createContext({
  isLoading: false,
  setLoading: () => {},
  addLoadingSource: () => {},
  removeLoadingSource: () => {},
  OverlayLoader: () => null,
  setGlobalOverlay: () => {},
});

// Hook to use loading context
export const useLoading = () => useContext(LoadingContext);

export function LoadingProvider({ children }) {
  const [isLoading, setIsLoadingState] = useState(false);
  const [loadingSources, setLoadingSources] = useState(new Set());
  const [showGlobalOverlay, setGlobalOverlay] = useState(false);
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Set loading state based on sources
  const setLoading = (isLoading) => {
    if (isLoading) {
      setLoadingSources(prev => {
        const newSet = new Set(prev);
        newSet.add('manual');
        return newSet;
      });
    } else {
      setLoadingSources(prev => {
        const newSet = new Set(prev);
        newSet.delete('manual');
        return newSet;
      });
    }
  };

  // Add a new loading source
  const addLoadingSource = (source) => {
    setLoadingSources(prev => {
      const newSet = new Set(prev);
      newSet.add(source);
      return newSet;
    });
  };

  // Remove a loading source
  const removeLoadingSource = (source) => {
    setLoadingSources(prev => {
      const newSet = new Set(prev);
      newSet.delete(source);
      return newSet;
    });
  };

  // Track navigation changes to show/hide loader
  useEffect(() => {
    addLoadingSource('navigation');
    
    // Simulating the time it takes for the page to load
    const timer = setTimeout(() => {
      removeLoadingSource('navigation');
    }, 500);
    
    return () => {
      clearTimeout(timer);
      removeLoadingSource('navigation');
    };
  }, [pathname, searchParams]);

  // Update the actual loading state when sources change
  useEffect(() => {
    setIsLoadingState(loadingSources.size > 0);
  }, [loadingSources]);

  // Component for targeted loading overlay
  const OverlayLoader = ({ className = "", containerClass = "" }) => {
    if (!isLoading) return null;
    
    return (
      <div className={`absolute inset-0 flex items-center justify-center bg-dark bg-opacity-70 z-50 ${className}`}>
        <div className={containerClass}>
          <Loader size="lg" className="mx-auto" />
          <p className="text-center text-light mt-4">Loading...</p>
        </div>
      </div>
    );
  };

  return (
    <LoadingContext.Provider value={{ 
      isLoading, 
      setLoading, 
      addLoadingSource, 
      removeLoadingSource, 
      OverlayLoader,
      setGlobalOverlay
    }}>
      {isLoading && showGlobalOverlay && (
        <div className="fixed inset-0 flex items-center justify-center bg-dark bg-opacity-70 z-50">
          <div>
            <Loader size="lg" className="mx-auto" />
            <p className="text-center text-light mt-4">Loading...</p>
          </div>
        </div>
      )}
      {children}
    </LoadingContext.Provider>
  );
}

export default LoadingProvider; 