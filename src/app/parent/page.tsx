"use client";
import React, { useCallback, useState } from "react";
import LeftChild from "@/components/LeftChild";
import RightChild from "@/components/RightChild";
import { TextAreasContext } from "@/context/TextAreasContext";

export default function Page() {
  const [values, setValues] = useState<string[]>(["", "", "", ""]);

  const setValueAt = useCallback((index: number, newValue: string) => {
    setValues((prev) => prev.map((v, i) => (i === index ? newValue : v)));
  }, []);

  const renderBlock = (index: number) => (
    <div
      key={index}
      style={{ display: "flex", flexDirection: "column", gap: 8 }}
    >
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["A", "B", "C", "D"].map((label) => (
          <button key={label} onClick={() => setValueAt(index, "hello world")}>
            {label}
          </button>
        ))}
      </div>
      <textarea
        value={values[index]}
        onChange={(e) => setValueAt(index, e.target.value)}
        rows={4}
        style={{ width: "100%" }}
        placeholder={`Textarea ${index + 1}`}
      />
    </div>
  );

  return (
    <TextAreasContext.Provider value={{ values, setValueAt }}>
      <main
        style={{
          display: "grid",
          gridTemplateColumns: "20% 60% 20%",
          gap: 16,
          minHeight: "100vh",
          padding: 16,
          boxSizing: "border-box",
        }}
      >
        <section
          style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}
        >
          <h3 style={{ marginTop: 0 }}>Left</h3>
          <LeftChild />
        </section>

        <section
          style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}
        >
          <h3 style={{ marginTop: 0 }}>Middle (Shared Textareas)</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {Array.from({ length: 4 }).map((_, i) => renderBlock(i))}
          </div>
        </section>

        <section
          style={{ border: "1px solid #ddd", padding: 12, borderRadius: 8 }}
        >
          <h3 style={{ marginTop: 0 }}>Right</h3>
          <RightChild />
        </section>
      </main>
    </TextAreasContext.Provider>
  );
}
