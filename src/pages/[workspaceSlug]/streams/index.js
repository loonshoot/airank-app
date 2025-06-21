import { useEffect, useState } from 'react';
import Meta from '@/components/Meta/index';
import { AccountLayout } from '@/layouts/index';
import { useTranslation } from "react-i18next";
import { getSession } from 'next-auth/react';
import { getToken } from 'next-auth/jwt';
import { getWorkspace } from '@/prisma/services/workspace';
import api from '@/lib/common/api';
import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Content from '@/components/Content/index';
import Modal from '@/components/Modal/index';
import { useQuery, gql } from '@apollo/client';
import { initializeApollo, addApolloState } from "@/lib/client/apollo";
import { useRouter } from 'next/router';

const sourcesQuery = gql`
query Sources($workspaceSlug: String!) {
  sources(workspaceSlug: $workspaceSlug) {
    name
    _id
    sourceType
    whitelistedIp
  }
}
`;

const Workspace = ({ workspace, sources }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newSourceName, setNewSourceName] = useState('');
  const [newSourceType, setNewSourceType] = useState("API");
  const [newMatchingField, setNewMatchingField] = useState('');
  const [showNameWarning, setShowNameWarning] = useState(false);
  const [showMatchingFieldWarning, setShowMatchingFieldWarning] = useState(false);
  const [ipListValue, setIpListValue] = useState('');
  const [isIpListValid, setIsIpListValid] = useState(true);
  const [deleteSourceName, setDeleteSourceName] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [selectedSourceName, setSelectedSourceName] = useState('');
  const [deleteSourceId, setDeleteSourceId] = useState(null);
  const [newDatalakeCollection, setNewDatalakeCollection] = useState('');
  const [showDatalakeCollectionWarning, setShowDatalakeCollectionWarning] = useState(false);
  const router = useRouter(); // Get the router instance

  const handleValidateDatalakeCollection = (e) => {
    const value = e.target.value;
    setNewDatalakeCollection(value);
    setShowDatalakeCollectionWarning(value.trim() === '');
  };

  const handleDelete = async () => {
    if (confirmation.toLowerCase() !== deleteSourceName.toLowerCase()) {
      return;
    }
    confirmDeleteSource();
  };

  const isValidIPList = (value) => {
    const ips = value.split(',').map(ip => ip.trim());
    return ips.every(ip => {
      const ipParts = ip.split('.');
      return ipParts.length === 4 && ipParts.every(part => {
        const num = parseInt(part, 10);
        return !isNaN(num) && num >= 0 && num <= 255;
      });
    });
  };

  const handleIPListChange = (e) => {
    const value = e.target.value;
    setIpListValue(value);
    setIsIpListValid(!value || isValidIPList(value));
  };

  const handleSourceTypeChange = (e) => {
    setNewSourceType(e.target.value);
  };

  const handleValidateName = (e) => {
    const value = e.target.value;
    setNewSourceName(value);
    setShowNameWarning(value.trim() === '');
  };

  const handleValidateMatchingField = (e) => {
    const value = e.target.value;
    setNewMatchingField(value);
    setShowMatchingFieldWarning(value.trim() === '');
  };

  const toggleModal = () => setShowModal(!showModal);

  const handleAddSource = async () => {
    if (!isIpListValid || !newSourceName || !newMatchingField || !newDatalakeCollection) {
      return;
    }
    try {
      setLoading(true);
      const response = await api(`/api/workspace/${encodeURI(workspace.slug)}/sources`, {
        body: {
          name: newSourceName,
          whitelistedIp: ipListValue.split(',').map(ip => ip.trim()),
          sourceType: newSourceType,
          datalakeCollection: newDatalakeCollection,
          matchingField: newMatchingField
        },
        method: 'POST'
      });
      if (response.status === 200 && response.success) {
        // Update sources here (fetch from server or trigger a re-render)
        // You can use a state variable to update the sources array
        // ...
        toggleModal();
        setNewDatalakeCollection(''); // Reset collection.
        setNewMatchingField(''); // Reset matching field.
        setNewSourceName(''); // Reset matching field.
        setIpListValue(''); // Reset matching field.
      } else {
        console.error('Error adding source:', response);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const confirmDeleteSource = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/workspace/${encodeURI(workspace.slug)}/sources?id=${deleteSourceId}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      if (response.ok) {
        // Update sources here (fetch from server or trigger a re-render)
        // ...
      } else {
        const errorData = await response.json();
        console.error('Error deleting source:', errorData);
      }
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
      setShowDeleteModal(false);
    }
  };

  if (!workspace) {
    return <div>Loading...</div>;
  }

  return (
    <AccountLayout>
      <Meta title={`AI Rank - ${workspace.name} | ${t("workspace.dashboard.header.meta")}`} />
      <Content.Title
        title={t("sources.title")}
        subtitle={t("sources.subtitle")}
      />
      <Content.Divider />
      <Content.Container>
        <Card>
          <Card.Body title={t("sources.list.title")}>
            {sources && sources.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("sources.table.sourcename")}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("sources.table.type")}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("sources.table.sourceid")}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("sources.table.whitelistedips")}
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t("sources.table.actions")}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sources.map((source, index) => (
                      <tr key={index}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <a href={`/${encodeURI(workspace.slug)}/sources/${encodeURI(source._id)}`} className="text-sm font-medium text-gray-900 underline"> 
                            {source.name}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <a href={`/${encodeURI(workspace.slug)}/sources/${encodeURI(source._id)}`} className="text-sm font-medium text-gray-900"> 
                            {source.sourceType}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <a href={`/${encodeURI(workspace.slug)}/sources/${encodeURI(source._id)}`} className="text-sm font-medium text-gray-900"> 
                            {source._id}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <a href={`/${encodeURI(workspace.slug)}/sources/${encodeURI(source._id)}`} className="text-sm font-medium text-gray-900">
                            {source.whitelistedIp.join(', ')}
                          </a>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Button
                            background="Pink"
                            border="Light"
                            onClick={() => {
                              setShowDeleteModal(true);
                              setDeleteSourceName(source.name);
                              setDeleteSourceId(source._id);
                            }}
                          >
                            {t("sources.table.actions.delete")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="">{t("sources.empty")}</p>
            )}
          </Card.Body>
          <Card.Footer>
            {/* Add Source Button (Route Change) */}
            <Button
              background="Pink"
              border="Light"
              disabled={loading}
              onClick={() => router.push(`/${encodeURI(workspace.slug)}/sources/add`)} // Route change
            >
              {t("sources.list.action.addsources")}
            </Button>

            {/* Add Source Modal Button */}
            <Button
              background="Pink"
              border="Light"
              disabled={loading}
              onClick={toggleModal}
            >
              {t("sources.list.action.addwebhook")}
            </Button>
          </Card.Footer>
        </Card>
      </Content.Container>
      <Modal show={showModal} title={t("sources.modal.addsource.title")} toggle={toggleModal}>
        <div className="space-y-0 text-sm text-gray-600">
          <p>
            {t("sources.modal.addsource.description.lineOne")}
          </p>
        </div>
        <div className="space-y-6">
          <div className="space-y-2">
            <p className="text-md text-dark">
              {t("sources.modal.addsource.field.name")}
            </p>
            <input
              className={`w-full px-3 py-2 bg-light border-2 border-dark`}
              disabled={isSubmitting}
              type="text"
              value={newSourceName}
              onChange={handleValidateName}
            />
            {showNameWarning && (
              <p className="text-sm text-red-500">
                {t("sources.modal.addsource.field.name.warning")}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-md text-dark">
              {t("sources.modal.addsource.field.type")}
            </p>
            <select
              className="w-full px-3 py-2 bg-light border-2 border-dark"
              disabled={isSubmitting}
              value={newSourceType}
              onChange={handleSourceTypeChange}
            >
              <option value="API">API/Webhook</option>
            </select>
          </div>
          <div className="space-y-2">
            <p className="text-md text-dark">{t("sources.modal.addsource.field.datalakecollection")}</p>
            <p className="text-sm text-dark">
              {t("sources.modal.addsource.field.datalakecollection.help")}
            </p>
            <input
              className={`w-full px-3 py-2 bg-light border-2 ${showDatalakeCollectionWarning ? 'border-red-500' : 'border-dark'}`}
              disabled={isSubmitting}
              type="text"
              value={newDatalakeCollection}
              onChange={handleValidateDatalakeCollection}
            />
            {showDatalakeCollectionWarning && (
              <p className="text-sm text-red-500">
                {t("sources.modal.addsource.field.name.warning")}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-md text-dark">
              {t("sources.modal.addsource.field.matchingfield")}
            </p>
            <p className="text-sm text-dark">
              {t("sources.modal.addsource.field.matchingfield.help")}
            </p>
            <input
              className={`w-full px-3 py-2 bg-light border-2 ${showMatchingFieldWarning ? 'border-red-500' : 'border-dark'}`}
              disabled={isSubmitting}
              type="text"
              value={newMatchingField}
              onChange={handleValidateMatchingField}
            />
            {showMatchingFieldWarning && (
              <p className="text-sm text-red-500">
                {t("sources.modal.addsource.field.matchingfield.warning")}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <p className="text-md text-dark">
              {t("sources.modal.addsource.field.whitelist")}
            </p>
            <p className="text-sm text-dark">
              {t("sources.modal.addsource.field.whitelist.help")}
            </p>
            <input
              className={`w-full px-3 py-2 bg-light border-2 ${!isIpListValid ? 'border-red-500' : 'border-dark'}`}
              disabled={isSubmitting}
              placeholder="123.123.123.1,123.123.123.2"
              type="text"
              value={ipListValue}
              onChange={handleIPListChange}
            />
            {!isIpListValid && (
              <p className="text-sm text-red-500">
                {t("sources.modal.addsource.field.whitelist.warning")}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-stretch">
          <Button
            background="Pink"
            border="Dark"
            width="Full"
            onClick={handleAddSource}
            disabled={!isIpListValid || !newSourceName || !newMatchingField || !newDatalakeCollection}
          >
            <span>{t('sources.modal.addsource.action.addsource')}</span>
          </Button>
        </div>
      </Modal>
      <Modal show={showDeleteModal} title={t("sources.modal.deletesource.title")} toggle={() => setShowDeleteModal(!showDeleteModal)}>
        <div className="space-y-4">
          <p className="text-red-500">{t("sources.modal.deletesource.warning")}</p>
          <p>{t("sources.modal.deletesource.description", { deleteSourceName })}</p>
          <input
            type="text"
            className="w-full px-3 py-2 bg-light border-2 border-dark"
            value={confirmation}
            onChange={(e) => setConfirmation(e.target.value)}
          />
          <Button
            background="Pink"
            border="Dark"
            width="Full"
            onClick={handleDelete}
            disabled={confirmation.toLowerCase() !== deleteSourceName.toLowerCase()}
          >
            Confirm
          </Button>
        </div>
      </Modal>
    </AccountLayout>
  );
};

export default Workspace;

export const getServerSideProps = async (context) => {
  const session = await getSession(context);
  const token = await getToken({ req: context.req, secret: process.env.NEXTAUTH_SECRET, raw: true });
  const apolloClient = initializeApollo();

  try {
    // Fetch workspace data first
    let workspace = null;
    if (session) {
      workspace = await getWorkspace(
        session.user.userId,
        session.user.email,
        context.params.workspaceSlug
      );
    }

    // Fetch sources data using workspace.slug
    const { data } = await apolloClient.query({
      query: sourcesQuery,
      variables: { workspaceSlug: context.params.workspaceSlug }, // Pass workspace slug
      context: {
        headers: {
          authorization: `${token}`
        },
        token
      }
    });

    return addApolloState(apolloClient, {
      props: {
        workspace,
        sources: data.sources, // Pass the fetched sources as props
        session,
      },
    });
  } catch (error) {
    console.error('Error fetching data:', error);
    return {
      notFound: true // Or redirect to an error page
    };
  }
};