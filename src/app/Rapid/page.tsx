// app/page.tsx
"use client";

import React, { useState } from "react";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export default function Page() {
  const [model, setModel] = useState<string>("gpt-5");
  const [systemPrompt, setSystemPrompt] = useState<string>("");
  const [userPrompt, setUserPrompt] = useState<string>("");
  const [responseText, setResponseText] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [briefError, setBriefError] = useState<string>("");
  const [errorDetails, setErrorDetails] = useState<string>("");

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

      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok || !data?.ok) {
        // Prefer a concise, human-readable error on top,
        // and full details in the 4th textarea.
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

  // Simple inline styles
  const containerStyle: React.CSSProperties = {
    maxWidth: 1100,
    margin: "40px auto",
    padding: "0 16px",
  };

  const topBarStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    justifyContent: "space-between",
    marginBottom: 8,
    flexWrap: "wrap",
  };

  const leftStackStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 10,
    flexWrap: "wrap",
  };

  const labelStyle: React.CSSProperties = {
    fontSize: 14,
    fontWeight: 600,
  };

  const selectStyle: React.CSSProperties = {
    padding: "10px 12px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    fontSize: 14,
    minWidth: 220,
  };

  const buttonPrimary: React.CSSProperties = {
    padding: "10px 16px",
    borderRadius: 8,
    border: "1px solid #111827",
    background: "#111827",
    color: "white",
    fontWeight: 600,
    cursor: "pointer",
  };

  const buttonSecondary: React.CSSProperties = {
    padding: "8px 14px",
    borderRadius: 8,
    border: "1px solid #d1d5db",
    background: "white",
    color: "#111827",
    fontWeight: 600,
    cursor: "pointer",
  };

  const controlRowStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
    flexWrap: "wrap",
  };

  const sectionStyle: React.CSSProperties = {
    marginBottom: 24,
  };

  const systemPromptAreaStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    padding: 14,
    fontSize: 15,
    lineHeight: 1.5,
    resize: "vertical",
    boxSizing: "border-box",
    background: "white",
    color: "white",
    //color influences the text color
  };
  const textareaStyle: React.CSSProperties = {
    width: "100%",
    borderRadius: 10,
    border: "1px solid #d1d5db",
    padding: 14,
    fontSize: 15,
    lineHeight: 1.5,
    resize: "vertical",
    boxSizing: "border-box",
    background: "white",
    color: "black",
  };

  const hintStyle: React.CSSProperties = {
    fontSize: 13,
    color: "#6b7280",
    margin: "6px 0 0 2px",
  };

  const errorStyle: React.CSSProperties = {
    marginTop: 4,
    color: "#b91c1c",
    fontSize: 14,
    fontWeight: 600,
  };

  return (
    <main style={containerStyle}>
      {/* Top controls: Model select + Get response */}
      <div style={topBarStyle}>
        <div style={leftStackStyle}>
          <span style={labelStyle}>Model:</span>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            style={selectStyle}
            aria-label="Select GPT model"
          >
            <option value="gpt-5">gpt-5</option>
            <option value="gpt-5-mini">gpt-5-mini</option>
            <option value="gpt-4.1">gpt-4.1</option>
            <option value="gpt-4o">gpt-4o</option>
          </select>
        </div>
        <div>
          <button
            style={buttonPrimary}
            onClick={handleGetResponse}
            disabled={loading}
            aria-busy={loading}
          >
            {loading ? "Getting response…" : "Get response"}
          </button>
        </div>
      </div>

      {/* System prompt textarea */}
      <section style={sectionStyle}>
        <label style={labelStyle}>System prompt</label>
        <textarea
          style={{ ...systemPromptAreaStyle, minHeight: 180 }}
          placeholder="Paste your system prompt here…"
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
        />
        <p style={hintStyle}>This guides the assistant’s overall behaviour.</p>
      </section>

      {/* User prompt textarea */}
      <section style={sectionStyle}>
        <label style={labelStyle}>User prompt (Interview transcript)</label>
        <textarea
          style={{ ...textareaStyle, minHeight: 220 }}
          placeholder="Paste the interview transcript (user prompt) here…"
          value={userPrompt}
          onChange={(e) => setUserPrompt(e.target.value)}
        />
        <p style={hintStyle}>This is sent as the user message.</p>
      </section>

      {/* Brief error line + response controls */}
      <div style={controlRowStyle}>
        <button style={buttonSecondary} onClick={handleClearResponse}>
          Clear response
        </button>
        <button style={buttonSecondary} onClick={handleCopyResponse}>
          Copy response to clipboard
        </button>
        {briefError ? <span style={errorStyle}>{briefError}</span> : null}
      </div>

      {/* Response textarea */}
      <section style={sectionStyle}>
        <label style={labelStyle}>Response</label>
        <textarea
          style={{ ...textareaStyle, minHeight: 260 }}
          placeholder={
            loading
              ? "Waiting for the model’s response…"
              : "Model response will appear here…"
          }
          value={responseText}
          onChange={(e) => setResponseText(e.target.value)}
        />
        <p style={hintStyle}>You can edit or paste into this area as well.</p>
      </section>

      {/* Error controls + error details textarea (4th area) */}
      <div style={controlRowStyle}>
        <button style={buttonSecondary} onClick={handleClearErrors}>
          Clear errors
        </button>
        <button style={buttonSecondary} onClick={handleCopyErrors}>
          Copy errors to clipboard
        </button>
      </div>

      <section style={sectionStyle}>
        <label style={labelStyle}>Error details (if any)</label>
        <textarea
          style={{
            ...textareaStyle,
            minHeight: 200,
            fontFamily:
              "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, 'Liberation Mono', 'Courier New', monospace",
          }}
          placeholder="If the API cannot respond, detailed error information will appear here…"
          value={errorDetails}
          onChange={(e) => setErrorDetails(e.target.value)}
        />
        <p style={hintStyle}>
          Full diagnostics: status, headers, endpoint, payload summary, and any
          error JSON from the provider.
        </p>
      </section>
    </main>
  );
}
