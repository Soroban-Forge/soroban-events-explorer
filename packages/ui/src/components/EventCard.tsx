import { decodeScValBase64, decodeTopics } from '../utils/soroban';
import JsonPayloadViewer from './JsonPayloadViewer';

interface EventCardProps {
  event: {
    id: string;
    contractId: string;
    topic: string;
    data: string;
    timestamp: string;
  };
  onCopy: (text: string, label: string) => void;
}

export default function EventCard({ event, onCopy }: EventCardProps) {
  // Decode topics and data payloads from base64 XDR to native JS structures
  const decodedTopics = decodeTopics(event.topic);
  const decodedData = decodeScValBase64(event.data);

  const formatContractId = (contractId: string) => {
    if (!contractId) return '';
    if (contractId.length > 16) {
      return `${contractId.substring(0, 8)}...${contractId.substring(contractId.length - 8)}`;
    }
    return contractId;
  };

  const formatEventId = (id: string) => {
    if (!id) return '';
    if (id.length > 16) {
      return `${id.substring(0, 8)}...${id.substring(id.length - 8)}`;
    }
    return id;
  };

  const formatDate = (isoString: string) => {
    try {
      const date = new Date(isoString);
      return date.toLocaleString();
    } catch {
      return isoString;
    }
  };

  return (
    <div className="bg-gray-800/80 backdrop-blur border border-gray-700/80 hover:border-blue-500/50 hover:shadow-lg hover:shadow-blue-500/5 transition-all duration-300 rounded-lg p-5 flex flex-col gap-4 font-mono">
      {/* Event Header with Metadata */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-700/60 pb-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Event ID Badge */}
          <span
            onClick={() => onCopy(event.id, 'Event ID')}
            className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded text-xs cursor-pointer hover:bg-emerald-500/20 hover:border-emerald-400/30 transition-all"
            title="Click to copy Event ID"
          >
            ID: {formatEventId(event.id)}
          </span>

          {/* Contract Address Badge */}
          {event.contractId && (
            <span
              onClick={() => onCopy(event.contractId, 'Contract ID')}
              className="bg-purple-500/10 text-purple-400 border border-purple-500/20 px-2 py-0.5 rounded text-xs cursor-pointer hover:bg-purple-500/20 hover:border-purple-400/30 transition-all"
              title="Click to copy Contract Address"
            >
              Contract: {formatContractId(event.contractId)}
            </span>
          )}
        </div>

        {/* Timestamp */}
        <span className="text-gray-400 text-xs">{formatDate(event.timestamp)}</span>
      </div>

      {/* Decoded Topics Badge List */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Topics</span>
        <div className="flex flex-wrap gap-2">
          {decodedTopics.length === 0 ? (
            <span className="text-gray-600 text-xs italic">No topics</span>
          ) : (
            decodedTopics.map((topic, index) => {
              const displayVal = typeof topic === 'object' ? JSON.stringify(topic) : String(topic);
              return (
                <span
                  key={index}
                  onClick={() => onCopy(displayVal, `Topic [${index}]`)}
                  className="bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2.5 py-0.5 rounded-full text-xs cursor-pointer hover:bg-amber-500/20 hover:border-amber-400/30 transition-all"
                  title="Click to copy topic value"
                >
                  {displayVal}
                </span>
              );
            })
          )}
        </div>
      </div>

      {/* Decoded Collapsible JSON Value Section */}
      <div className="flex flex-col gap-1.5">
        <span className="text-[10px] uppercase tracking-wider text-gray-500 font-bold">Data Payload</span>
        <div className="bg-gray-900/60 p-3 rounded border border-gray-800">
          <JsonPayloadViewer data={decodedData} onCopy={onCopy} />
        </div>
      </div>
    </div>
  );
}
