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

const Actions = ({ routerType }) => {
  const { t } = useTranslation();
  const { data, workspaces, isLoading } = useWorkspaces();
  const { workspace, setWorkspace } = useWorkspace();
  const { router } = useRouterContext();
  const [isSubmitting, setSubmittingState] = useState(false);
  const [name, setName] = useState('');
  const [showModal, setModalState] = useState(false);
  const validName = name.length > 0 && name.length <= 16;
  const [isAccountPage, setIsAccountPage] = useState(false);
  const graphqlClient = useGraphQLClient();
  // Use a ref to track if we've already set the workspace
  const hasSetWorkspaceRef = useRef(false);
  const previousSlugRef = useRef(null);

  // Check if we're on the account page
  useEffect(() => {
    if (!isBrowser) return;
    
    const pathSegments = window.location.pathname.split('/').filter(segment => segment !== '');
    const isOnAccountPage = pathSegments[0] === 'account' || pathSegments.length === 0;
    setIsAccountPage(isOnAccountPage);
  }, []);

  // For non-account pages, find workspace from URL path - with safeguards against infinite renders
  useEffect(() => {
    if (!isBrowser || !workspaces || workspaces.length === 0) return;
    
    const pathSegments = window.location.pathname.split('/').filter(segment => segment !== '');
    const firstFolder = pathSegments[0];
    
    // Skip for account page - don't auto-select
    if (firstFolder === 'account' || pathSegments.length === 0) {
      return;
    }
    
    // Don't set workspace if it's the same slug as before to prevent unnecessary re-renders
    if (firstFolder === previousSlugRef.current) {
      return;
    }
    
    // For non-account pages, set workspace based on URL slug
    if (firstFolder) {
      const matchingWorkspace = workspaces.find(ws => ws.slug === firstFolder);
      if (matchingWorkspace) {
        // Only update if the workspace actually changed
        if (!workspace || workspace.slug !== matchingWorkspace.slug) {
          console.log("Actions setting workspace:", matchingWorkspace.name);
          setWorkspace(matchingWorkspace);
          previousSlugRef.current = firstFolder;
        }
      }
    }
  }, [workspaces, setWorkspace, workspace]);

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
    if (workspace && workspace.slug) {
      router.push(`/${workspace.slug}`);
    }
  };

  const toggleModal = () => setModalState(!showModal);

  // Only render loading state if no workspaces have been loaded previously
  if (isLoading && !workspaces?.length) {
    return null; // Return nothing while initial loading
  }

  return (
    <div className="flex flex-col items-stretch justify-center space-y-3">
      {/* Create workspace button - always show on account page or when no workspaces exist */}
      {(isAccountPage || !workspaces || workspaces.length === 0) && (
        <Button
          background="Pink"
          border="Dark"
          width="Full"
          onClick={toggleModal}
        >
          <PlusIcon className="w-5 h-5 text-light" aria-hidden="true" />
          <span>{t('workspace.action.button.label')}</span>
        </Button>
      )}
      
      {/* Create workspace modal */}
      <Modal show={showModal} title={t("workspace.action.create.title")} toggle={toggleModal}>
        <div className="space-y-0 text-sm text-gray-600">
          <p>
            {t("workspace.action.create.description.lineOne")}
          </p>
          <p>{t("workspace.action.create.description.lineTwo")}</p>
        </div>
        <div className="space-y-1">
          <h3 className="text-xl font-bold">{t("workspace.action.name.label")}</h3>
          <p className="text-sm text-light">
            {t("workspace.suggesion.label")}
          </p>
          <input
            className="w-full px-3 py-2 bg-light border-2 border-dark"
            disabled={isSubmitting}
            onChange={handleNameChange}
            type="text"
            value={name}
          />
        </div>
        <div className="flex flex-col items-stretch">
          <Button
            background="Pink"
            border="Dark"
            width="Full"
            disabled={!validName || isSubmitting}
            onClick={createWorkspace}
          >
            <span>{t('workspace.action.button.label')}</span>
          </Button>
        </div>
      </Modal>
      
      {/* Show workspace selector if workspaces exist and not on account page */}
      {workspaces && workspaces.length > 0 && !isAccountPage && (
        <Listbox value={workspace} onChange={handleWorkspaceChange}>
          <div className="relative">
            <Listbox.Button className="relative w-full py-2 pl-3 pr-10 text-left bg-light-lg border-2 border-dark cursor-default">
              <span className="block text-dark truncate">
                {!workspaces?.length
                  ? ""
                  : !workspace
                    ? t("workspace.action.label.select")
                    : workspace?.name || t("workspace.action.label.select")}
              </span>
              <span className="absolute inset-y-0 right-0 flex items-center pr-2 pointer-events-none">
                <ChevronUpDownIcon
                  className="w-5 h-5 text-dark"
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
              <Listbox.Options className="absolute w-full py-1 mt-1 overflow-auto text-base bg-light-md max-h-60 bg-yellow-400">
                {workspaces.map((ws, index) => (
                  <Listbox.Option
                    key={index}
                    className={({ active }) =>
                      `${active ? 'text-pink-600 bg-blue-200' : 'text-dark'}
                        border-2 border-dark cursor-pointer select-none relative py-2 pl-4 pr-4`
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
                              active ? 'text-blue-600' : 'text-blue-600'
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
                    `${active ? 'text-pink-600 bg-blue-200' : 'text-light'}
                      border-2 border-dark cursor-pointer bg-dark select-none relative py-4 pl-4`
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

