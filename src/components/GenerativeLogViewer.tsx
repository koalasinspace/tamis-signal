import React, { useState, useEffect } from "react";
import { collection, query, orderBy, limit, onSnapshot, Timestamp } from "firebase/firestore";
import { db } from "../lib/firebase";
import type { GenerativeLogEntry } from "../lib/generativeLogger";
import { Copy, ChevronDown, ChevronUp, Filter } from "lucide-react";

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
      case "success": return "text-success";
      case "error": return "text-danger";
      case "validation_failed": return "text-warning";
      default: return "text-slate-400";
    }
  };

  return (
    <div className="mt-4 p-4 rounded-2xl border border-purple-500 border-opacity-30 bg-slate-900 bg-opacity-70 backdrop-blur shadow-sm">
      <div className="d-flex align-items-start justify-content-between gap-3 mb-4">
        <div>
          <h3 className="font-serif fs-5 text-slate-200 d-flex align-items-center gap-2">
            <Filter size={18} />
            Generative Logs
          </h3>
          <p className="small font-mono text-slate-400 mt-1" style={{ fontSize: '10px' }}>
            Debug Daily Truth & Guidance generation
          </p>
        </div>
        <div className="small font-mono text-purple-400" style={{ fontSize: '10px' }}>
          {filteredLogs.length} / {logs.length} logs
        </div>
      </div>

      <div className="d-flex flex-wrap gap-3 mb-4">
        <div className="d-flex align-items-center gap-2">
          <label className="small font-mono text-slate-500" style={{ fontSize: '10px' }}>Type:</label>
          <select value={filterType} onChange={(e) => setFilterType(e.target.value as any)} className="form-select form-select-sm bg-slate-950 border-purple-500 border-opacity-40 text-slate-200 small font-mono">
            <option value="all">All</option>
            <option value="dailyTruth">Daily Truth</option>
            <option value="guidance">Guidance</option>
          </select>
        </div>

        <div className="d-flex align-items-center gap-2">
          <label className="small font-mono text-slate-500" style={{ fontSize: '10px' }}>Status:</label>
          <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value as any)} className="form-select form-select-sm bg-slate-950 border-purple-500 border-opacity-40 text-slate-200 small font-mono">
            <option value="all">All</option>
            <option value="success">Success</option>
            <option value="error">Error</option>
            <option value="validation_failed">Validation Failed</option>
          </select>
        </div>

        <div className="d-flex align-items-center gap-2">
          <label className="small font-mono text-slate-500" style={{ fontSize: '10px' }}>Limit:</label>
          <select value={maxLogs} onChange={(e) => setMaxLogs(Number(e.target.value))} className="form-select form-select-sm bg-slate-950 border-purple-500 border-opacity-40 text-slate-200 small font-mono">
            <option value={25}>25</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="alert alert-danger p-2 small mb-4">
          Error: {error}
        </div>
      )}

      <div className="d-grid gap-2 overflow-auto" style={{ maxHeight: '600px' }}>
        {filteredLogs.length === 0 && !error ? (
          <div className="text-center py-5 text-slate-500 small font-mono">
            No logs found.
          </div>
        ) : (
          filteredLogs.map((log) => {
            const isExpanded = expandedLogs.has(log.id || "");
            return (
              <div key={log.id} className="p-3 rounded border border-purple-500 border-opacity-25 bg-slate-800 bg-opacity-40">
                <div className="d-flex align-items-start justify-content-between gap-3">
                  <div className="flex-fill min-w-0">
                    <div className="d-flex align-items-center gap-2 mb-2">
                      <span className={`small font-mono font-bold ${getStatusColor(log.status)}`} style={{ fontSize: '10px' }}>
                        {log.status.toUpperCase()}
                      </span>
                      <span className="small font-mono text-slate-400" style={{ fontSize: '10px' }}>{log.requestType}</span>
                      <span className="small font-mono text-slate-500" style={{ fontSize: '9px' }}>{formatTimestamp(log.timestamp)}</span>
                    </div>

                    {isExpanded && (
                      <div className="mt-3 d-grid gap-2">
                        <div>
                          <div className="d-flex align-items-center justify-content-between mb-1">
                            <div className="small font-mono text-slate-500" style={{ fontSize: '9px' }}>Response:</div>
                            <button onClick={() => copyToClipboard(log.response || "")} className="btn btn-sm btn-link text-purple-400 p-0 text-decoration-none small font-mono" style={{ fontSize: '9px' }}>Copy</button>
                          </div>
                          <div className="small text-slate-300 bg-slate-950 p-2 rounded border border-purple-500 border-opacity-20" style={{ fontSize: '11px' }}>{log.response}</div>
                        </div>
                        <div>
                          <div className="small font-mono text-slate-500" style={{ fontSize: '9px' }}>Prompt:</div>
                          <pre className="small text-slate-400 bg-slate-950 p-2 rounded border border-purple-500 border-opacity-20 overflow-auto" style={{ fontSize: '10px', maxHeight: '200px' }}>{log.prompt}</pre>
                        </div>
                      </div>
                    )}
                  </div>
                  <button onClick={() => log.id && toggleExpand(log.id)} className="btn btn-sm btn-link text-slate-500 p-0 text-decoration-none">
                    {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
