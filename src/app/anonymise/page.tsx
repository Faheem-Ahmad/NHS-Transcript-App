"use client";

import React, { useMemo, useState } from "react";

type Entity = {
  text: string;
  category: string;
  subCategory?: string;
  confidenceScore?: number;
  offset?: number;
  length?: number;
};

export default function AnonymizePage() {
  const [sourceText, setSourceText] = useState("");
  const [language, setLanguage] = useState("en");
  const [loading, setLoading] = useState(false);

  const [redactedText, setRedactedText] = useState("");
  const [entities, setEntities] = useState<Entity[]>([]);

  // debug state
  const [debugOpen, setDebugOpen] = useState(true);
  const [lastRequestId, setLastRequestId] = useState<string | null>(null);
  const [lastStatus, setLastStatus] = useState<number | null>(null);
  const [lastError, setLastError] = useState<string | null>(null);
  const [lastAzureError, setLastAzureError] = useState<any>(null);

  const entitySummary = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of entities)
      counts.set(e.category, (counts.get(e.category) ?? 0) + 1);
    return Array.from(counts.entries())
      .map(([k, v]) => `${k}: ${v}`)
      .join("  ·  ");
  }, [entities]);

  async function runAnonymize() {
    setLoading(true);
    setRedactedText("");
    setEntities([]);
    setLastError(null);
    setLastAzureError(null);
    setLastStatus(null);
    setLastRequestId(null);

    console.debug("[ui] POST /api/anonymize", {
      language,
      textLength: sourceText.length,
    });

    try {
      const res = await fetch("/api/anonymize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: sourceText, language }),
      });

      setLastStatus(res.status);

      // Read text first so we can diagnose JSON parse errors
      const raw = await res.text();
      console.debug("[ui] /api/anonymize raw response", raw.slice(0, 500));

      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch (err) {
        setLastError("Response was not valid JSON");
        console.error("[ui] JSON parse error", err);
        return;
      }

      if (!res.ok) {
        setLastRequestId(data?.requestId ?? null);
        setLastError(data?.error ?? "Request failed");
        setLastAzureError(data?.azureError ?? null);
        console.error("[ui] API error", { status: res.status, data });
        return;
      }

      setLastRequestId(data?.requestId ?? null);
      setRedactedText(data.redactedText ?? "");
      setEntities(Array.isArray(data.entities) ? data.entities : []);
      console.debug("[ui] success", {
        entities: (data.entities || []).length,
        redactedLength: (data.redactedText || "").length,
      });
    } catch (err: any) {
      setLastError(err?.message ?? "Network error");
      console.error("[ui] fetch error", err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">
        PII Anonymizer (Azure Language)
      </h1>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="block text-sm font-medium mb-1">Language</label>
          <select
            className="w-full rounded border px-3 py-2"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option value="en">English (en)</option>
            <option value="en-gb">English UK (en-gb)</option>
          </select>
        </div>

        <button
          onClick={runAnonymize}
          disabled={loading || !sourceText.trim()}
          className="rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
        >
          {loading ? "Anonymizing…" : "Anonymize"}
        </button>

        <button
          onClick={() => setDebugOpen((v) => !v)}
          className="rounded border px-3 py-2"
          title="Toggle debug panel"
        >
          {debugOpen ? "Hide debug" : "Show debug"}
        </button>
      </div>

      {/* Input */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Input (raw transcript)
        </label>
        <textarea
          className="w-full min-h-[12rem] rounded border px-3 py-2 font-mono"
          placeholder="Paste transcript here…"
          value={sourceText}
          onChange={(e) => setSourceText(e.target.value)}
        />
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => setSourceText("")}
            className="rounded border px-3 py-1"
          >
            Clear
          </button>
        </div>
      </div>

      {/* Output */}
      <div>
        <div className="flex items-center justify-between">
          <label className="block text-sm font-medium mb-1">
            Output (redacted)
          </label>
          <div className="text-xs text-gray-600">
            {entities.length > 0 && entitySummary}
          </div>
        </div>
        <textarea
          readOnly
          className="w-full min-h-[12rem] rounded border px-3 py-2 font-mono bg-gray-50"
          value={redactedText}
          placeholder="Redacted text will appear here…"
        />
      </div>

      {/* Debug panel */}
      {debugOpen && (
        <div className="rounded border p-3 text-sm">
          <div className="font-medium mb-2">Debug</div>
          <div>Status: {lastStatus ?? "—"}</div>
          <div>Request ID: {lastRequestId ?? "—"}</div>
          {lastError && (
            <div className="mt-2 text-red-700">
              <div className="font-medium">Error</div>
              <pre className="whitespace-pre-wrap break-words">{lastError}</pre>
            </div>
          )}
          {lastAzureError && (
            <div className="mt-2">
              <div className="font-medium">Azure error details</div>
              <pre className="whitespace-pre-wrap break-words bg-gray-50 p-2 rounded">
                {typeof lastAzureError === "string"
                  ? lastAzureError
                  : JSON.stringify(lastAzureError, null, 2)}
              </pre>
            </div>
          )}
        </div>
      )}
    </main>
  );
}
