import React, { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { GenerativeLogEntry } from "../lib/generativeLogger";
import { Copy, ChevronDown, ChevronUp, Filter, X } from "lucide-react";

export default function GenerativeLogViewer() {
  const [logs, setLogs] = useState<GenerativeLogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<GenerativeLogEntry[]>([]);
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<"all" | "dailyTruth" | "guidance">("all");
  const [filterStatus, setFilterStatus] = useState<"all" | "success" | "error" | "validation_failed">("all");
  const [maxLogs, setMaxLogs] = useState(50);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    try {
      const logsRef = collection(db, "artifacts", "tamis-signal-v2", "public", "data", "generativeLogs");
      const q = query(logsRef, orderBy("timestamp", "desc"), limit(maxLogs));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          const logData: GenerativeLogEntry[] = [];
          snapshot.forEach((doc) => {
            logData.push({ id: doc.id, ...doc.data() } as GenerativeLogEntry);
          });
          setLogs(logData);
          setError(null);
        },
        (err) => {
          console.error("[GenerativeLogViewer] Firestore error:", err);
          setError(err.message || "Failed to load logs");
        }
      );

      return () => unsubscribe();
    } catch (err: any) {
      console.error("[GenerativeLogViewer] Setup error:", err);
      setError(err.message || "Failed to initialize log viewer");
    }
  }, [maxLogs]);

  useEffect(() => {
    let filtered = [...logs];

    if (filterType !== "all") {
      filtered = filtered.filter((log) => log.requestType === filterType);
    }

    if (filterStatus !== "all") {
      filtered = filtered.filter((log) => log.status === filterStatus);
    }

    setFilteredLogs(filtered);
  }, [logs, filterType, filterStatus]);

  const toggleExpand = (logId: string) => {
    const newExpanded = new Set(expandedLogs);
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId);
    } else {
      newExpanded.add(logId);
    }
    setExpandedLogs(newExpanded);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard?.writeText(text);
  };

  const formatTimestamp = (timestamp: Timestamp | undefined) => {
    if (!timestamp) return "—";
    const date = timestamp.toDate();
    return date.toLocaleString();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "success":
        return "text-green-400";
      case "error":
        return "text-red-400";
      case "validation_failed":
        return "text-yellow-400";
      default:
        return "text-slate-400";
    }
  };

  return (
    <div className="mt-6 p-6 rounded-2xl border border-[#533483]/30 bg-[#0f0f1a]/70 backdrop-blur shadow-lg shadow-purple-900/20">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h3 className="font-serif text-lg text-[#e2e8f0] flex items-center gap-2">
            <Filter size={18} />
            Generative Logs
          </h3>
          <p className="text-xs font-mono text-[#e2e8f0]/60 mt-1">
            Debug Daily Truth & Guidance generation
          </p>
        </div>
        <div className="text-xs font-mono text-[#d946ef]">
          {filteredLogs.length} / {logs.length} logs
        </div>
      </div>

      {/* Debug info */}
      <div className="mb-3 p-2 rounded bg-[#1a1a2e]/40 border border-[#533483]/20 text-xs font-mono text-[#e2e8f0]/60">
        Component loaded. Listening at: artifacts/tamis-signal-v2/public/data/generativeLogs
        <br />
        Status: {error ? `ERROR: ${error}` : `${logs.length} raw logs loaded`}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-[#e2e8f0]/60">Type:</label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value as any)}
            className="px-3 py-1 rounded-lg bg-[#1a1a2e]/60 border border-[#533483]/40 text-[#e2e8f0] text-xs font-mono focus:outline-none focus:border-[#d946ef]/60"
          >
            <option value="all">All</option>
            <option value="dailyTruth">Daily Truth</option>
            <option value="guidance">Guidance</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-[#e2e8f0]/60">Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="px-3 py-1 rounded-lg bg-[#1a1a2e]/60 border border-[#533483]/40 text-[#e2e8f0] text-xs font-mono focus:outline-none focus:border-[#d946ef]/60"
          >
            <option value="all">All</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="validation_failed">Validation Failed</option>
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-mono text-[#e2e8f0]/60">Limit:</label>
          <select
            value={maxLogs}
            onChange={(e) => setMaxLogs(Number(e.target.value))}
            className="px-3 py-1 rounded-lg bg-[#1a1a2e]/60 border border-[#533483]/40 text-[#e2e8f0] text-xs font-mono focus:outline-none focus:border-[#d946ef]/60"
          >
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 rounded-xl bg-red-950/20 border border-red-500/30">
          <div className="text-xs font-mono text-red-400">Error: {error}</div>
        </div>
      )}

      {/* Logs List */}
      <div className="space-y-2 max-h-[600px] overflow-y-auto">
        {filteredLogs.length === 0 && !error ? (
          <div className="text-center py-8 text-[#e2e8f0]/40 text-sm font-mono">
            No logs found. Generate a Daily Truth or ask for Guidance to create logs.
          </div>
        ) : filteredLogs.length > 0 ? (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogs.has(log.id || "");
            return (
              <div
                key={log.id}
                className="p-4 rounded-xl border border-[#533483]/25 bg-[#1a1a2e]/40 hover:bg-[#1a1a2e]/60 transition-colors"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-xs font-mono font-semibold ${getStatusColor(log.status)}`}>
                        {log.status.toUpperCase()}
                      </span>
                      <span className="text-xs font-mono text-[#e2e8f0]/60">
                        {log.requestType}
                      </span>
                      <span className="text-xs font-mono text-[#e2e8f0]/40">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      {log.duration && (
                        <span className="text-xs font-mono text-[#e2e8f0]/40">
                          {log.duration}ms
                        </span>
                      )}
                    </div>

                    {log.status === "error" && log.error && (
                      <div className="mb-2 p-2 rounded bg-red-950/20 border border-red-500/30">
                        <div className="text-xs font-mono text-red-400">
                          Error: {log.error.message}
                        </div>
                        {log.error.code && (
                          <div className="text-xs font-mono text-red-400/60 mt-1">
                            Code: {log.error.code}
                          </div>
                        )}
                      </div>
                    )}

                    {log.status === "validation_failed" && log.metadata.missingFields && (
                      <div className="mb-2 p-2 rounded bg-yellow-950/20 border border-yellow-500/30">
                        <div className="text-xs font-mono text-yellow-400">
                          Missing fields: {log.metadata.missingFields.join(", ")}
                        </div>
                      </div>
                    )}

                    {log.response && (
                      <div className="mb-2">
                        <div className="text-xs font-mono text-[#e2e8f0]/60 mb-1">Response:</div>
                        <div className="text-sm text-[#e2e8f0] bg-[#0f0f1a]/50 p-2 rounded border border-[#533483]/20">
                          {log.response.substring(0, isExpanded ? log.response.length : 200)}
                          {log.response.length > 200 && !isExpanded && "..."}
                        </div>
                        {log.responseLength && (
                          <div className="text-xs font-mono text-[#e2e8f0]/40 mt-1">
                            {log.responseLength} chars
                          </div>
                        )}
                      </div>
                    )}

                    {isExpanded && (
                      <div className="mt-3 space-y-3">
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <div className="text-xs font-mono text-[#e2e8f0]/60">Prompt:</div>
                            <button
                              onClick={() => copyToClipboard(log.prompt)}
                              className="text-xs font-mono text-[#d946ef] hover:text-[#e2e8f0] flex items-center gap-1"
                            >
                              <Copy size={12} />
                              Copy
                            </button>
                          </div>
                          <div className="text-xs text-[#e2e8f0]/80 bg-[#0f0f1a]/50 p-2 rounded border border-[#533483]/20 font-mono whitespace-pre-wrap break-words">
                            {log.prompt}
                          </div>
                          <div className="text-xs font-mono text-[#e2e8f0]/40 mt-1">
                            {log.promptLength} chars
                          </div>
                        </div>

                        {log.metadata.query && (
                          <div>
                            <div className="text-xs font-mono text-[#e2e8f0]/60 mb-1">User Query:</div>
                            <div className="text-xs text-[#e2e8f0] bg-[#0f0f1a]/50 p-2 rounded border border-[#533483]/20">
                              {log.metadata.query}
                            </div>
                          </div>
                        )}

                        <div>
                          <div className="text-xs font-mono text-[#e2e8f0]/60 mb-1">Soulprint:</div>
                          <div className="text-xs text-[#e2e8f0]/80 bg-[#0f0f1a]/50 p-2 rounded border border-[#533483]/20 font-mono">
                            {Object.entries(log.metadata.userSoulprint)
                              .filter(([_, v]) => v)
                              .map(([k, v]) => `${k}: ${v}`)
                              .join(", ")}
                          </div>
                        </div>

                        {log.model && (
                          <div className="text-xs font-mono text-[#e2e8f0]/60">
                            Model: {log.model} | Max Tokens: {log.maxOutputTokens || "—"}
                          </div>
                        )}

                        {log.error?.details && (
                          <div>
                            <div className="text-xs font-mono text-[#e2e8f0]/60 mb-1">Error Details:</div>
                            <div className="text-xs text-[#e2e8f0]/80 bg-red-950/20 p-2 rounded border border-red-500/30 font-mono whitespace-pre-wrap break-words">
                              {JSON.stringify(log.error.details, null, 2)}
                            </div>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2">
                    {log.response && (
                      <button
                        onClick={() => copyToClipboard(log.response || "")}
                        className="p-1 rounded hover:bg-[#533483]/30 transition-colors"
                        title="Copy response"
                      >
                        <Copy size={14} className="text-[#e2e8f0]/60" />
                      </button>
                    )}
                    <button
                      onClick={() => log.id && toggleExpand(log.id)}
                      className="p-1 rounded hover:bg-[#533483]/30 transition-colors"
                      title={isExpanded ? "Collapse" : "Expand"}
                    >
                      {isExpanded ? (
                        <ChevronUp size={14} className="text-[#e2e8f0]/60" />
                      ) : (
                        <ChevronDown size={14} className="text-[#e2e8f0]/60" />
                      )}
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        ) : null}
      </div>
    </div>
  );
}
