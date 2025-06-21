import { useState, useRef, useEffect } from 'react';
import Card from '@/components/Card/index';
import { useTranslation } from "react-i18next";
import sourceCatalog from '../../../../data/catalogs/sources.json';
import { DndContext, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { XMarkIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { QueryBuilder } from 'react-querybuilder';
import { useQuery, useMutation, gql } from '@apollo/client';
import { useRouter } from 'next/router';
import { getWorkspace } from '@/prisma/services/workspace';

const WORKSPACE_CONFIG_QUERY = gql`
  query Configs($workspaceSlug: String!) {
    configs(workspaceSlug: $workspaceSlug) {
      _id
      configType
      data
      updatedAt
    }
  }
`;

const UPDATE_WORKSPACE_CONFIGS = gql`
  mutation UpdateWorkspaceConfigs($workspaceSlug: String!, $configs: JSON!) {
    updateWorkspaceConfigs(workspaceSlug: $workspaceSlug, configs: $configs) {
      _id
      configType
      data
      updatedAt
    }
  }
`;

// Define airankFields first
const airankFields = [
  { name: 'airank_id', label: 'AI Rank ID', valueSources: ['AI Rank field'], comparator: 'group1' },
  { name: 'airank_emailAddress', label: 'AI Rank Email Address', valueSources: ['AI Rank field'], comparator: 'group1' },
  { name: 'airank_phoneNumber', label: 'AI Rank Phone Number', valueSources: ['AI Rank field'], comparator: 'group1' },
  { name: 'airank_companyName', label: 'AI Rank Company Name', valueSources: ['AI Rank field'], comparator: 'group1' },
  { name: 'airank_firstName', label: 'AI Rank First Name', valueSources: ['AI Rank field'], comparator: 'group1' },
  { name: 'airank_lastName', label: 'AI Rank Last Name', valueSources: ['AI Rank field'], comparator: 'group1' },
  { name: 'airank_address', label: 'AI Rank Address', valueSources: ['AI Rank field'], comparator: 'group1' },
  { name: 'airank_phoneMobile', label: 'AI Rank Phone (Mobile)', valueSources: ['AI Rank field'], comparator: 'group1' },
  { name: 'airank_phoneWork', label: 'AI Rank Phone (Work)', valueSources: ['AI Rank field'], comparator: 'group1' },
  { name: 'airank_country', label: 'AI Rank Country', valueSources: ['AI Rank field'], comparator: 'group1' }
];

// Now define fields using airankFields
const allFields = [
  { name: 'id', label: 'Source ID', valueSources: ['value'], comparator: 'group1', values: airankFields },
  { name: 'emailAddress', label: 'Source Email Address', valueSources: ['value'], comparator: 'group1', values: airankFields },
  { name: 'phoneNumber', label: 'Source Phone Number', valueSources: ['value'], comparator: 'group1', values: airankFields },
  { name: 'companyName', label: 'Source Company Name', valueSources: ['value'], comparator: 'group1', values: airankFields },
  { name: 'firstName', label: 'Source First Name', valueSources: ['value'], comparator: 'group1', values: airankFields },
  { name: 'lastName', label: 'Source Last Name', valueSources: ['value'], comparator: 'group1', values: airankFields },
  { name: 'address', label: 'Source Address', valueSources: ['value'], comparator: 'group1', values: airankFields },
  { name: 'phoneMobile', label: 'Source Mobile Phone', valueSources: ['value'], comparator: 'group1', values: airankFields },
  { name: 'phoneWork', label: 'Source Phone (Work)', valueSources: ['value'], comparator: 'group1', values: airankFields },
  { name: 'country', label: 'Source Country', valueSources: ['value'], comparator: 'group1', values: airankFields }
];

// Custom value editor component
const ValueEditor = ({ value, field, operator, valueSource, handleOnChange, t }) => {
  if (valueSource === 'field') {
    return (
      <select
        value={value || ''}
        onChange={(e) => handleOnChange(e.target.value)}
        className="w-full rule-value"
      >
        <option value="">{t("data.fields.selectField")}</option>
        {field.values?.map(airankField => (
          <option key={airankField.name} value={airankField.name}>
            {airankField.label}
          </option>
        ))}
      </select>
    );
  }

  // For 'value' source, show only paired AI Rank field
  const pairedField = field.values?.[0];
  return (
    <select
      value={pairedField?.name || ''}
      onChange={(e) => handleOnChange(e.target.value)}
      className="w-full rule-value"
      disabled={true}
    >
      <option value={pairedField?.name}>{pairedField?.label}</option>
    </select>
  );
};

const TableRow = ({ source, isManual, toggleOverride, index }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({
    id: source._id,
    disabled: !isManual
  });

  const style = transform ? {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1
  } : undefined;

  return (
    <tr
      ref={setNodeRef}
      style={style}
      className={`${!isManual ? 'opacity-50' : ''}`}
    >
      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-24">
        {source.displayRank}
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <div className="flex items-center">
          {source.icon && (
            <img 
              src={source.icon} 
              alt={source.name} 
              className="w-6 h-6 mr-3"
            />
          )}
          <span className="text-sm font-medium text-gray-900">{source.name}</span>
        </div>
      </td>
      <td className="px-6 py-4 whitespace-nowrap">
        <button 
          onClick={() => toggleOverride(source._id)}
          disabled={!isManual}
          className={`w-4 h-4 border transition-colors ${
            source.willOverride 
              ? 'bg-blue-500 border-blue-500' 
              : 'bg-white border-gray-300'
          } ${isManual ? 'hover:border-gray-400 cursor-pointer' : 'cursor-not-allowed opacity-50'}`}
        >
          {source.willOverride && (
            <svg className="w-4 h-4 text-white" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
        </button>
      </td>
      {isManual && (
        <td className="w-10 px-3 py-4">
          <div {...attributes} {...listeners} className="cursor-grab">
            <Bars3Icon className="w-4 h-4 text-gray-400" />
          </div>
        </td>
      )}
    </tr>
  );
};

// Separate table component
const DraggableTable = ({ 
  sources, 
  isManual, 
  onDragEnd, 
  toggleOverride 
}) => {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  return (
    <DndContext 
      sensors={sensors}
      onDragEnd={onDragEnd}
    >
      <table className="min-w-full divide-y divide-gray-200">
        <thead className={`bg-gray-50 ${!isManual ? 'opacity-50' : ''}`}>
          <tr>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Priority
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              App
            </th>
            <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              Allow Override
            </th>
            {isManual && (
              <th scope="col" className="w-10 px-3 py-3">
                {/* Drag handle column */}
              </th>
            )}
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          <SortableContext 
            items={sources.map(source => source._id)}
            strategy={verticalListSortingStrategy}
          >
            {sources.map((source, index) => (
              <TableRow
                key={source._id}
                source={source}
                isManual={isManual}
                toggleOverride={toggleOverride}
                index={index}
              />
            ))}
          </SortableContext>
        </tbody>
      </table>
    </DndContext>
  );
};

const DataTab = ({ sources = [], workspace, token }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const { workspaceSlug } = router.query;
  const [isManual, setIsManual] = useState(false);
  const [isMergeManual, setIsMergeManual] = useState(false);
  const [manualSources, setManualSources] = useState(null);
  const [mergeRules, setMergeRules] = useState(null);
  const [manualMergeRules, setManualMergeRules] = useState(null);
  const [isGroupsManual, setIsGroupsManual] = useState(false);
  const [isGroupsMergeManual, setIsGroupsMergeManual] = useState(false);
  const [groupsManualSources, setGroupsManualSources] = useState(null);
  const [groupsMergeRules, setGroupsMergeRules] = useState(null);
  const [groupsManualMergeRules, setGroupsManualMergeRules] = useState(null);
  
  // Update mutation to include token in context
  const [updateConfigs] = useMutation(UPDATE_WORKSPACE_CONFIGS, {
    context: {
      headers: {
        authorization: `${token}`
      }
    }
  });

  // Update query to include token in context
  const { data: configData, loading: configLoading } = useQuery(WORKSPACE_CONFIG_QUERY, {
    variables: { workspaceSlug },
    skip: !workspaceSlug,
    context: {
      headers: {
        authorization: `${token}`
      }
    },
    onCompleted: (data) => {
      if (data?.configs) {
        const combineSourcesConfig = data.configs.find(
          config => config.configType === 'dataPeopleCombineSources'
        );
        if (combineSourcesConfig) {
          setIsManual(combineSourcesConfig.data.method === 'manual');
          setManualSources(combineSourcesConfig.data.manualSources);
        }

        const mergeIdentitiesConfig = data.configs.find(
          config => config.configType === 'dataPeopleMergeIdentities'
        );
        if (mergeIdentitiesConfig) {
          setIsMergeManual(mergeIdentitiesConfig.data.method === 'manual');
          setMergeRules(mergeIdentitiesConfig.data.rules);
          setManualMergeRules(mergeIdentitiesConfig.data.manualRules);
        }

        // Handle groups configs
        const groupsCombineSourcesConfig = data.configs.find(
          config => config.configType === 'dataOrganizationsCombineSources'
        );
        if (groupsCombineSourcesConfig) {
          setIsGroupsManual(groupsCombineSourcesConfig.data.method === 'manual');
          setGroupsManualSources(groupsCombineSourcesConfig.data.manualSources);
        }

        const groupsMergeIdentitiesConfig = data.configs.find(
          config => config.configType === 'dataOrganizationsMergeIdentities'
        );
        if (groupsMergeIdentitiesConfig) {
          setIsGroupsMergeManual(groupsMergeIdentitiesConfig.data.method === 'manual');
          setGroupsMergeRules(groupsMergeIdentitiesConfig.data.rules);
          setGroupsManualMergeRules(groupsMergeIdentitiesConfig.data.manualRules);
        }
      }
    }
  });

  // Show loading state if config is loading
  if (configLoading) {
    return (
      <Card>
        <Card.Body>
          <div className="flex items-center justify-center h-32">
            <p className="text-gray-500">Loading...</p>
          </div>
        </Card.Body>
      </Card>
    );
  }

  // Default automatic merge rules
  const defaultMergeRules = {
    combinator: 'or',
    rules: [
      {
        field: 'emailAddress',
        operator: 'equal',
        value: 'airank_emailAddress'
      },
      {
        field: 'id',
        operator: 'equal',
        value: 'airank_id'
      },
      {
        field: 'phoneMobile',
        operator: 'equal',
        value: 'airank_phoneMobile'
      }
    ]
  };

  // Handle method changes with config updates
  const handleMethodChange = async (event) => {
    const method = event.target.value;
    setIsManual(method === 'manual');
    
    if (method === 'manual' && !manualSources) {
      setManualSources(enhancedSources);
    }

    try {
      await updateConfigs({
        variables: {
          workspaceSlug,
          configs: [{
            configType: 'dataPeopleCombineSources',
            data: {
              method,
              manualSources: method === 'manual' ? (manualSources || enhancedSources) : null
            }
          }]
        }
      });
    } catch (error) {
      // Handle error silently
    }
  };

  const handleMergeMethodChange = async (e) => {
    const method = e.target.value;
    setIsMergeManual(method === 'manual');
    
    const currentRules = method === 'manual' 
      ? (manualMergeRules || mergeRules || defaultMergeRules)
      : defaultMergeRules;
    
    if (method === 'manual') {
      setMergeRules(currentRules);
    } else {
      if (mergeRules !== defaultMergeRules) {
        setManualMergeRules(mergeRules);
      }
      setMergeRules(defaultMergeRules);
    }

    try {
      await updateConfigs({
        variables: {
          workspaceSlug,
          configs: [{
            configType: 'dataPeopleMergeIdentities',
            data: {
              method,
              rules: currentRules,
              manualRules: method === 'manual' ? null : mergeRules
            }
          }]
        }
      });
    } catch (error) {
      // Handle error silently
    }
  };

  // Combine sources with catalog info and sort by priority
  const getEnhancedSources = () => {
    if (!sources) return [];
    
    const baseSourceList = sources
      .filter(source => source?.status !== "archived")
      .map(source => {
        const catalogInfo = sourceCatalog.find(cat => 
          cat.sourceJobs.includes(source?.sourceType)
        );
        return {
          ...source,
          name: catalogInfo?.name || source?.name || '',
          icon: catalogInfo?.icon || '',
          priority: catalogInfo?.priority || 999,
          willOverride: catalogInfo?.willOverride || false
        };
      })
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .map((source, index) => ({
        ...source,
        displayRank: index + 1
      }));

    return isManual && manualSources ? manualSources : baseSourceList;
  };

  const getEnhancedGroupSources = () => {
    if (!sources) return [];
    
    const baseSourceList = sources
      .filter(source => source?.status !== "archived")
      .map(source => {
        const catalogInfo = sourceCatalog.find(cat => 
          cat.sourceJobs.includes(source?.sourceType)
        );
        return {
          ...source,
          name: catalogInfo?.name || source?.name || '',
          icon: catalogInfo?.icon || '',
          priority: catalogInfo?.priority || 999,
          willOverride: catalogInfo?.willOverride || false
        };
      })
      .sort((a, b) => (b.priority || 0) - (a.priority || 0))
      .map((source, index) => ({
        ...source,
        displayRank: index + 1
      }));

    return isGroupsManual && groupsManualSources ? groupsManualSources : baseSourceList;
  };

  const enhancedSources = getEnhancedSources();
  const enhancedGroupSources = getEnhancedGroupSources();

  const handleDragEnd = (event) => {
    const { active, over } = event;
    
    if (!active || !over || active.id === over.id) {
      return;
    }

    if (isManual) {
      setManualSources((items) => {
        const oldIndex = items.findIndex(item => item._id === active.id);
        const newIndex = items.findIndex(item => item._id === over.id);

        const newItems = [...items];
        const [movedItem] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, movedItem);

        return newItems.map((item, index) => ({
          ...item,
          displayRank: index + 1
        }));
      });
    }
  };

  // Handle merge rules changes
  const handleMergeRulesChange = async (query) => {
    if (isMergeManual) {
      setMergeRules(query);
      setManualMergeRules(query);

      try {
        await updateConfigs({
          variables: {
            workspaceSlug,
            configs: [{
              configType: 'dataPeopleMergeIdentities',
              data: {
                isManual: isMergeManual,
                rules: query,
                manualRules: query
              }
            }]
          }
        });
      } catch (error) {
        // Handle error silently
      }
    }
  };

  const toggleOverride = (sourceId) => {
    if (!isManual) return;

    setManualSources(prevSources => 
      prevSources.map(source => 
        source._id === sourceId 
          ? { ...source, willOverride: !source.willOverride }
          : source
      )
    );
  };

  const renderTable = () => (
    <div className="border overflow-hidden">
      {enhancedSources.length > 0 ? (
        <DraggableTable
          sources={enhancedSources}
          isManual={isManual}
          onDragEnd={handleDragEnd}
          toggleOverride={toggleOverride}
        />
      ) : (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500">{t("data.sources.combine.noSources")}</p>
        </div>
      )}
    </div>
  );

  // Add new default merge rules for groups
  const defaultGroupsMergeRules = {
    combinator: 'or',
    rules: [
      {
        field: 'id',
        operator: 'equal',
        value: 'airank_id'
      },
      {
        id: '40035a38-4269-45ae-bade-7922fd3b0e1e',
        rules: [
          {
            id: 'd849a2d1-a3d4-438f-bf43-50bded383278',
            field: 'companyName',
            operator: 'equal',
            valueSource: 'value',
            value: 'airank_companyName'
          },
          {
            id: '1ba75bb0-68d8-45f2-a442-121b135f2024',
            field: 'country',
            operator: 'equal',
            valueSource: 'value',
            value: 'airank_country'
          }
        ],
        combinator: 'and',
        not: false
      }
    ]
  };

  // Add new handlers for groups
  const handleGroupsMethodChange = async (event) => {
    const method = event.target.value;
    setIsGroupsManual(method === 'manual');
    
    if (method === 'manual' && !groupsManualSources) {
      setGroupsManualSources(enhancedGroupSources);
    }

    try {
      await updateConfigs({
        variables: {
          workspaceSlug,
          configs: [{
            configType: 'dataOrganizationsCombineSources',
            data: {
              method,
              manualSources: method === 'manual' ? (groupsManualSources || enhancedGroupSources) : null
            }
          }]
        }
      });
    } catch (error) {
      // Handle error silently
    }
  };

  const handleGroupsMergeMethodChange = async (e) => {
    const method = e.target.value;
    setIsGroupsMergeManual(method === 'manual');
    
    const currentRules = method === 'manual'
      ? (groupsManualMergeRules || groupsMergeRules || defaultGroupsMergeRules)
      : defaultGroupsMergeRules;

    if (method === 'manual') {
      setGroupsMergeRules(currentRules);
    } else {
      if (groupsMergeRules !== defaultGroupsMergeRules) {
        setGroupsManualMergeRules(groupsMergeRules);
      }
      setGroupsMergeRules(defaultGroupsMergeRules);
    }

    try {
      await updateConfigs({
        variables: {
          workspaceSlug,
          configs: [{
            configType: 'dataOrganizationsMergeIdentities',
            data: {
              method,
              rules: currentRules,
              manualRules: method === 'manual' ? null : groupsMergeRules
            }
          }]
        }
      });
    } catch (error) {
      // Handle error silently
    }
  };

  const handleGroupsMergeRulesChange = async (query) => {
    if (isGroupsMergeManual) {
      setGroupsMergeRules(query);
      setGroupsManualMergeRules(query);

      try {
        await updateConfigs({
          variables: {
            workspaceSlug,
            configs: [{
              configType: 'dataOrganizationsMergeIdentities',
              data: {
                method: 'manual',
                rules: query,
                manualRules: query
              }
            }]
          }
        });
      } catch (error) {
        // Handle error silently
      }
    }
  };

  const toggleGroupsOverride = (sourceId) => {
    if (!isGroupsManual) return;

    setGroupsManualSources(prevSources => 
      prevSources.map(source => 
        source._id === sourceId 
          ? { ...source, willOverride: !source.willOverride }
          : source
      )
    );
  };

  const handleGroupsDragEnd = (event) => {
    const { active, over } = event;
    
    if (!active || !over || active.id === over.id) {
      return;
    }

    if (isGroupsManual) {
      setGroupsManualSources((items) => {
        const oldIndex = items.findIndex(item => item._id === active.id);
        const newIndex = items.findIndex(item => item._id === over.id);

        const newItems = [...items];
        const [movedItem] = newItems.splice(oldIndex, 1);
        newItems.splice(newIndex, 0, movedItem);

        return newItems.map((item, index) => ({
          ...item,
          displayRank: index + 1
        }));
      });
    }
  };

  const renderGroupsTable = () => (
    <div className="border overflow-hidden">
      {enhancedGroupSources.length > 0 ? (
        <DraggableTable
          sources={enhancedGroupSources}
          isManual={isGroupsManual}
          onDragEnd={handleGroupsDragEnd}
          toggleOverride={toggleGroupsOverride}
        />
      ) : (
        <div className="text-center py-6">
          <p className="text-sm text-gray-500">{t("data.sources.combine.noSources")}</p>
        </div>
      )}
    </div>
  );

  return (
    <>
      <Card>
        <Card.Body title={t("data.navigation.people") || "People"}>
          <div className="space-y-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-medium">{t("data.sources.combine.title")}</h3>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="combine_method"
                      value="automatic"
                      checked={!isManual}
                      onChange={handleMethodChange}
                      className="mr-2"
                    />
                    <span>{t("data.sources.combine.automatic")}</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="combine_method"
                      value="manual"
                      checked={isManual}
                      onChange={handleMethodChange}
                      className="mr-2"
                    />
                    <span>{t("data.sources.combine.manual")}</span>
                  </label>
                </div>
              </div>
              <p className="text-sm text-gray-500 italic mb-4">{t("data.sources.combine.recommendation")}</p>

              <div className="border overflow-hidden">
                {enhancedSources.length > 0 ? (
                  renderTable()
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500">{t("data.sources.combine.noSources")}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-medium">{t("data.merge.title")}</h3>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="merge_method"
                      value="automatic"
                      checked={!isMergeManual}
                      onChange={handleMergeMethodChange}
                      className="mr-2"
                    />
                    <span>{t("data.merge.automatic")}</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="merge_method"
                      value="manual"
                      checked={isMergeManual}
                      onChange={handleMergeMethodChange}
                      className="mr-2"
                    />
                    <span>{t("data.merge.manual")}</span>
                  </label>
                </div>
              </div>
              <p className="text-sm text-gray-500 italic mb-4">{t("data.merge.recommendation")}</p>
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-4">{t("data.merge.description")}</p>
                <div className="">
                  <QueryBuilder
                    fields={allFields}
                    query={mergeRules || defaultMergeRules}
                    onQueryChange={handleMergeRulesChange}
                    disabled={!isMergeManual}
                    controlClassnames={{
                      queryBuilder: 'queryBuilder queryBuilder-branches',
                      removeGroup: 'rule-remove',
                      removeRule: 'rule-remove',
                      ruleGroup: 'p-0'
                    }}
                    showAddRule={isMergeManual}
                    showAddGroup={isMergeManual}
                    operators={[{ name: 'equal', label: '=' }]}
                    getValueEditorType={() => 'select'}
                    valueEditor={(props) => <ValueEditor {...props} t={t} />}
                    showValueSourceSelector={true}
                    defaultValueSource="value"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>

      <Card className="mt-6">
        <Card.Body title={t("data.navigation.groups") || "Groups"}>
          <div className="space-y-8">
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-medium">{t("data.sources.combine.title")}</h3>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="groups_combine_method"
                      value="automatic"
                      checked={!isGroupsManual}
                      onChange={handleGroupsMethodChange}
                      className="mr-2"
                    />
                    <span>{t("data.sources.combine.automatic")}</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="groups_combine_method"
                      value="manual"
                      checked={isGroupsManual}
                      onChange={handleGroupsMethodChange}
                      className="mr-2"
                    />
                    <span>{t("data.sources.combine.manual")}</span>
                  </label>
                </div>
              </div>
              <p className="text-sm text-gray-500 italic mb-4">{t("data.sources.combine.recommendation")}</p>

              <div className="border overflow-hidden">
                {enhancedGroupSources.length > 0 ? (
                  renderGroupsTable()
                ) : (
                  <div className="text-center py-6">
                    <p className="text-sm text-gray-500">{t("data.sources.combine.noSources")}</p>
                  </div>
                )}
              </div>
            </div>

            <div className="pt-6 border-t">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-medium">{t("data.merge.title")}</h3>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="groups_merge_method"
                      value="automatic"
                      checked={!isGroupsMergeManual}
                      onChange={handleGroupsMergeMethodChange}
                      className="mr-2"
                    />
                    <span>{t("data.merge.automatic")}</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      name="groups_merge_method"
                      value="manual"
                      checked={isGroupsMergeManual}
                      onChange={handleGroupsMergeMethodChange}
                      className="mr-2"
                    />
                    <span>{t("data.merge.manual")}</span>
                  </label>
                </div>
              </div>
              <p className="text-sm text-gray-500 italic mb-4">{t("data.merge.recommendation")}</p>
              <div className="mt-4">
                <p className="text-sm text-gray-500 mb-4">{t("data.merge.description")}</p>
                <div className="">
                  <QueryBuilder
                    fields={allFields}
                    query={groupsMergeRules || defaultGroupsMergeRules}
                    onQueryChange={handleGroupsMergeRulesChange}
                    disabled={!isGroupsMergeManual}
                    controlClassnames={{
                      queryBuilder: 'queryBuilder queryBuilder-branches',
                      removeGroup: 'rule-remove',
                      removeRule: 'rule-remove',
                      ruleGroup: 'p-0'
                    }}
                    showAddRule={isGroupsMergeManual}
                    showAddGroup={isGroupsMergeManual}
                    operators={[{ name: 'equal', label: '=' }]}
                    getValueEditorType={() => 'select'}
                    valueEditor={(props) => <ValueEditor {...props} t={t} />}
                    showValueSourceSelector={true}
                    defaultValueSource="value"
                  />
                </div>
              </div>
            </div>
          </div>
        </Card.Body>
      </Card>
    </>
  );
};

export default DataTab;

// Add getServerSideProps
export const getServerSideProps = async (context) => {
  const session = await getSession(context);
  const token = await getToken({ req: context.req, secret: process.env.NEXTAUTH_SECRET, raw: true });
  const apolloClient = initializeApollo();

  try {
    // Fetch workspace data
    let workspace = null;
    if (session) {
      workspace = await getWorkspace(
        session.user.userId,
        session.user.email,
        context.params.workspaceSlug
      );
    }

    // Fetch workspace config
    const { data } = await apolloClient.query({
      query: WORKSPACE_CONFIG_QUERY,
      variables: { workspaceSlug: context.params.workspaceSlug },
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
        session,
        token,
        initialConfig: data.configs
      },
    });
  } catch (error) {
    return {
      notFound: true
    };
  }
}; 