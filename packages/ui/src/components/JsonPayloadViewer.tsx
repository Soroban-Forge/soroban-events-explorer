import React, { useState } from 'react';
import JsonView from '@uiw/react-json-view';
import { vscodeTheme } from '@uiw/react-json-view/vscode';

interface JsonPayloadViewerProps {
  data: any;
  onCopy?: (text: string, label: string) => void;
}

export const JsonPayloadViewer: React.FC<JsonPayloadViewerProps> = ({ data, onCopy }) => {
  const [collapsed, setCollapsed] = useState<number | boolean>(1);
  const [copied, setCopied] = useState(false);

  const handleCopyRaw = () => {
    const rawJson = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    if (onCopy) {
      onCopy(rawJson, 'Raw JSON Payload');
    } else if (navigator?.clipboard) {
      navigator.clipboard.writeText(rawJson);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleToggleExpandAll = () => {
    setCollapsed((prev) => (prev === false ? 1 : false));
  };

  const renderClickableValue = (props: any, rawValue: any) => {
    const stringified = typeof rawValue === 'bigint' ? rawValue.toString() : String(rawValue);
    return (
      <span
        {...props}
        onClick={(e) => {
          e.stopPropagation();
          if (onCopy) {
            onCopy(stringified, 'JSON value');
          } else if (navigator?.clipboard) {
            navigator.clipboard.writeText(stringified);
          }
        }}
        className="cursor-pointer hover:underline hover:text-blue-400 font-semibold transition-colors"
        title="Click to copy value"
      >
        {props.children}
      </span>
    );
  };

  if (data === null || data === undefined) {
    return <span className="text-gray-500 italic font-mono text-sm">null</span>;
  }

  if (typeof data !== 'object') {
    return (
      <span
        onClick={() => {
          if (onCopy) {
            onCopy(String(data), 'Payload');
          } else if (navigator?.clipboard) {
            navigator.clipboard.writeText(String(data));
          }
        }}
        className="text-blue-300 font-semibold cursor-pointer hover:underline hover:text-blue-400 transition-all font-mono text-sm"
        title="Click to copy payload"
      >
        {String(data)}
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-2 w-full">
      <div className="flex items-center justify-between gap-2 border-b border-gray-800 pb-2 text-xs text-gray-400">
        <span className="font-semibold text-gray-300">Payload Tree</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleToggleExpandAll}
            className="px-2 py-0.5 rounded bg-gray-800 hover:bg-gray-700 text-gray-300 hover:text-white border border-gray-700 transition-colors"
            title={collapsed === false ? 'Collapse nested objects' : 'Expand all nested objects'}
          >
            {collapsed === false ? 'Collapse All' : 'Expand All'}
          </button>
          <button
            type="button"
            onClick={handleCopyRaw}
            className="px-2 py-0.5 rounded bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 transition-colors"
            title="Copy entire JSON payload"
          >
            {copied ? 'Copied!' : 'Copy Raw'}
          </button>
        </div>
      </div>
      <div className="max-h-[350px] overflow-y-auto overflow-x-auto text-left font-mono text-sm">
        <JsonView
          value={data}
          style={{ ...vscodeTheme, background: 'transparent' }}
          collapsed={collapsed}
        >
          <JsonView.String render={(props, { value }) => renderClickableValue(props, value)} />
          <JsonView.Int render={(props, { value }) => renderClickableValue(props, value)} />
          <JsonView.Float render={(props, { value }) => renderClickableValue(props, value)} />
          <JsonView.Bigint render={(props, { value }) => renderClickableValue(props, value)} />
          <JsonView.True render={(props) => renderClickableValue(props, true)} />
          <JsonView.False render={(props) => renderClickableValue(props, false)} />
          <JsonView.Null render={(props) => renderClickableValue(props, null)} />
        </JsonView>
      </div>
    </div>
  );
};

export default JsonPayloadViewer;
