export type ToneKey = "neutral" | "empathetic" | "formal" | "concise";
export type StyleKey = "narrative" | "soap" | "bullet" | "shorthand";

export const phrasingModules = {
  tone: {
    neutral: "Use a neutral and objective tone.",
    empathetic: "Use language that conveys empathy and emotional awareness.",
    formal:
      "Use a formal and professional tone suitable for clinical documentation.",
    concise: "Use a concise tone that prioritizes brevity and clarity.",
  },
  style: {
    narrative: "Present the information as a flowing narrative.",
    soap: "Structure the output using the SOAP format: Subjective, Objective, Assessment, Plan.",
    bullet: "Present the information as concise bullet points.",
    shorthand: "Use clinical shorthand and abbreviations where appropriate.",
  },
};

/* export const phrasingModules = {
  tone: {
    neutral: "Use a neutral and objective tone.",
    empathetic: "Use language that conveys empathy and emotional awareness.",
    formal:
      "Use a formal and professional tone suitable for clinical documentation.",
    concise: "Use a concise tone that prioritizes brevity and clarity.",
  },
  style: {
    narrative: "Present the information as a flowing narrative.",
    soap: "Structure the output using the SOAP format: Subjective, Objective, Assessment, Plan.",
    bullet: "Present the information as concise bullet points.",
    shorthand: "Use clinical shorthand and abbreviations where appropriate.",
  },
};
 */
