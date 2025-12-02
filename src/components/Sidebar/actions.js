import { Fragment, useState, useEffect, useRef } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import {
  CheckIcon,
  ChevronUpDownIcon,
  PlusIcon,
} from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';

import Button from '@/components/Button/index';
import Modal from '@/components/Modal/index';
import { useWorkspaces, useGraphQLClient } from '@/hooks/data/index';
import api from '@/lib/common/api';
import { useWorkspace } from '@/providers/workspace';
import { useTranslation } from "react-i18next";
import { useRouterContext } from '@/providers/router';
import { CREATE_WORKSPACE, executeMutation } from '@/graphql/operations';

// Check if we're in a browser environment
const isBrowser = typeof window !== 'undefined';

const Actions = ({ routerType, isAccountPage = false }) => {
  const { t } = useTranslation();

  // Workspaces hook - data used on non-account pages for selector
  const { data, workspaces, isLoading } = useWorkspaces();
  const { workspace, setWorkspace } = useWorkspace();
  const { router } = useRouterContext();
  const [isSubmitting, setSubmittingState] = useState(false);
  const [name, setName] = useState('');
  const [showModal, setModalState] = useState(false);
  const validName = name.length > 0 && name.length <= 16;
  const graphqlClient = useGraphQLClient();
  // Use a ref to track if we've already set the workspace
  const hasSetWorkspaceRef = useRef(false);
  const previousSlugRef = useRef(null);

  // For non-account pages, find workspace from URL path - with safeguards against infinite renders
  useEffect(() => {
    // Skip entirely for account pages
    if (isAccountPage) return;
    if (!isBrowser || !workspaces || workspaces.length === 0) return;

    const pathSegments = window.location.pathname.split('/').filter(segment => segment !== '');
    const firstFolder = pathSegments[0];

    // Don't set workspace if it's the same slug as before to prevent unnecessary re-renders
    if (firstFolder === previousSlugRef.current) {
      return;
    }

    // Set workspace based on URL slug
    if (firstFolder) {
      const matchingWorkspace = workspaces.find(ws => ws.slug === firstFolder);
      if (matchingWorkspace) {
        // Only update if the workspace actually changed
        if (!workspace || workspace.slug !== matchingWorkspace.slug) {
          setWorkspace(matchingWorkspace);
          previousSlugRef.current = firstFolder;
        }
      }
    }
  }, [workspaces, setWorkspace, workspace, isAccountPage]);

  const createWorkspace = async (event) => {
    event.preventDefault();
    setSubmittingState(true);
    
    try {
      // Use GraphQL mutation
      const result = await executeMutation(
        graphqlClient,
        CREATE_WORKSPACE,
        { name }
      );
      
      setSubmittingState(false);
      
      if (result.data?.createWorkspace) {
        toggleModal();
        setName('');
        toast.success(t("workspace.action.button.toast.success"));
        
        const newWorkspace = result.data.createWorkspace;
        setWorkspace(newWorkspace);
        router.push(`/${newWorkspace.slug}`);
      } else if (result.error) {
        const errorMessage = result.error.message || 'Failed to create workspace';
        toast.error(errorMessage);
      }
    } catch (error) {
      setSubmittingState(false);
      console.error('Error creating workspace:', error);
      toast.error('Failed to create workspace');
    }
  };

  const handleNameChange = (event) => setName(event.target.value);

  const handleWorkspaceChange = (workspace) => {
    setWorkspace(workspace);

    // Always redirect to the workspace page when selection changes
    if (workspace && workspace.slug && router) {
      router.push(`/${workspace.slug}`);
    }
  };

  const toggleModal = () => setModalState(!showModal);

  // Show pulsing skeleton while loading (no cached data)
  const showSkeleton = isLoading && !workspaces?.length && !isAccountPage;

  return (
    <div className="flex flex-col items-stretch justify-center space-y-3">
      {/* Skeleton loader - same dimensions as select box */}
      {showSkeleton && (
        <div className="relative w-full py-2 pl-3 pr-10 bg-zinc-800/50 border border-zinc-800/50 rounded-lg animate-pulse">
          <div className="h-5 bg-zinc-700 rounded w-24" />
          <span className="absolute inset-y-0 right-0 flex items-center pr-2">
            <ChevronUpDownIcon className="w-5 h-5 text-zinc-600" aria-hidden="true" />
          </span>
        </div>
      )}

      {/* Create workspace button - always show on account page or when no workspaces exist */}
      {!showSkeleton && (isAccountPage || !workspaces || workspaces.length === 0) && (
        <Button
          background="Pink"
          border="Dark"
          width="Full"
          onClick={toggleModal}
        >
          <PlusIcon className="w-5 h-5" aria-hidden="true" />
          <span>{t('workspace.action.button.label')}</span>
        </Button>
      )}

      {/* Create workspace modal */}
      <Modal show={showModal} title={t("workspace.action.create.title")} toggle={toggleModal}>
        <div className="space-y-2 text-sm text-gray-400">
          <p>
            {t("workspace.action.create.description.lineOne")}
          </p>
          <p>{t("workspace.action.create.description.lineTwo")}</p>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-medium text-white mb-2">
              {t("workspace.action.name.label")}
            </label>
            <p className="text-xs text-gray-400 mb-2">
              {t("workspace.suggesion.label")}
            </p>
            <input
              className="w-full px-4 py-2 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-green-600 focus:border-transparent"
              disabled={isSubmitting}
              onChange={handleNameChange}
              type="text"
              value={name}
              placeholder="Enter workspace name"
            />
          </div>
        </div>
        <div className="flex flex-col items-stretch pt-2">
          <Button
            background="Green"
            border="Light"
            width="Full"
            disabled={!validName || isSubmitting}
            onClick={createWorkspace}
          >
            <span>{isSubmitting ? 'Creating...' : t('workspace.action.button.label')}</span>
          </Button>
        </div>
      </Modal>
      
      {/* Show workspace selector if workspaces exist and not on account page */}
      {!showSkeleton && workspaces && workspaces.length > 0 && !isAccountPage && (
        <Listbox value={workspace} onChange={handleWorkspaceChange}>
          <div className="relative">
            <Listbox.Button className="relative w-full py-2 pl-3 pr-10 text-left bg-[#0a0a0a] border border-zinc-800/50 rounded-lg cursor-default hover:border-green-600/30 transition-colors">
              <span className="block text-white truncate">
                {!workspaces?.length
                  ? ""
                  : !workspace
                    ? t("workspace.action.label.select")
                    : workspace?.name || t("workspace.action.label.select")}
              </span>
              <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronUpDownIcon
                  className="w-5 h-5 text-white"
                  aria-hidden="true"
                />
              </span>
            </Listbox.Button>
            
            <Transition
              as={Fragment}
              leave="transition ease-in duration-100"
              leaveFrom="opacity-100"
              leaveTo="opacity-0"
            >
              <Listbox.Options className="absolute w-full py-1 mt-1 overflow-auto text-base bg-[#0a0a0a] border border-zinc-800/50 shadow-lg max-h-60 rounded-lg">
                {workspaces.map((ws, index) => (
                  <Listbox.Option
                    key={index}
                    className={({ active }) =>
                      `${active ? 'bg-zinc-700 text-white' : 'text-white'}
                        cursor-pointer select-none relative py-2 pl-4 pr-4 hover:bg-zinc-700`
                    }
                    value={ws}
                  >
                    {({ selected, active }) => (
                      <>
                        <span
                          className={`${
                            selected ? 'font-bold' : 'font-normal'
                          } block truncate`}
                        >
                          {ws.name}
                        </span>
                        {selected ? (
                          <span
                            className={`${
                              active ? 'text-green-600' : 'text-green-600'
                            } absolute inset-y-0 right-2 flex items-center pl-3`}
                          >
                            <CheckIcon className="w-5 h-5" aria-hidden="true" />
                          </span>
                        ) : null}
                      </>
                    )}
                  </Listbox.Option>
                ))}

                <Listbox.Option
                  onClick={toggleModal}
                  className={({ active }) =>
                    `${active ? 'bg-green-600 text-black' : 'text-white bg-zinc-800'}
                      cursor-pointer select-none relative py-3 pl-4 pr-4 border-t border-zinc-800/50 hover:bg-green-600 hover:text-black`
                  }
                  value={workspace}
                >
                  {({ selected, active }) => (
                    <>
                      <span
                        className={`${
                          selected ? 'font-bold' : 'font-normal'
                        } block truncate`}
                      >
                        {t("workspace.action.button.label")}
                      </span>
                    </>
                  )}
                </Listbox.Option>
              </Listbox.Options>
            </Transition>
          </div>
        </Listbox>
      )}
    </div>
  );
};

export default Actions;

