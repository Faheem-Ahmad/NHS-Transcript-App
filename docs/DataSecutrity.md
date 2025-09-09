Data Handling Statement & Security Summary
Overview
This application is designed to support clinicians in generating high-quality clinical notes using AI-assisted phrasing refinement. It prioritizes data minimization, user control, and compliance with NHS data governance standards.

🔒 Patient Data Handling

- No patient-identifiable data is stored in any database or persistent storage.
- Interview transcripts, which may contain patient information, are processed in-memory only and are not retained after note generation.
- Generated clinical notes are displayed in the UI for clinician review and manual transfer to the official EMR. These notes are not saved by the application.

📦 System Prompt Management

- System prompts used to guide note generation are predefined, non-sensitive, and contain no patient data.
- These prompts are stored securely and versioned for consistency and auditability.

🔐 Transmission & Security

- All data transmission occurs over HTTPS with TLS encryption.
- No data is cached or logged on the frontend or backend that could compromise patient confidentiality.
- Session data is cleared after use to prevent unintended retention.

👤 User Access & Control

- Access to the application is restricted to authorized clinical users.
- No anonymous usage is permitted when entering patient-related transcripts.
- Users retain full control over what data is entered and when it is cleared.

📊 Usage Tracking (Non-Clinical)

- The application may track non-sensitive usage metrics, such as:
- Frequency of tone/style preset selection
- Number of notes generated per session
- Feature engagement patterns
- These metrics are used solely for product improvement and performance monitoring, and do not include any patient data.

🛡️ Audit Logging (Optional)

- If enabled, audit logs may record:
- Timestamp of note generation
- Selected system prompt and phrasing options
- Session ID or user ID (non-identifiable)
- No transcript or generated note content is stored in audit logs.

✅ Compliance Alignment
This architecture is designed to align with:

- NHS Data Security and Protection Toolkit (DSPT) principles
- UK GDPR and Data Minimisation standards
- Clinical Safety Standards (DCB0129/DCB0160) where applicable

📄 Summary
By avoiding the storage of patient-identifiable data and maintaining strict control over data flow, this application minimizes risk and simplifies compliance. It empowers clinicians while respecting NHS data governance priorities.

Would you like me to help format this for your onboarding UI or prepare a version for procurement documentation? I can also help draft a one-page Clinical Safety Summary if you're planning to engage NHS digital leads.
