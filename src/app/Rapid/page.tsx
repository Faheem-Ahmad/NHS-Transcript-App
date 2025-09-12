// app/page.tsx
"use client";

import React, { useState } from "react";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

// Add interface for the prompt response
interface PromptResponse {
  id: string;
  type: string;
  keyword: string;
  content: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export default function Page() {
  const [model, setModel] = useState<string>("gpt-5");
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [responseText, setResponseText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [briefError, setBriefError] = useState<string>("");
  const [errorDetails, setErrorDetails] = useState<string>("");
  // Add loading state for prompt fetching
  const [loadingPrompt, setLoadingPrompt] = useState<boolean>(false);

  // Add function to handle prompt fetching
  async function handleFetchPrompt(keyword: string, type: string) {
    setLoadingPrompt(true);
    setBriefError(""); // Clear any previous errors

    try {
      const response = await fetch(
        `/api/prompts?keyword=${keyword}&type=${type}`
      );

      if (!response.ok) {
        const errorData = await response.json();
        setBriefError(
          errorData.error || `Failed to fetch prompt: ${response.status}`
        );
        return;
      }

      const promptData: PromptResponse = await response.json();

      // Set the fetched content to the system prompt textarea
      setSystemPrompt(promptData.content);
    } catch (error: any) {
      setBriefError(error.message || "Error fetching prompt");
      console.error("Error fetching prompt:", error);
    } finally {
      setLoadingPrompt(false);
    }
  }

  // ...existing code...
  async function handleGetResponse() {
    setBriefError("");
    setErrorDetails("");
    setResponseText("");
    setLoading(true);

    try {
      const payload = {
        model,
        systemPrompt: systemPrompt.trim(),
        userPrompt: userPrompt.trim(),
      };
      // await fetch("/api/chat" works only with gpt-4.1 and gpt-4o and gpt-5
      // const res = await fetch("/api/chat", {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        const concise =
          data?.errorDetails?.parsedError?.error?.message ||
          data?.errorDetails?.message ||
          data?.message ||
          `Request failed with status ${res.status}`;
        setBriefError(concise);

        const pretty = JSON.stringify(
          {
            status: res.status,
            statusText: res.statusText,
            ...(data?.errorDetails || data || {}),
          },
          null,
          2
        );
        setErrorDetails(pretty);
        return;
      }

      const content =
        data?.content ??
        data?.raw?.choices?.[0]?.message?.content ??
        data?.raw?.choices?.[0]?.delta?.content ??
        "";

      setResponseText(content);
    } catch (err: any) {
      setBriefError(err?.message || "Unexpected error.");
      setErrorDetails(
        JSON.stringify(
          {
            message: err?.message,
            stack: err?.stack,
            name: err?.name,
          },
          null,
          2
        )
      );
    } finally {
      setLoading(false);
    }
  }

  // ...existing utility functions...
  function handleClearResponse() {
    setResponseText("");
    setBriefError("");
  }

  function handleClearErrors() {
    setErrorDetails("");
    setBriefError("");
  }

  async function handleCopyResponse() {
    try {
      await navigator.clipboard.writeText(responseText || "");
    } catch {
      setBriefError("Could not copy response to clipboard.");
    }
  }

  async function handleCopyErrors() {
    try {
      await navigator.clipboard.writeText(errorDetails || "");
    } catch {
      setBriefError("Could not copy error details to clipboard.");
    }
  }

  return (
    <main className="min-h-screen w-full">
      {/* 3-column layout: 20% / 60% / 20% */}
      <div className="grid grid-cols-[20%_60%_20%] min-h-screen">
        {/* Left column - System Prompt Buttons */}
        <aside className="hidden md:block border-r border-gray-200 p-4 bg-gradient-to-b from-slate-50 to-white">
          <div className="space-y-3">
            <h3 className="text-lg font-semibold text-slate-700 mb-6 text-center border-b border-slate-200 pb-3">
              Actions
            </h3>

            {/* Interview Detailed Button - Updated with click handler */}
            <button
              onClick={() => handleFetchPrompt("interview-new", "Interview")}
              disabled={loadingPrompt}
              className="w-full text-left px-4 py-3 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 group disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700 group-hover:text-blue-700">
                  {loadingPrompt ? "Loading..." : "Interview Detailed"}
                </span>
                <svg
                  className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>

            {/* Rest of the buttons remain unchanged for now */}
            <button className="w-full text-left px-4 py-3 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 group">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700 group-hover:text-blue-700">
                  Interview Short
                </span>
                <svg
                  className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>

            {/* ...existing buttons remain unchanged... */}
            <button className="w-full text-left px-4 py-3 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 group">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700 group-hover:text-blue-700">
                  Mental State
                </span>
                <svg
                  className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>

            <button className="w-full text-left px-4 py-3 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 group">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700 group-hover:text-blue-700">
                  Day to Day Progress
                </span>
                <svg
                  className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>

            <button className="w-full text-left px-4 py-3 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 group">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700 group-hover:text-blue-700">
                  Overall Summary of Progress
                </span>
                <svg
                  className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>

            <button className="w-full text-left px-4 py-3 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 group">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700 group-hover:text-blue-700">
                  Risk Assessment
                </span>
                <svg
                  className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>

            <button className="w-full text-left px-4 py-3 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 group">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700 group-hover:text-blue-700">
                  Formulation
                </span>
                <svg
                  className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>

            <button className="w-full text-left px-4 py-3 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 group">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700 group-hover:text-blue-700">
                  Impression
                </span>
                <svg
                  className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>

            <button className="w-full text-left px-4 py-3 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 group">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700 group-hover:text-blue-700">
                  Plan
                </span>
                <svg
                  className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>

            <button className="w-full text-left px-4 py-3 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 group">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700 group-hover:text-blue-700">
                  Nature and Degree
                </span>
                <svg
                  className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>

            <button className="w-full text-left px-4 py-3 rounded-lg bg-white hover:bg-blue-50 border border-slate-200 hover:border-blue-300 shadow-sm hover:shadow-md transition-all duration-200 group">
              <div className="flex items-center justify-between">
                <span className="font-medium text-slate-700 group-hover:text-blue-700">
                  MHA Recommendation
                </span>
                <svg
                  className="w-4 h-4 text-slate-400 group-hover:text-blue-500 transition-colors"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          </div>
        </aside>

        {/* Middle column (ALL existing content goes here) - UNCHANGED */}
        <section className="p-4 md:p-6">
          {/* Top controls: Model select + Get response */}
          <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm font-semibold">Model:</span>
              <select
                value={model}
                onChange={(e) => setModel(e.target.value)}
                aria-label="Select GPT model"
                className="min-w-[220px] rounded-lg border border-gray-300 px-3 py-2 text-sm"
              >
                <option value="gpt-5">gpt-5</option>
                <option value="gpt-5-mini">gpt-5-mini</option>
                <option value="gpt-4.1">gpt-4.1</option>
                <option value="gpt-4o">gpt-4o</option>
              </select>
            </div>
            <div>
              <button
                onClick={handleGetResponse}
                disabled={loading}
                aria-busy={loading}
                className="rounded-lg border border-gray-900 bg-gray-900 px-4 py-2 font-semibold text-black disabled:opacity-70"
              >
                {loading ? "Getting response…" : "Get response"}
              </button>
            </div>
          </div>

          {/* System prompt textarea - UNCHANGED */}
          <section className="mb-6">
            <label className="mb-1 block text-sm font-semibold">
              System prompt
            </label>
            <textarea
              placeholder="Paste your system prompt here…"
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              className="min-h-[180px] w-full resize-y rounded-xl border border-gray-300 bg-white p-3 text-[15px] leading-relaxed text-white"
            />
            <p className="mt-1 ml-0.5 text-sm text-gray-500">
              This guides the assistant's overall behaviour.
            </p>
          </section>

          {/* ...rest of the middle column content remains exactly the same... */}
          {/* User prompt textarea */}
          <section className="mb-6">
            <label className="mb-1 block text-sm font-semibold">
              User prompt (Interview transcript)
            </label>
            <textarea
              placeholder="Paste the interview transcript (user prompt) here…"
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              className="min-h-[220px] w-full resize-y rounded-xl border border-gray-300 bg-white p-3 text-[15px] leading-relaxed text-black"
            />
            <p className="mt-1 ml-0.5 text-sm text-gray-500">
              This is sent as the user message.
            </p>
          </section>

          {/* Brief error line + response controls */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <button
              onClick={handleClearResponse}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-900"
            >
              Clear response
            </button>
            <button
              onClick={handleCopyResponse}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-900"
            >
              Copy response to clipboard
            </button>
            {briefError ? (
              <span className="text-sm font-semibold text-red-700">
                {briefError}
              </span>
            ) : null}
          </div>

          {/* Response textarea */}
          <section className="mb-6">
            <label className="mb-1 block text-sm font-semibold">Response</label>
            <textarea
              placeholder={
                loading
                  ? "Waiting for the model's response…"
                  : "Model response will appear here…"
              }
              value={responseText}
              onChange={(e) => setResponseText(e.target.value)}
              className="min-h-[260px] w-full resize-y rounded-xl border border-gray-300 bg-white p-3 text-[15px] leading-relaxed text-black"
            />
            <p className="mt-1 ml-0.5 text-sm text-gray-500">
              You can edit or paste into this area as well.
            </p>
          </section>

          {/* Error controls + error details */}
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <button
              onClick={handleClearErrors}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-900"
            >
              Clear errors
            </button>
            <button
              onClick={handleCopyErrors}
              className="rounded-lg border border-gray-300 bg-white px-4 py-2 font-semibold text-gray-900"
            >
              Copy errors to clipboard
            </button>
          </div>

          <section className="mb-6">
            <label className="mb-1 block text-sm font-semibold">
              Error details (if any)
            </label>
            <textarea
              placeholder="If the API cannot respond, detailed error information will appear here…"
              value={errorDetails}
              onChange={(e) => setErrorDetails(e.target.value)}
              className="min-h-[200px] w-full resize-y rounded-xl border border-gray-300 bg-white p-3 text-[15px] leading-relaxed text-black font-mono"
            />
            <p className="mt-1 ml-0.5 text-sm text-gray-500">
              Full diagnostics: status, headers, endpoint, payload summary, and
              any error JSON from the provider.
            </p>
          </section>
        </section>

        {/* Right column (empty/reserved) */}
        <aside className="hidden md:block border-l border-gray-200 p-4"></aside>
      </div>
    </main>
  );
}
