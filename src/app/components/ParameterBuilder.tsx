"use client";
import { useState } from "react";

interface ParameterSchema {
  type: string;
  description?: string;
  enum?: string[];
  minimum?: number;
  maximum?: number;
  default?: string | number | boolean;
}

interface InputSchema {
  type: string;
  properties: Record<string, ParameterSchema>;
  required: string[];
}

interface ParameterBuilderProps {
  inputSchema: InputSchema;
  onSchemaChange: (schema: InputSchema) => void;
}

export default function ParameterBuilder({ inputSchema, onSchemaChange }: ParameterBuilderProps) {
  const [paramName, setParamName] = useState('');
  const [paramType, setParamType] = useState('string');
  const [paramDescription, setParamDescription] = useState('');
  const [paramRequired, setParamRequired] = useState(false);
  const [enumValues, setEnumValues] = useState('');

  const addParameter = () => {
    if (!paramName.trim()) return;
    
    const newProperties = { ...inputSchema.properties };
    const newRequired = [...inputSchema.required];
    
    const paramSchema: ParameterSchema = {
      type: paramType,
      description: paramDescription || undefined
    };

    // Add enum values if type is string and enum values are provided
    if (paramType === 'string' && enumValues.trim()) {
      paramSchema.enum = enumValues.split(',').map(v => v.trim()).filter(v => v);
    }
    
    newProperties[paramName] = paramSchema;
    
    if (paramRequired && !newRequired.includes(paramName)) {
      newRequired.push(paramName);
    }
    
    onSchemaChange({
      ...inputSchema,
      properties: newProperties,
      required: newRequired
    });
    
    // Reset form
    setParamName('');
    setParamDescription('');
    setParamRequired(false);
    setEnumValues('');
  };

  const removeParameter = (paramName: string) => {
    const newProperties = { ...inputSchema.properties };
    const newRequired = inputSchema.required.filter(name => name !== paramName);
    
    delete newProperties[paramName];
    
    onSchemaChange({
      ...inputSchema,
      properties: newProperties,
      required: newRequired
    });
  };

  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Parameters</h3>
      
      {/* Add Parameter Form */}
      <div className="space-y-3 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            type="text"
            value={paramName}
            onChange={(e) => setParamName(e.target.value)}
            placeholder="Parameter name"
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
          <select
            value={paramType}
            onChange={(e) => setParamType(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="string">String</option>
            <option value="number">Number</option>
            <option value="boolean">Boolean</option>
          </select>
        </div>
        
        <input
          type="text"
          value={paramDescription}
          onChange={(e) => setParamDescription(e.target.value)}
          placeholder="Description (optional)"
          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
        />
        
        {paramType === 'string' && (
          <input
            type="text"
            value={enumValues}
            onChange={(e) => setEnumValues(e.target.value)}
            placeholder="Enum values (comma-separated, optional): option1, option2, option3"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          />
        )}
        
        <div className="flex items-center justify-between">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={paramRequired}
              onChange={(e) => setParamRequired(e.target.checked)}
              className="mr-2"
            />
            <span className="text-sm">Required parameter</span>
          </label>
          <button
            onClick={addParameter}
            disabled={!paramName.trim()}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm"
          >
            Add Parameter
          </button>
        </div>
      </div>

      {/* Parameter List */}
      <div className="space-y-2">
        <h4 className="text-sm font-medium text-gray-700">Current Parameters:</h4>
        {Object.keys(inputSchema.properties).length === 0 ? (
          <p className="text-xs text-gray-500 italic">No parameters added yet</p>
        ) : (
          Object.entries(inputSchema.properties).map(([name, schema]: [string, ParameterSchema]) => (
            <div key={name} className="flex items-center justify-between bg-gray-50 p-3 rounded border">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium text-sm">{name}</span>
                  <span className="text-xs text-gray-500 bg-gray-200 px-2 py-1 rounded">
                    {schema.type}
                  </span>
                  {inputSchema.required.includes(name) && (
                    <span className="text-xs text-red-500 bg-red-100 px-2 py-1 rounded">required</span>
                  )}
                  {schema.enum && (
                    <span className="text-xs text-blue-500 bg-blue-100 px-2 py-1 rounded">
                      enum
                    </span>
                  )}
                </div>
                {schema.description && (
                  <p className="text-xs text-gray-600 mb-1">{schema.description}</p>
                )}
                {schema.enum && (
                  <p className="text-xs text-gray-500">
                    Options: {schema.enum.join(', ')}
                  </p>
                )}
              </div>
              <button
                onClick={() => removeParameter(name)}
                className="text-red-400 hover:text-red-600 transition-colors ml-3"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))
        )}
      </div>
      
      {Object.keys(inputSchema.properties).length > 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded border text-xs">
          <p className="font-medium text-blue-700 mb-1">💡 Parameter Info:</p>
          <ul className="text-blue-600 space-y-1">
            <li>• <strong>Required</strong> parameters must be filled when using the tool</li>
            <li>• <strong>Enum</strong> parameters will show as dropdown selects</li>
            <li>• Parameters can be accessed in custom logic via <code className="bg-blue-200 px-1 rounded">params.parameterName</code></li>
          </ul>
        </div>
      )}
    </div>
  );
} 