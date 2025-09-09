"use client";

import { useState } from "react";
import { phrasingModules } from "@/lib/phrasingModules";
import { ToneKey, StyleKey } from "@/lib/phrasingModules";

export default function HomePage() {
  const [systemPrompt, setSystemPrompt] = useState(
    "You are a helpful clinical note generator. Given a transcript of a patient interview, generate a concise and accurate clinical note summarizing the key points discussed."
  );
  const [transcript, setTranscript] = useState(
    "I am feeling low in mood and have lost interest in activities I used to enjoy."
  );
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [applyRefinements, setApplyRefinements] = useState(true);

  const [tone, setTone] = useState<ToneKey>("neutral");
  const [stylePreset, setStylePreset] = useState<StyleKey>("narrative");

  const handleGenerate = async () => {
    setError("");
    setResponse("");

    try {
      // Get modular phrasing instructions
      const toneInstruction = phrasingModules.tone[tone];
      const styleInstruction = phrasingModules.style[stylePreset];

      // Compose final system prompt
      const finalPrompt = applyRefinements
        ? `${systemPrompt}\n\n${toneInstruction}\n${styleInstruction}`
        : systemPrompt;

      // Send request to API
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemPrompt: finalPrompt,
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
    <div className="min-h-screen bg-white">
      <main className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="space-y-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              NHS Transcript Processor
            </h1>
            <p className="text-lg text-gray-600">
              Generate professional clinical notes from patient interview
              transcripts
            </p>
          </div>

          {/* Configuration Section */}
          <div className="bg-gray-50 rounded-lg p-6 space-y-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              Configuration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Tone Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Tone
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  value={tone}
                  onChange={(e) => setTone(e.target.value as ToneKey)}
                >
                  <option value="neutral">Neutral</option>
                  <option value="empathetic">Empathetic</option>
                  <option value="formal">Formal</option>
                  <option value="concise">Concise</option>
                </select>
              </div>

              {/* Style Preset Selector */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Style Preset
                </label>
                <select
                  className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  value={stylePreset}
                  onChange={(e) => setStylePreset(e.target.value as StyleKey)}
                >
                  <option value="narrative">Narrative</option>
                  <option value="soap">SOAP Format</option>
                  <option value="bullet">Bullet Points</option>
                  <option value="shorthand">Clinical Shorthand</option>
                </select>
              </div>
            </div>

            {/* Refinement Toggle */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="refinementToggle"
                checked={applyRefinements}
                onChange={(e) => setApplyRefinements(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label
                htmlFor="refinementToggle"
                className="ml-2 text-sm text-gray-700"
              >
                Apply phrasing refinements (tone + style)
              </label>
            </div>
          </div>

          {/* System Prompt */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              System Prompt
            </label>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              rows={4}
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
            />
          </div>

          {/* Transcript Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Interview Transcript
            </label>
            <textarea
              className="w-full p-3 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-gray-900"
              rows={8}
              value={transcript}
              onChange={(e) => setTranscript(e.target.value)}
            />

            {/* Submit Button */}
            <div className="mt-4">
              <button
                className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                onClick={handleGenerate}
                disabled={!transcript.trim()}
              >
                Generate Clinical Note
              </button>
            </div>
          </div>

          {/* Response Output */}
          {(response || error) && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Generated Clinical Note
              </label>
              <textarea
                className="w-full p-3 border border-gray-300 rounded-md bg-gray-50 text-gray-900"
                rows={6}
                value={response}
                readOnly
              />

              {/* Live Preview Panel */}
              {response && (
                <div className="mt-6 p-4 border border-gray-200 rounded-md bg-white">
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    Live Preview
                  </h3>
                  <div className="whitespace-pre-wrap text-gray-800 leading-relaxed">
                    {response}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error Message (Dev Only) */}
          {process.env.NODE_ENV === "development" && error && (
            <div>
              <label className="block text-sm font-medium text-red-700 mb-2">
                Error Message
              </label>
              <div className="p-3 border border-red-300 rounded-md bg-red-50">
                <p className="text-red-800">{error}</p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
