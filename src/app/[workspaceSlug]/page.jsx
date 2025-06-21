'use client';

import { useEffect, useState, useCallback, useRef, use } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useWorkspace } from '@/providers/workspace';
import { useLoading } from '@/providers/loading';
import { useWorkspaces } from '@/hooks/data';
import { Toaster } from 'react-hot-toast';
import Header from '@/components/Header';
import Sidebar from '@/components/Sidebar';
import Loader from '@/components/Loader';
import menu from '@/config/menu';
import { useTranslation } from 'react-i18next';

export default function WorkspacePage({ params }) {
  const resolvedParams = use(params);
  const { workspaceSlug } = resolvedParams || {};
  const router = useRouter();
  const { status, data: session } = useSession();
  const { workspace, setWorkspace } = useWorkspace();
  const { workspaces, isLoading: workspacesLoading, isError, refetch } = useWorkspaces();
  const [isLoading, setIsLoading] = useState(true);
  const { setLoading } = useLoading();
  const { t } = useTranslation();
  const hasSetWorkspaceRef = useRef(false);
  
  // Handle manual refetch
  const handleRefetch = useCallback(async () => {
    console.log("Manually refetching workspaces...");
    await refetch();
  }, [refetch]);

  // Handle redirect if not authenticated
  useEffect(() => {
    if (status === 'unauthenticated') {
      console.log("User is not authenticated, redirecting to login");
      router.push('/auth/login');
    }
  }, [status, router]);

  // Set workspace only once when data is available
  useEffect(() => {
    // Skip if conditions aren't right or we've already set the workspace
    if (status !== 'authenticated' || !workspaces || !workspaceSlug || hasSetWorkspaceRef.current) {
      return;
    }

    const matchingWorkspace = workspaces.find(ws => ws.slug === workspaceSlug);
    
    if (matchingWorkspace) {
      console.log("Setting workspace once:", matchingWorkspace.name);
      setWorkspace(matchingWorkspace);
      setIsLoading(false);
      setLoading(false);
      hasSetWorkspaceRef.current = true;
    } else if (!workspacesLoading) {
      // If workspaces have loaded and no matching workspace found
      console.log("No matching workspace found, redirecting to account page");
      router.push('/account');
    }
  }, [workspaces, workspaceSlug, workspacesLoading, status, setWorkspace, setLoading, router]);

  if (status === 'loading' || isLoading) {
    return (
      <main className="flex flex-col w-screen h-screen text-light dark:text-light md:flex-row">
        <div className="flex items-center justify-center w-full h-screen">
          <div className="text-center">
            <Loader size="xl" />
            <p className="mt-4 text-light">Loading workspace...</p>
          </div>
        </div>
      </main>
    );
  }
  
  if (isError) {
    return (
      <main className="flex flex-col w-screen h-screen text-light dark:text-light md:flex-row">
        <div className="flex items-center justify-center w-full h-screen">
          <div className="text-center">
            <div className="text-red-500 text-xl mb-4">Error loading workspaces</div>
            <p className="mt-2 mb-4 text-light">{isError.message || "Unknown error"}</p>
            <button 
              onClick={handleRefetch}
              className="px-4 py-2 bg-light text-dark border-2 border-dark hover:bg-light-lg"
            >
              Try Again
            </button>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="flex flex-col w-screen h-screen text-light dark:text-light md:flex-row">
      <Sidebar menu={menu(workspace?.slug)} routerType="app" />
      <div className="flex-1 overflow-auto">
        <Header routerType="app" />
        <div className="container px-6 mx-auto max-w-7xl">
          <div className="py-6">
            <h1 className="text-3xl font-bold">{workspace?.name || workspaceSlug}</h1>
            <p className="mt-2 text-light">Workspace Dashboard</p>
          </div>
          <hr className="border-t border-dark" />
          <div className="py-6">
            <div className="flex flex-col items-center w-full p-6">
              <h2 className="text-xl font-semibold mb-4">Welcome to your workspace</h2>
              <div className="flex space-x-4 mt-6">
                <button 
                  onClick={() => router.push(`/${workspaceSlug}/dashboard`)}
                  className="px-4 py-2 bg-light text-dark border-2 border-dark hover:bg-light-lg"
                >
                  Go to Dashboard
                </button>
              </div>
              
              {workspacesLoading && (
                <div className="mt-12">
                  <Loader size="lg" className="mx-auto" />
                  <p className="text-center text-light mt-4">Loading data...</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <Toaster position="bottom-left" toastOptions={{ duration: 10000 }} />
    </main>
  );
} 