'use client'

import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'

interface AINodeConfigProps {
  nodeData: any
  onSave: (data: any) => void
  onCancel: () => void
}

export default function AINodeConfig({ nodeData, onSave, onCancel }: AINodeConfigProps) {
  const { t } = useTranslation()
  
  const [config, setConfig] = useState({
    name: nodeData?.name || '',
    type: nodeData?.type || 'ai-agent',
    agent_type: nodeData?.config?.agent_type || 'data-analysis',
    instructions: nodeData?.instructions || '',
    webhook_url: nodeData?.webhook_url || '',
    method: nodeData?.method || 'POST',
    parse_type: nodeData?.parse_type || 'json',
    parse_config: nodeData?.parse_config || {}
  })

  const handleInputChange = (field: string, value: any) => {
    setConfig(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleSave = () => {
    const updatedData = {
      ...nodeData,
      name: config.name,
      config: {
        agent_type: config.agent_type
      },
      instructions: config.instructions,
      webhook_url: config.webhook_url,
      method: config.method,
      parse_type: config.parse_type,
      parse_config: config.parse_config
    }
    onSave(updatedData)
  }

  const renderAIAgentConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Agent Type</label>
        <select 
          value={config.agent_type} 
          onChange={(e) => handleInputChange('agent_type', e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        >
          <option value="data-analysis">Data Analysis Agent</option>
          <option value="text-processing">Text Processing Agent</option>
          <option value="decision">Decision Agent</option>
        </select>
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">Instructions</label>
        <textarea 
          value={config.instructions}
          onChange={(e) => handleInputChange('instructions', e.target.value)}
          placeholder="Provide specific instructions for the AI agent..."
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2 h-24"
        />
      </div>
    </div>
  )

  const renderWebhookConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Webhook URL</label>
        <input 
          type="url"
          value={config.webhook_url}
          onChange={(e) => handleInputChange('webhook_url', e.target.value)}
          placeholder="https://example.com/webhook"
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        />
      </div>
      
      <div>
        <label className="block text-sm font-medium text-gray-700">HTTP Method</label>
        <select 
          value={config.method} 
          onChange={(e) => handleInputChange('method', e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        >
          <option value="POST">POST</option>
          <option value="GET">GET</option>
          <option value="PUT">PUT</option>
          <option value="PATCH">PATCH</option>
          <option value="DELETE">DELETE</option>
        </select>
      </div>
    </div>
  )

  const renderParserConfig = () => (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">Parse Type</label>
        <select 
          value={config.parse_type} 
          onChange={(e) => handleInputChange('parse_type', e.target.value)}
          className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
        >
          <option value="json">JSON</option>
          <option value="xml">XML</option>
          <option value="csv">CSV</option>
          <option value="text">Text</option>
        </select>
      </div>
      
      {config.parse_type === 'csv' && (
        <div>
          <label className="block text-sm font-medium text-gray-700">CSV Configuration</label>
          <input 
            type="text"
            placeholder="Delimiter (default: comma)"
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
            onChange={(e) => handleInputChange('parse_config', { ...config.parse_config, delimiter: e.target.value })}
          />
        </div>
      )}
    </div>
  )

  return (
    <div className="p-6 max-w-md mx-auto">
      <h3 className="text-lg font-semibold mb-4">Configure Node</h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Node Name</label>
          <input 
            type="text"
            value={config.name}
            onChange={(e) => handleInputChange('name', e.target.value)}
            placeholder="Enter node name..."
            className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
          />
        </div>

        {config.type === 'ai-agent' && renderAIAgentConfig()}
        {config.type === 'webhook' && renderWebhookConfig()}
        {config.type === 'parser' && renderParserConfig()}
      </div>

      <div className="flex justify-end space-x-3 mt-6">
        <button 
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300"
        >
          Cancel
        </button>
        <button 
          onClick={handleSave}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700"
        >
          Save
        </button>
      </div>
    </div>
  )
} 