"use client";
import React from "react";
import { useTextAreasContext } from "@/context/TextAreasContext";

export default function LeftChild() {
  const { setValueAt } = useTextAreasContext();

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <button onClick={() => setValueAt(0, "Hello from left A")}>A</button>
      <button onClick={() => setValueAt(0, "Hello from left B")}>B</button>
      <button onClick={() => setValueAt(0, "(Left C – stub)")}>C</button>
      <button onClick={() => setValueAt(0, "(Left D – stub)")}>D</button>
      <button onClick={() => setValueAt(0, "(Left E – stub)")}>E</button>
    </div>
  );
}
