import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { useTranslation } from "react-i18next";
import { CopyToClipboard } from 'react-copy-to-clipboard';
import { DocumentDuplicateIcon } from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';
import isAlphanumeric from 'validator/lib/isAlphanumeric';
import isSlug from 'validator/lib/isSlug';

import Button from '@/components/Button/index';
import Card from '@/components/Card/index';
import Modal from '@/components/Modal/index';
import { useWorkspace } from '@/providers/workspace';
import api from '@/lib/common/api';

const WorkspaceTab = ({ workspace = {}, isTeamOwner }) => {
  const router = useRouter();
  const { t } = useTranslation();
  const { setWorkspace } = useWorkspace();
  const [showModal, setModalState] = useState(false);
  const [isSubmitting, setSubmittingState] = useState(false);
  const [name, setName] = useState(workspace?.name || '');
  const [slug, setSlug] = useState(workspace?.slug || '');
  const [verifyWorkspace, setVerifyWorkspace] = useState('');
  
  // If no workspace is provided, show loading state
  if (!workspace) {
    return (
      <Card>
        <Card.Body>
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500">{t("common.label.loading")}</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  const validName = name.length > 0 && name.length <= 16;
  const validSlug =
    slug.length > 0 &&
    slug.length <= 16 &&
    isSlug(slug) &&
    isAlphanumeric(slug, undefined, { ignore: '-' });
  const verifiedWorkspace = verifyWorkspace === workspace?.slug;

  const changeName = (event) => {
    event.preventDefault();
    setSubmittingState(true);
    api(`/api/workspace/${workspace.slug}/name`, {
      body: { name },
      method: 'PUT',
    }).then((response) => {
      setSubmittingState(false);

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Workspace name successfully updated!');
      }
    });
  };

  const changeSlug = (event) => {
    event.preventDefault();
    setSubmittingState(true);
    api(`/api/workspace/${workspace.slug}/slug`, {
      body: { slug },
      method: 'PUT',
    }).then((response) => {
      setSubmittingState(false);
      const slug = response?.data?.slug;

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toast.success('Workspace slug successfully updated!');
        router.replace(`/${slug}/settings/general`);
      }
    });
  };

  const copyToClipboard = () => toast.success('Copied to clipboard!');

  const handleNameChange = (event) => setName(event.target.value);

  const handleSlugChange = (event) => setSlug(event.target.value);

  useEffect(() => {
    setName(workspace.name);
    setSlug(workspace.slug);
    setWorkspace(workspace);
  }, [workspace, setWorkspace]);

  const handleVerifyWorkspaceChange = (event) =>
    setVerifyWorkspace(event.target.value);

  const deleteWorkspace = () => {
    setSubmittingState(true);
    api(`/api/workspace/${workspace.slug}`, {
      method: 'DELETE',
    }).then((response) => {
      setSubmittingState(false);

      if (response.errors) {
        Object.keys(response.errors).forEach((error) =>
          toast.error(response.errors[error].msg)
        );
      } else {
        toggleModal();
        setWorkspace(null);
        router.replace('/account');
        toast.success('Workspace has been deleted!');
      }
    });
  };

  const toggleModal = () => {
    setVerifyWorkspace('');
    setModalState(!showModal);
  };

  return (
    <>
      <Card>
        <Card.Body
          title={t("workspace.action.name.label")}
          subtitle={t("settings.workspace.name.description")}
        >
          <input
            className="px-3 py-2 border bg-dark md:w-1/2"
            disabled={isSubmitting || !isTeamOwner}
            onChange={handleNameChange}
            type="text"
            value={name}
          />
        </Card.Body>
        <Card.Footer>
          <small>Please use 16 characters at maximum</small>
          {isTeamOwner && (
            <Button
              background="Pink"
              border="Light"
              disabled={!validName || isSubmitting}
              onClick={changeName}
            >
              Save
            </Button>
          )}
        </Card.Footer>
      </Card>
      <Card>
        <Card.Body
          title={t("settings.workspace.slug")}
          subtitle={t("settings.workspace.slug.description")}
        >
          <div className="flex items-center space-x-3">
            <input
              className="px-3 py-2 border bg-dark md:w-1/2"
              disabled={isSubmitting || !isTeamOwner}
              onChange={handleSlugChange}
              type="text"
              value={slug}
            />
            <span className={`text-sm ${slug.length > 16 && 'text-red-600'}`}>
              {slug.length} / 16
            </span>
          </div>
        </Card.Body>
        <Card.Footer>
          <small>{t("settings.workspace.slug.validation.message")}</small>
          {isTeamOwner && (
            <Button
              background="Pink"
              border="Light"
              disabled={!validSlug || isSubmitting}
              onClick={changeSlug}
            >
              {t("common.label.save")}
            </Button>
          )}
        </Card.Footer>
      </Card>
      <Card>
        <Card.Body
          title={t("settings.workspace.id")}
          subtitle={t("settings.workspace.id.description")}
        >
          <div className="flex items-center justify-between px-3 py-2 space-x-5 font-mono text-sm border md:w-1/2">
            <span className="overflow-x-auto">{workspace.workspaceCode}</span>
            <CopyToClipboard
              onCopy={copyToClipboard}
              text={workspace.workspaceCode}
            >
              <DocumentDuplicateIcon className="w-5 h-5 cursor-pointer hover:text-blue-600" />
            </CopyToClipboard>
          </div>
        </Card.Body>
      </Card>
      <Card danger>
        <Card.Body
          title={t("settings.workspace.delete")}
          subtitle={t("settings.workspace.delete.message")}
        />
        <Card.Footer>
          <small className={[isTeamOwner && 'text-red-600']}>
            {isTeamOwner
              ? t("setting.workspace.delete.warning.message")
              : t("settings.workspace.delete.contact.message")}
          </small>
          {isTeamOwner && (
            <Button
              background="Red"
              border="Light"
              disabled={isSubmitting}
              onClick={toggleModal}
            >
              {isSubmitting ? 'Deleting' : 'Delete'}
            </Button>
          )}
        </Card.Footer>
      </Card>

      <Modal
        show={showModal}
        title={t("settings.workspace.delete")}
        toggle={toggleModal}
      >
        <p className="flex flex-col">
          <span>
            {t("settings.workspace.delete.data.warning")}
          </span>
        </p>
        <p className="px-3 py-2 text-red-600 border border-red-600">
          <strong>Warning:</strong> {t("settings.workspace.delete.final.message")}
        </p>
        <div className="flex flex-col">
          <label className="text-sm text-dark py-2" dangerouslySetInnerHTML={{__html: t('settings.workspace.delete.instructions', { workspaceSlug: slug })}}>
          </label>
          <input
            className="px-3 py-2 border bg-dark text-light"
            disabled={isSubmitting}
            onChange={handleVerifyWorkspaceChange}
            type="text"
            value={verifyWorkspace}
          />
        </div>
        <div className="flex flex-col items-stretch">
          <Button
            background="Red"
            border="Dark"
            width="Full"
            disabled={!verifiedWorkspace || isSubmitting}
            onClick={deleteWorkspace}
          >
            <span>{t("settings.workspace.delete")}</span>
          </Button>
        </div>
      </Modal>
    </>
  );
};

export default WorkspaceTab; 