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
  const [redactLocsOrgs, setRedactLocsOrgs] = useState(true);
  const [keepDates, setKeepDates] = useState(true);

  const [allowListText, setAllowListText] = useState("");

  const [loadingAnon, setLoadingAnon] = useState(false);
  const [loadingProcess, setLoadingProcess] = useState(false);

  const [redactedText, setRedactedText] = useState("");
  const [entities, setEntities] = useState<Entity[]>([]);

  const [llmOutput, setLlmOutput] = useState("");

  // debug for anonymize
  const [debugOpen, setDebugOpen] = useState(true);
  const [lastAnonStatus, setLastAnonStatus] = useState<number | null>(null);
  const [lastAnonReqId, setLastAnonReqId] = useState<string | null>(null);
  const [lastAnonError, setLastAnonError] = useState<string | null>(null);
  const [lastAnonAzureError, setLastAnonAzureError] = useState<any>(null);

  // debug for process/OpenAI
  const [lastProcStatus, setLastProcStatus] = useState<number | null>(null);
  const [lastProcReqId, setLastProcReqId] = useState<string | null>(null);
  const [lastProcError, setLastProcError] = useState<string | null>(null);
  const [lastProcAzureError, setLastProcAzureError] = useState<any>(null);

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
    setLoadingAnon(true);
    setRedactedText("");
    setEntities([]);
    setLlmOutput("");
    setLastAnonError(null);
    setLastAnonAzureError(null);
    setLastAnonStatus(null);
    setLastAnonReqId(null);

    const allowNames = parseAllowNames(allowListText);

    try {
      const res = await fetch("/api/anonymize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: sourceText,
          language,
          redactLocationsAndOrgs: redactLocsOrgs,
          keepDates,
          allowNames,
        }),
      });

      setLastAnonStatus(res.status);
      const raw = await res.text();

      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        setLastAnonError("Response was not valid JSON");
        return;
      }

      if (!res.ok) {
        setLastAnonReqId(data?.requestId ?? null);
        setLastAnonError(data?.error ?? "Request failed");
        setLastAnonAzureError(data?.azureError ?? null);
        return;
      }

      setLastAnonReqId(data?.requestId ?? null);
      setRedactedText(data.redactedText ?? "");
      setEntities(Array.isArray(data.entities) ? data.entities : []);
    } catch (err: any) {
      setLastAnonError(err?.message ?? "Network error");
    } finally {
      setLoadingAnon(false);
    }
  }

  async function runProcess() {
    setLoadingProcess(true);
    setLlmOutput("");
    setLastProcError(null);
    setLastProcAzureError(null);
    setLastProcStatus(null);
    setLastProcReqId(null);

    try {
      const res = await fetch("/api/azureai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          redactedText,
          // optional: override system prompt or temperature here
          // system: "You are a clinical notes assistant...",
          // temperature: 0.2,
        }),
      });

      setLastProcStatus(res.status);
      const raw = await res.text();
      let data: any = null;
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch {
        setLastProcError("Response was not valid JSON");
        return;
      }

      if (!res.ok) {
        setLastProcReqId(data?.requestId ?? null);
        setLastProcError(data?.error ?? "Request failed");
        setLastProcAzureError(data?.azureError ?? null);
        return;
      }

      setLastProcReqId(data?.requestId ?? null);
      setLlmOutput(data?.content ?? "");
    } catch (err: any) {
      setLastProcError(err?.message ?? "Network error");
    } finally {
      setLoadingProcess(false);
    }
  }

  async function cutToClipboard() {
    try {
      await navigator.clipboard.writeText(llmOutput);
      setLlmOutput("");
      alert("Cut to clipboard.");
    } catch {
      alert("Clipboard failed.");
    }
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">
        Anonymise → Process (stateless)
      </h1>

      {/* Controls */}
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
            Also remove Locations & Organizations
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
            disabled={loadingAnon || !sourceText.trim()}
            className="ml-auto rounded bg-blue-600 px-4 py-2 text-white disabled:opacity-50"
          >
            {loadingAnon ? "Anonymizing…" : "Anonymize"}
          </button>
        </div>
      </div>

      {/* Allow-list names */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Person names to keep (comma-separated)
        </label>
        <textarea
          className="w-full min-h-[5rem] rounded border px-3 py-2"
          placeholder="e.g., David, Emma, Sarah, Alison"
          value={allowListText}
          onChange={(e) => setAllowListText(e.target.value)}
        />
        <p className="mt-1 text-xs text-gray-600">
          Names kept only if the service tags them as <code>Person</code>.
        </p>
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

      {/* Redacted Output + Process button */}
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
            onClick={runProcess}
            disabled={loadingProcess || !redactedText.trim()}
            className="rounded bg-emerald-600 px-4 py-2 text-white disabled:opacity-50"
            title={
              !redactedText.trim()
                ? "Anonymize first"
                : "Send anonymized text to Azure OpenAI"
            }
          >
            {loadingProcess ? "Processing…" : "Process"}
          </button>
        </div>
      </div>

      {/* LLM Output + Cut */}
      <div>
        <label className="block text-sm font-medium mb-1">
          Azure OpenAI Response
        </label>
        <textarea
          readOnly
          className="w-full min-h-[12rem] rounded border px-3 py-2 font-mono bg-gray-50"
          value={llmOutput}
          placeholder="Response will appear here after you click Process…"
        />
        <div className="mt-2 flex gap-2">
          <button
            onClick={cutToClipboard}
            disabled={!llmOutput}
            className="rounded border px-3 py-1 disabled:opacity-50"
            title="Copy to clipboard and clear"
          >
            Cut
          </button>
        </div>
      </div>

      {/* Debug */}
      {debugOpen && (
        <div className="rounded border p-3 text-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="font-medium">Debug</div>
            <button
              onClick={() => setDebugOpen(false)}
              className="rounded border px-2 py-1"
            >
              Hide
            </button>
          </div>

          <div>
            <div className="font-medium">Anonymize</div>
            <div>Status: {lastAnonStatus ?? "—"}</div>
            <div>Request ID: {lastAnonReqId ?? "—"}</div>
            {lastAnonError && (
              <>
                <div className="text-red-700 mt-1">Error</div>
                <pre className="whitespace-pre-wrap break-words bg-red-50 p-2 rounded">
                  {lastAnonError}
                </pre>
              </>
            )}
            {lastAnonAzureError && (
              <>
                <div className="mt-1">Azure error details</div>
                <pre className="whitespace-pre-wrap break-words bg-gray-50 p-2 rounded">
                  {typeof lastAnonAzureError === "string"
                    ? lastAnonAzureError
                    : JSON.stringify(lastAnonAzureError, null, 2)}
                </pre>
              </>
            )}
          </div>

          <div>
            <div className="font-medium">Process (Azure OpenAI)</div>
            <div>Status: {lastProcStatus ?? "—"}</div>
            <div>Request ID: {lastProcReqId ?? "—"}</div>
            {lastProcError && (
              <>
                <div className="text-red-700 mt-1">Error</div>
                <pre className="whitespace-pre-wrap break-words bg-red-50 p-2 rounded">
                  {lastProcError}
                </pre>
              </>
            )}
            {lastProcAzureError && (
              <>
                <div className="mt-1">Azure error details</div>
                <pre className="whitespace-pre-wrap break-words bg-gray-50 p-2 rounded">
                  {typeof lastProcAzureError === "string"
                    ? lastProcAzureError
                    : JSON.stringify(lastProcAzureError, null, 2)}
                </pre>
              </>
            )}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500">
        This app is stateless: it doesn’t store patient data. All calls are
        server-side over HTTPS. Avoid logging raw transcripts; use request IDs
        and lengths only.
      </p>
    </main>
  );
}
