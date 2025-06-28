interface CustomLogicEditorProps {
  customLogic: string;
  onLogicChange: (logic: string) => void;
  onTemplateLoad: (template: 'text_processor' | 'calculator' | 'data_formatter') => void;
}

export default function CustomLogicEditor({ customLogic, onLogicChange, onTemplateLoad }: CustomLogicEditorProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-blue-50">
      <h3 className="text-sm font-medium text-gray-700 mb-3">Custom Logic (JavaScript)</h3>
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Handler Function</label>
          <textarea
            value={customLogic}
            onChange={(e) => onLogicChange(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-sm"
            rows={12}
            placeholder={`// Write your custom JavaScript logic here
// Parameters are available in the 'params' object
// Example:

const { name, age } = params;

if (!name) {
  return "❌ Name is required!";
}

const greeting = "Hello " + name;
const info = age ? " (Age: " + age + ")" : '';

return greeting + info + "!";

// You can also return objects:
// return { greeting, timestamp: new Date().toISOString() };

// Or return MCP format:
// return {
//   content: [{
//     type: "text",
//     text: "Your result here"
//   }]
// };`}
          />
        </div>
        
        {/* Code Examples */}
        <div className="bg-gray-50 rounded border p-3 text-xs">
          <p className="font-medium text-gray-700 mb-2">💡 Available Features:</p>
          <ul className="text-gray-600 space-y-1">
            <li>• <strong>Parameters:</strong> Access via <code className="bg-gray-200 px-1 rounded">params.parameterName</code></li>
            <li>• <strong>Console:</strong> <code className="bg-gray-200 px-1 rounded">console.log()</code>, <code className="bg-gray-200 px-1 rounded">console.error()</code></li>
            <li>• <strong>Utilities:</strong> <code className="bg-gray-200 px-1 rounded">JSON</code>, <code className="bg-gray-200 px-1 rounded">Math</code>, <code className="bg-gray-200 px-1 rounded">Date</code>, <code className="bg-gray-200 px-1 rounded">RegExp</code></li>
            <li>• <strong>Encoding:</strong> <code className="bg-gray-200 px-1 rounded">btoa()</code>, <code className="bg-gray-200 px-1 rounded">atob()</code>, <code className="bg-gray-200 px-1 rounded">encodeURIComponent()</code></li>
            <li>• <strong>Return:</strong> MCP format with content array to access it from the client</li>
          </ul>
        </div>

        {/* Quick Templates */}
        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-700">🚀 Quick Templates (with auto parameters):</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onTemplateLoad('text_processor')}
              className="px-3 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700 transition-colors"
            >
              📝 Text Processor
            </button>
            <button
              onClick={() => onTemplateLoad('calculator')}
              className="px-3 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
            >
              🧮 Calculator
            </button>
            <button
              onClick={() => onTemplateLoad('data_formatter')}
              className="px-3 py-1 bg-purple-600 text-white text-xs rounded hover:bg-purple-700 transition-colors"
            >
              📊 Data Formatter
            </button>
          </div>
          <p className="text-xs text-gray-500 italic">Click any template to auto-load code and parameters!</p>
        </div>
      </div>
    </div>
  );
} 