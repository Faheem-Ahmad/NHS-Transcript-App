"use client";
import React from "react";
import { useTextAreasContext } from "@/context/TextAreasContext";

export default function RightChild() {
  const { setValueAt } = useTextAreasContext();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button onClick={() => setValueAt(0, "Hello from Right A")}>A</button>
      <button onClick={() => setValueAt(0, "Hello from Right B")}>B</button>
      <button onClick={() => setValueAt(0, "(Right C – stub)")}>C</button>
      <button onClick={() => setValueAt(0, "(Right D – stub)")}>D</button>
      <button onClick={() => setValueAt(0, "(Right E – stub)")}>E</button>
    </div>
  );
}
