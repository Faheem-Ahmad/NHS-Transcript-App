"use client";
import React, { createContext, useContext } from "react";

export type TextAreasContextType = {
  // Current values of the 4 textareas
  values: string[];
  // Replace the entire value of textarea at index with newValue
  setValueAt: (index: number, newValue: string) => void;
};

export const TextAreasContext = createContext<TextAreasContextType | null>(
  null
);

export function useTextAreasContext(): TextAreasContextType {
  const ctx = useContext(TextAreasContext);
  if (!ctx) throw new Error("useTextAreasContext must be used within provider");
  return ctx;
}
