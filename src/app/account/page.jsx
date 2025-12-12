'use client';

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import '../i18n'; // Import i18n initialization

import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Meta from '@/components/Meta/index';
import { useGraphQLClient } from '@/hooks/data/index';
import { AccountLayout } from '@/layouts/index';
import { useWorkspace } from '@/providers/workspace';
import { useRouterContext } from '@/providers/router';
import { useTranslation } from "react-i18next";
import {
  GET_ALL_WORKSPACES,
  GET_USER_INVITATIONS,
  ACCEPT_INVITATION,
  DECLINE_INVITATION,
  executeQuery,
  executeMutation
} from '@/graphql/operations';

export default function AccountPage() {
  const { router } = useRouterContext();
  const { setWorkspace, workspace } = useWorkspace();
  const { t } = useTranslation();
  const [isSubmitting, setSubmittingState] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);
  
  // GraphQL client and state
  const graphqlClient = useGraphQLClient();
  const [workspaces, setWorkspaces] = useState([]);
  const [invitations, setInvitations] = useState([]);
  const [isLoading, setIsLoading] = useState(true); // Start true to show loading state

  // Mark component as hydrated
  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Fetch data with GraphQL when component mounts
  useEffect(() => {
    const fetchGraphQLData = async () => {
      if (hasHydrated) {
        setIsLoading(true);
        
        try {
          // Check if we can get a valid token first
          const tokenResponse = await fetch('/api/auth/token');
          if (tokenResponse.ok) {
            const { token } = await tokenResponse.json();
            console.log("Using token:", token ? `${token.substring(0, 15)}...` : 'No token available');
          }
        } catch (error) {
          console.error("Error fetching auth token:", error);
        }
        
        // Fetch workspaces
        try {
          const workspacesResult = await executeQuery(
            graphqlClient, 
            GET_ALL_WORKSPACES
          );
          
          if (workspacesResult.data) {
            setWorkspaces(workspacesResult.data.workspaces || []);
          } else if (workspacesResult.error) {
            console.error("Error fetching workspaces:", workspacesResult.error);
            toast.error(`Failed to load workspaces: ${workspacesResult.error.message}`);
          }
        } catch (error) {
          console.error("GraphQL workspaces query failure:", error);
          toast.error(`GraphQL error: ${error.message}`);
        }
        
        // Fetch invitations
        try {
          const invitationsResult = await executeQuery(
            graphqlClient,
            GET_USER_INVITATIONS
          );

          if (invitationsResult.data) {
            setInvitations(invitationsResult.data.pendingInvitations || []);
          } else if (invitationsResult.error) {
            console.error("Error fetching invitations:", invitationsResult.error);
          }
        } catch (error) {
          console.error("GraphQL invitations query failure:", error);
        }

        setIsLoading(false);
      }
    };
    
    fetchGraphQLData();
  }, [hasHydrated, graphqlClient]);

  // Auto-redirect if only one workspace exists
  useEffect(() => {
    if (!hasHydrated || isLoading) return;
    
    // If exactly one workspace exists, redirect to it
    if (workspaces.length === 1) {
      const singleWorkspace = workspaces[0];
      setWorkspace(singleWorkspace);
      router.push(`/${singleWorkspace.slug}`);
    }
    // If more than one workspace but none selected, select the first one (but don't redirect)
    else if (workspaces.length > 0 && !workspace) {
      setWorkspace(workspaces[0]);
    }
  }, [workspaces, workspace, setWorkspace, hasHydrated, isLoading, router]);

  const accept = async (invitationId) => {
    setSubmittingState(true);

    const result = await executeMutation(
      graphqlClient,
      ACCEPT_INVITATION,
      { invitationId }
    );

    setSubmittingState(false);

    if (result.data?.acceptInvitation) {
      toast.success('Accepted invitation!');

      // Refetch invitations and workspaces
      const [invitationsResult, workspacesResult] = await Promise.all([
        executeQuery(graphqlClient, GET_USER_INVITATIONS),
        executeQuery(graphqlClient, GET_ALL_WORKSPACES)
      ]);

      if (invitationsResult.data) {
        setInvitations(invitationsResult.data.pendingInvitations || []);
      }
      if (workspacesResult.data) {
        setWorkspaces(workspacesResult.data.workspaces || []);
      }
    } else if (result.error) {
      toast.error(result.error.message || 'Failed to accept invitation');
    } else {
      toast.error('Failed to accept invitation');
    }
  };

  const decline = async (invitationId) => {
    setSubmittingState(true);

    const result = await executeMutation(
      graphqlClient,
      DECLINE_INVITATION,
      { invitationId }
    );

    setSubmittingState(false);

    if (result.data?.declineInvitation) {
      toast.success('Declined invitation!');

      // Refetch invitations
      const invitationsResult = await executeQuery(
        graphqlClient,
        GET_USER_INVITATIONS
      );

      if (invitationsResult.data) {
        setInvitations(invitationsResult.data.pendingInvitations || []);
      }
    } else if (result.error) {
      toast.error(result.error.message || 'Failed to decline invitation');
    } else {
      toast.error('Failed to decline invitation');
    }
  };

  const navigate = (workspace) => {
    setWorkspace(workspace);
    router.push(`/${workspace.slug}`);
  };

  return (
    <AccountLayout routerType="app" isAccountPage={true}>
      <Meta title="AI Rank - Dashboard" />
      <Content.Title
        title={t('workspace.dashboard.header.title')}
        subtitle={t("workspace.dashboard.header.description")}
      />
      <Content.Divider />
      <Content.Container>
        <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
          {isLoading ? (
            // Pulsating skeleton cards while loading
            <>
              {[1, 2, 3].map((i) => (
                <Card key={i}>
                  <Card.Body>
                    <div className="animate-pulse">
                      <div className="h-5 bg-zinc-700 rounded w-3/4 mb-4" />
                      <div className="h-4 bg-zinc-700/50 rounded w-1/2" />
                    </div>
                  </Card.Body>
                  <Card.Footer>
                    <div className="h-4 bg-zinc-700/50 rounded w-32 animate-pulse" />
                  </Card.Footer>
                </Card>
              ))}
            </>
          ) : workspaces.length > 0 ? (
            workspaces.map((workspace, index) => (
              <Card key={index}>
                <Card.Body title={workspace.name} />
                <Card.Footer>
                  <button
                    className="text-light"
                    onClick={() => navigate(workspace)}
                  >
                    Select workspace &rarr;
                  </button>
                </Card.Footer>
              </Card>
            ))
          ) : (
            <Card.Empty>{t('workspace.message.createworkspace')}</Card.Empty>
          )}
        </div>
      </Content.Container>
      {invitations.length > 0 && (
        <>
          <Content.Divider thick />
          <Content.Title
            title={t("workspace.dashboard.header.invitations.title")}
            subtitle={t("workspace.dashboard.header.invitations.description")}
          />
          <Content.Divider />
          <Content.Container>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-3">
              {invitations.map((invitation, index) => (
                <Card key={index}>
                  <Card.Body
                    title={invitation.workspaceName}
                    subtitle={`Invited by ${invitation.inviterEmail || 'team member'}`}
                  />
                  <Card.Footer>
                    <div className="flex justify-between w-full">
                      <a
                        href="#"
                        className={`text-zinc-400 hover:text-zinc-200 ${isSubmitting ? 'pointer-events-none opacity-50' : ''}`}
                        onClick={(e) => { e.preventDefault(); decline(invitation._id); }}
                      >
                        Decline
                      </a>
                      <a
                        href="#"
                        className={`text-green-600 hover:text-green-500 font-medium ${isSubmitting ? 'pointer-events-none opacity-50' : ''}`}
                        onClick={(e) => { e.preventDefault(); accept(invitation._id); }}
                      >
                        Accept &rarr;
                      </a>
                    </div>
                  </Card.Footer>
                </Card>
              ))}
            </div>
          </Content.Container>
        </>
      )}
    </AccountLayout>
  );
} 