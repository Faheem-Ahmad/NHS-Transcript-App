//  const res = await fetch("/api/skip",
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
  const [language, setLanguage] = useState("en-gb");
  const [loading, setLoading] = useState(false);

  const [redactedText, setRedactedText] = useState("");
  const [entities, setEntities] = useState<Entity[]>([]);

  // toggles
  const [redactLocsOrgs, setRedactLocsOrgs] = useState(true);
  const [keepDates, setKeepDates] = useState(true);

  // allow-list textarea
  const [allowListText, setAllowListText] = useState("");

  // debug
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

  function parseAllowNames(input: string): string[] {
    return input
      .split(",")
      .map((s) => s.replace(/\s+/g, " ").trim())
      .filter(Boolean);
  }

  async function runAnonymize() {
    setLoading(true);
    setRedactedText("");
    setEntities([]);
    setLastError(null);
    setLastAzureError(null);
    setLastStatus(null);
    setLastRequestId(null);
    // aln
    const allowNames = parseAllowNames(allowListText);

    try {
      const res = await fetch("/api/skip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sourceText,
          language,
          redactLocationsAndOrgs: redactLocsOrgs,
          keepDates,
          allowNames, // ← comes from the textarea
        }),
      });

      setLastStatus(res.status);
      const raw = await res.text();

      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch (err) {
        setLastError("Response was not valid JSON");
        return;
      }

      if (!res.ok) {
        setLastRequestId(data?.requestId ?? null);
        setLastError(data?.error ?? "Request failed");
        setLastAzureError(data?.azureError ?? null);
        return;
      }

      setLastRequestId(data?.requestId ?? null);
      setRedactedText(data.redactedText ?? "");
      setEntities(Array.isArray(data.entities) ? data.entities : []);
    } catch (err: any) {
      setLastError(err?.message ?? "Network error");
    } finally {
      setLoading(false);
    }
  }

  async function copyToClipboard(text: string) {
    try {
      await navigator.clipboard.writeText(text);
      alert("Copied!");
    } catch {
      alert("Copy failed");
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold"> Anonymizer </h1>

      {/* Controls row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
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

        <div className="flex items-end gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={redactLocsOrgs}
              onChange={(e) => setRedactLocsOrgs(e.target.checked)}
            />
            L & O
          </label>

          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={keepDates}
              onChange={(e) => setKeepDates(e.target.checked)}
            />
            Keep dates
          </label>

          <button
            onClick={runAnonymize}
            disabled={loading || !sourceText.trim()}
            className="ml-auto rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
            title={
              !sourceText.trim()
                ? "Paste some text first"
                : "Send to anonymizer"
            }
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
      </div>

      {/* Allow-list textarea */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Person names to keep (comma-separated)
        </label>
        <textarea
          className="w-full min-h-[5rem] rounded border px-3 py-2"
          placeholder="e.g., David, Emma, Sarah, Tanvir"
          value={allowListText}
          onChange={(e) => setAllowListText(e.target.value)}
        />
        <p className="mt-1 text-xs text-gray-600">
          These names will be kept if the service tags them as{" "}
          <code>Person</code>.
        </p>
      </div>

      {/* Input textarea */}
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

      {/* Output textarea */}
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
        <div className="mt-2 flex gap-2">
          <button
            onClick={() => copyToClipboard(redactedText)}
            disabled={!redactedText}
            className="rounded border px-3 py-1 disabled:opacity-50"
          >
            Copy redacted text
          </button>
        </div>
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

      <p className="text-xs text-gray-500">
        This page posts to your <code>/api/anonymize</code> route. The server
        uses your Azure Language resource to redact PII. The allow-list applies
        only to entities tagged as <code>Person</code>.
      </p>
    </main>
  );
}
