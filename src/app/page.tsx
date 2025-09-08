"use client";

import { useState } from "react";

export default function HomePage() {
  const [systemPrompt, setSystemPrompt] = useState("");
  const [transcript, setTranscript] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setError("");
    setResponse("");

    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ systemPrompt, transcript }),
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
          className="w-full p-2 border rounded bg-gray-50"
          rows={6}
          value={response}
          readOnly
        />
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
