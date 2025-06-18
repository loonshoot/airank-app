'use client';

import { useState } from 'react';
import ContentLoader from '@/components/ContentLoader';

export default function DestinationsPage() {
  const [isLoading, setIsLoading] = useState(false);
  
  // This simulates loading data for the destinations
  const handleAddDestination = () => {
    setIsLoading(true);
    // Simulate API call
    setTimeout(() => {
      setIsLoading(false);
    }, 2000);
  };
  
  return (
    // The main container doesn't need any special classes, ContentLoader handles that
    <div className="flex flex-col h-full px-5 pb-5 [&>*+*]:pt-5 overflow-y-auto md:p-10 md:w-3/4">
      <div className="flex flex-row items-center justify-between">
        <div></div>
      </div>
      
      <div>
        <h1 className="text-3xl font-bold md:text-4xl text-pink-600">Destinations</h1>
        <h3 className="text-light mt-4">Send your data to external systems</h3>
      </div>
      
      <hr className="border-none" />
      
      {/* Wrap your content with the ContentLoader */}
      <ContentLoader isLoading={isLoading} loadingSource="destinations">
        <div className="flex flex-col pb-10 space-y-5">
          <div className="flex flex-col justify-between border dark:border-gray-600">
            <div className="flex flex-col p-5 space-y-3 overflow-auto">
              <h2 className="text-2xl font-bold">Destinations</h2>
              <div className="flex flex-col">
                <p className="">No destinations found. Add your first destination to start exporting data.</p>
              </div>
            </div>
            
            <div className="flex flex-row items-center justify-between px-5 py-3 space-x-5 bg-gray-100 border-t-b dark:border-t-gray-600 dark:bg-dark">
              <div className="group h-8 relative mt-5 mb-5 w-40">
                <button 
                  className="flex items-center h-8 absolute bg-pink-600 w-40"
                  onClick={handleAddDestination}
                >
                  <div className="flex items-center w-full text-center text-slate-900 text-light text-xs font-normal font-mono">
                    <p className="flex items-center justify-center text-center space-x-2 w-full pt-1 group-hover:pt-0 text-light">
                      Add Destination
                    </p>
                  </div>
                </button>
                <div className="flex h-8 top-1 left-1 group-hover:top-0 group-hover:left-0 absolute border-solid border-2 border-light w-40"></div>
              </div>
            </div>
          </div>
        </div>
      </ContentLoader>
    </div>
  );
} 