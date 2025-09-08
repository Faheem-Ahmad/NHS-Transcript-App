"use client";

import { useState } from "react";

export default function HomePage() {
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful clinical note generator. Given a transcript of a patient interview, generate a concise and accurate clinical note summarizing the key points discussed."
  );
  const [transcript, setTranscript] = useState(
    "I am feeling low in mood and have lost interest in activities I used to enjoy."
  );
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [tone, setTone] = useState("neutral");
  const [stylePreset, setStylePreset] = useState("narrative");
  const [applyRefinements, setApplyRefinements] = useState(true);

  const handleGenerate = async () => {
    setError("");
    setResponse("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // body: JSON.stringify({ systemPrompt, transcript }),
        body: JSON.stringify({
          //  systemPrompt: `${systemPrompt}\n\nPlease use a ${tone} tone.`,
          //   systemPrompt: `${systemPrompt}\n\nPlease use a ${tone} tone and format the output as ${stylePreset}.`,
          systemPrompt: applyRefinements
            ? `${systemPrompt}\n\nPlease use a ${tone} tone and format the output as ${stylePreset}.`
            : systemPrompt,

          transcript,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Unknown error");
      }

      setResponse(data.response);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <main className="p-6 max-w-4xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">NHS Transcript Processor</h1>
      {/* Tone Selector */}
      <div>
        <label className="block font-semibold mb-1">Select Tone</label>
        <select
          className="w-full p-2 border rounded text-black bg-white"
          value={tone}
          onChange={(e) => setTone(e.target.value)}
        >
          <option value="neutral">Neutral</option>
          <option value="empathetic">Empathetic</option>
          <option value="formal">Formal</option>
          <option value="concise">Concise</option>
        </select>
      </div>
      {/* Style Preset Selector */}
      <div className="mt-4">
        <label className="block font-semibold mb-1">Select Style Preset</label>
        <select
          className="w-full p-2 border rounded text-black bg-white"
          value={stylePreset}
          onChange={(e) => setStylePreset(e.target.value)}
        >
          <option value="narrative">Narrative</option>
          <option value="soap">SOAP Format</option>
          <option value="bullet">Bullet Points</option>
          <option value="shorthand">Clinical Shorthand</option>
        </select>
      </div>
      {/* Refinement Toggle */}
      <div className="mt-4 flex items-center">
        <input
          type="checkbox"
          id="refinementToggle"
          checked={applyRefinements}
          onChange={(e) => setApplyRefinements(e.target.checked)}
          className="mr-2"
        />
        <label htmlFor="refinementToggle" className="font-semibold">
          Apply phrasing refinements (tone + style)
        </label>
      </div>

      {/* System Prompt */}
      <div>
        <label className="block font-semibold mb-1">System Prompt</label>
        <textarea
          className="w-full p-2 border rounded"
          rows={4}
          value={systemPrompt}
          onChange={(e) => setSystemPrompt(e.target.value)}
        />
      </div>

      {/* Transcript Input */}
      <div>
        <label className="block font-semibold mb-1">Interview Transcript</label>
        <textarea
          className="w-full p-2 border rounded"
          rows={8}
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
        />
        {/* Submit Button */}
        <div>
          <button
            className="mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
            onClick={handleGenerate}
          >
            Generate Clinical Note
          </button>
        </div>
      </div>

      {/* Response Output */}
      <div>
        <label className="block font-semibold mb-1">
          Generated Clinical Note
        </label>
        <textarea
          className="w-full p-2 border rounded bg-gray-50 text-black"
          rows={6}
          value={response}
          readOnly
        />
        {/* Live Preview Panel */}
        {response && (
          <div className="mt-6 p-4 border rounded bg-gray-50">
            <h3 className="text-lg font-semibold mb-2">Live Preview</h3>
            <div className="whitespace-pre-wrap text-gray-800">{response}</div>
          </div>
        )}
      </div>

      {/* Error Message (Dev Only) */}
      {process.env.NODE_ENV === "development" && error && (
        <div>
          <label className="block font-semibold mb-1 text-red-600">
            Error Message
          </label>
          <textarea
            className="w-full p-2 border border-red-400 rounded bg-red-50 text-red-800"
            rows={4}
            value={error}
            readOnly
          />
        </div>
      )}
    </main>
  );
}
