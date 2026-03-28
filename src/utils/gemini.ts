import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Global lock to prevent concurrent AI requests which trigger 429s
let aiRequestLock: Promise<void> = Promise.resolve();

/**
 * Helper to retry an async function with exponential backoff.
 * Specifically handles 429 (RESOURCE_EXHAUSTED) errors.
 * Also ensures that AI requests are processed sequentially across the app.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 8, initialDelay = 8000): Promise<T> {
  // Wait for the previous request to finish (Sequential Queue)
  const currentLock = aiRequestLock;
  let resolveLock: () => void;
  aiRequestLock = new Promise((resolve) => { resolveLock = resolve; });
  
  await currentLock;

  try {
    let lastError: any;
    for (let i = 0; i < maxRetries; i++) {
      try {
        return await fn();
      } catch (err: any) {
        lastError = err;
        const isRetryableError = 
          err?.message?.includes("RESOURCE_EXHAUSTED") || 
          err?.status === "RESOURCE_EXHAUSTED" ||
          err?.code === 429 ||
          err?.error?.code === 429 ||
          err?.message?.includes("UNAVAILABLE") || 
          err?.status === "UNAVAILABLE" ||
          err?.code === 503 ||
          err?.error?.code === 503 ||
          err?.error?.status === "UNAVAILABLE" ||
          JSON.stringify(err).includes("429") ||
          JSON.stringify(err).includes("503") ||
          JSON.stringify(err).includes("RESOURCE_EXHAUSTED") ||
          JSON.stringify(err).includes("UNAVAILABLE");

        if (isRetryableError && i < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, i);
          console.warn(`Gemini error (Quota/Unavailable). Retrying in ${delay}ms (Attempt ${i + 1}/${maxRetries})...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }
        throw err;
      }
    }
    throw lastError;
  } finally {
    // Add a small cooldown after each request to let the quota recover
    setTimeout(() => resolveLock(), 1000);
  }
}

/**
 * Attempts to repair truncated JSON by closing unclosed strings, arrays, and objects.
 */
function repairTruncatedJson(json: string): string {
  if (!json || json.trim() === "") return "[]";
  
  let result = json.trim();
  
  // If it doesn't start with { or [, try to find the first one
  if (!result.startsWith('{') && !result.startsWith('[')) {
    const firstBrace = result.indexOf('{');
    const firstBracket = result.indexOf('[');
    let start = -1;
    if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
      start = firstBrace;
    } else if (firstBracket !== -1) {
      start = firstBracket;
    }
    
    if (start !== -1) {
      result = result.substring(start);
    } else {
      return "[]";
    }
  }

  // Pre-cleaning: remove control characters that break JSON
  // eslint-disable-next-line no-control-regex
  result = result.replace(/[\u0000-\u001F\u007F-\u009F]/g, "");

  // Fix unescaped backslashes and bad escapes
  result = result.replace(/\\(?!(["\\\/bfnrt]|u[0-9a-fA-F]{4}))/g, "\\\\");

  const getStack = (text: string) => {
    const stack: string[] = [];
    let inString = false;
    let escaped = false;
    
    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (char === '\\') {
        escaped = true;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        continue;
      }
      if (!inString) {
        if (char === '{') stack.push('}');
        else if (char === '[') stack.push(']');
        else if (char === '}' || char === ']') {
          if (stack.length > 0 && stack[stack.length - 1] === char) stack.pop();
        }
      }
    }
    return { stack, inString, escaped };
  };

  const closeJson = (text: string) => {
    let { stack, inString, escaped } = getStack(text);
    let closed = text;
    
    if (inString) {
      if (escaped) closed = closed.slice(0, -1);
      // Handle trailing backslashes
      let backslashCount = 0;
      for (let i = closed.length - 1; i >= 0 && closed[i] === '\\'; i--) backslashCount++;
      if (backslashCount % 2 !== 0) closed = closed.slice(0, -1);
      closed += '"';
    }
    
    let changed = true;
    while (changed && closed.length > 0) {
      changed = false;
      closed = closed.trim();
      const lastChar = closed[closed.length - 1];
      if (lastChar === ',' || lastChar === ':' || lastChar === '{' || lastChar === '[') {
        closed = closed.slice(0, -1).trim();
        changed = true;
      }
    }
    
    // Re-get stack after trimming
    ({ stack } = getStack(closed));
    for (let i = stack.length - 1; i >= 0; i--) closed += stack[i];
    return closed;
  };

  // Try to parse. If it fails, try to truncate at the last comma and try again.
  let current = closeJson(result);
  try {
    JSON.parse(current);
    return current;
  } catch (e) {
    console.warn("Initial JSON parse failed, attempting to clean and repair text...", e);
    
    // Iterative backtracking
    let lastComma = result.lastIndexOf(',');
    while (lastComma !== -1 && result.length > 10) {
      result = result.substring(0, lastComma).trim();
      current = closeJson(result);
      try {
        JSON.parse(current);
        return current;
      } catch (inner) {
        lastComma = result.lastIndexOf(',');
      }
    }
  }
  
  return current;
}

function cleanAndExtractJson(text: string): string {
  if (!text) return "";
  let cleaned = text.trim();
  
  // Check if it's a markdown table instead of JSON
  if (cleaned.includes('|') && cleaned.includes('---')) {
    try {
      const lines = cleaned.split('\n').filter(l => l.trim().startsWith('|'));
      if (lines.length >= 3) {
        const headers = lines[0].split('|').map(h => h.trim()).filter(h => h !== "");
        const rows = lines.slice(2).map(line => {
          const cells = line.split('|').map(c => c.trim()).filter((c, i) => i > 0 && i <= headers.length);
          const obj: any = {};
          headers.forEach((h, i) => {
            const key = h.toLowerCase().replace(/[^a-z0-9]/g, '_');
            obj[key] = cells[i] || "";
          });
          return obj;
        });
        return JSON.stringify(rows);
      }
    } catch (e) {
      console.error("Failed to parse markdown table:", e);
    }
  }

  // Handle markdown code blocks
  if (cleaned.includes('```json')) {
    const parts = cleaned.split('```json');
    cleaned = parts[1] || parts[0];
  } else if (cleaned.includes('```')) {
    const parts = cleaned.split('```');
    cleaned = parts[1] || parts[0];
  }
  
  // Remove trailing backticks if they exist
  if (cleaned.includes('```')) {
    cleaned = cleaned.split('```')[0];
  }
  
  cleaned = cleaned.trim();
  
  // Find the first actual JSON character ({ or [)
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');
  let start = -1;
  
  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
  } else if (firstBracket !== -1) {
    start = firstBracket;
  }
  
  if (start !== -1) {
    cleaned = cleaned.substring(start);
  }
  
  return cleaned;
}

const companySchema = {
  type: Type.OBJECT,
  properties: {
    companyName: { type: Type.STRING },
    cin: { type: Type.STRING },
    registeredAddress: { type: Type.STRING },
    status: { type: Type.STRING },
    incorporationDate: { type: Type.STRING },
    companyClass: { type: Type.STRING },
    companyCategory: { type: Type.STRING },
    companySubCategory: { type: Type.STRING },
    industryDescription: { type: Type.STRING },
    authorizedCapital: { type: Type.NUMBER },
    authorizedCapitalWords: { type: Type.STRING },
    paidUpCapital: { type: Type.NUMBER },
    paidUpCapitalWords: { type: Type.STRING },
    email: { type: Type.STRING },
    lastAgmDate: { type: Type.STRING },
    lastBalanceSheetDate: { type: Type.STRING },
    directors: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          din: { type: Type.STRING },
          designation: { type: Type.STRING },
          appointmentDate: { type: Type.STRING },
          totalDirectorships: { type: Type.NUMBER },
          disqualified: { type: Type.BOOLEAN },
          dinDeactivated: { type: Type.BOOLEAN }
        }
      }
    },
    charges: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          srn: { type: Type.STRING },
          bankName: { type: Type.STRING },
          bankAddress: { type: Type.STRING },
          amountSecured: { type: Type.NUMBER },
          modifiedAmountSecured: { type: Type.NUMBER },
          amountInWords: { type: Type.STRING },
          modifiedAmountInWords: { type: Type.STRING },
          propertyCharged: { type: Type.STRING },
          termsAndConditions: { type: Type.STRING },
          margin: { type: Type.STRING },
          repaymentTerms: { type: Type.STRING },
          extentOfCharge: { type: Type.STRING },
          creationDate: { type: Type.STRING },
          modificationDate: { type: Type.STRING },
          satisfactionDate: { type: Type.STRING },
          status: { type: Type.STRING, enum: ["Open", "Satisfied"] },
          isModification: { type: Type.BOOLEAN },
          typeOfCharge: { type: Type.STRING },
          rateOfInterest: { type: Type.STRING },
          isDetailed: { type: Type.BOOLEAN },
          sourceFile: { type: Type.STRING } // To help with merging
        }
      }
    },
    associateSubsidiaries: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          cin: { type: Type.STRING },
          name: { type: Type.STRING },
          nature: { type: Type.STRING },
          sharesHeld: { type: Type.STRING }
        }
      }
    },
    commonDirectorships: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          name: { type: Type.STRING },
          status: { type: Type.STRING },
          age: { type: Type.STRING },
          state: { type: Type.STRING },
          commonDirectorsCount: { type: Type.NUMBER }
        }
      }
    },
    fileAnalysis: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          fileName: { type: Type.STRING },
          fileType: { type: Type.STRING }, // "CHG", "MasterData", "MGT", etc.
          isBlankXfa: { type: Type.BOOLEAN },
          hasRealData: { type: Type.BOOLEAN }
        }
      }
    }
  }
};

export async function parseCompanyFiles(fileContents: { name: string, content: string }[]): Promise<any> {
  const combinedText = fileContents.map(f => `FILE: ${f.name}\n${f.content}`).join("\n\n--- NEW FILE ---\n\n");
  
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Extract all relevant company information from the following MCA portal documents for a Chartered Accountant ROC Search Report.
              
              CRITICAL EXTRACTION RULES:
              1. NUMERICAL INTEGRITY (CRITICAL): 
                 - Extract numbers exactly as they appear. Never prefix or modify digits.
                 - If a number is ₹1,95,00,000, do NOT extract it as ₹11,95,00,000.
                 - Rule 1: Read the "Amount in Words" to verify the numeric figures. The words are the GROUND TRUTH.
                 - Rule 2: Compare the leading digits of the numeric figure with the number derived from the words.
                 - Rule 3: If the numeric figure has an extra "1" prepended (e.g., 11,95,00,000 instead of 1,95,00,000), STRIP the leading "1".
                 - Pay close attention to Lakhs/Crores (Indian Numbering System).
              
              2. DATE FORMAT (CRITICAL):
                 - ALL dates MUST be returned in ISO format: YYYY-MM-DD.
                 - Example: If the document shows "24/07/2000", return "2000-07-24".
                 - This is essential for "incorporationDate" to calculate company age.

              3. DIRECTOR & SIGNATORY MATCHING (CRITICAL):
                 - Use "Section 6: List of Signatories" or the "List of Signatories" table as the absolute SOURCE OF TRUTH for director information.
                 - Extract ALL signatories, including Company Secretaries (CS).
                 - "totalDirectorships": Extract the EXACT number from the "Total Directorships" column in this table. 
                 - For example, if the table shows "11" for a director, you MUST extract 11. If it shows "0", extract 0.
                 - Identify "Common Directorships" by matching DINs/Names from the "Directors Info" section with any "Potential Related Parties" or "Common Directorship" tables found in the documents.
              
              CHARGE EXTRACTION RULES (CRITICAL — READ ALL):

              1. CHARGE COUNT INTEGRITY:
                 - The number of entries in your "charges" array with status "Open" MUST exactly equal 
                   the number of charges listed in the "List of Continuing Charges" summary table.
                 - If the summary table shows 7 charges, your output must have exactly 7 charge objects.
                 - Treat a "Modification" as an update to an existing charge object, NOT a new entry.

              2. CHARGE ID RULE:
                 - Use the raw numeric Charge ID (e.g., "100452823").
                 - DO NOT add suffixes like "(Modified)" or "(Original)".
                 - Each Charge ID must appear only once in your output.

              3. ORIGINAL vs MODIFIED AMOUNTS (CRITICAL):
                 - "amountSecured": This is the ORIGINAL creation amount. Find the CHG-1 form for "Creation of charge" (Field 3(a)).
                 - "modifiedAmountSecured": This is the UPDATED amount. Find the CHG-1 form for "Modification of charge" (Field 3(a)).
                 - If a charge has been modified, these two fields MUST be different.
                 - If NO modification exists, set "modifiedAmountSecured" to 0 and "modificationDate" to "".
                 - NEVER copy the same value into both "amountSecured" and "modifiedAmountSecured".

              4. AMOUNT GROUND TRUTH:
                 - The "Amount in Words" is your definitive source for numeric figures.
                 - If the numeric field says "11,00,00,000" but the words say "One Crore", the value is 1,00,00,000.
                 - Strip extra leading "1"s if they contradict the words.

              5. MODIFICATION DATE:
                 - Use the actual CHG-1 modification filing date.
                 - Leave as "" if no modification form exists.

              6. SUMMARY TABLE vs CHG-1 FORMS:
                 - Use the CHG-1 Creation form amount for "amountSecured".
                 - Use the summary table amount ONLY as a fallback if no CHG-1 form exists.

              7. DETAILED CHARGE PARTICULARS (CRITICAL):
                 - Extract the following fields exactly as they appear in the CHG-1 forms:
                 - "propertyCharged": From "Brief Particulars of the Property Charged"
                 - "termsAndConditions": From "Terms and Conditions"
                 - "margin": From "Margin"
                 - "repaymentTerms": From "Terms of Repayment"
                 - "extentOfCharge": From "Extent and Operation of the Charge"
                 - "rateOfInterest": From "Rate of Interest"
                 - DO NOT use "Not Available" if the data is present in the document.
                 - If the field is long, extract the full text. Do not truncate.
              
              Documents:
              ${combinedText}`
            }
          ]
        }
      ],
      config: {
        systemInstruction: "You are a specialized Financial Data Extraction Agent for Indian Corporate Filings (ROC). Your goal is to extract data with 100% numerical accuracy. You MUST return a valid JSON object matching the provided schema. Ensure all strings are properly escaped. Do not truncate. Use 'Not Available' for missing fields.",
        responseMimeType: "application/json",
        responseSchema: companySchema,
        maxOutputTokens: 16384,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    }));

    let text = response.text || "";
    text = cleanAndExtractJson(text);
    
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error("Initial JSON parse failed, attempting to clean and repair text...", parseError);
      
      // Attempt to fix common JSON issues from LLMs
      let cleanedText = text.replace(/[\u0000-\u001f]+/g, " "); // Remove control characters

      try {
        return JSON.parse(cleanedText);
      } catch (secondError) {
        console.error("Second JSON parse attempt failed, attempting emergency repair...", secondError);
        try {
          const repairedText = repairTruncatedJson(cleanedText);
          console.log("Repaired JSON (first 100 chars):", repairedText.substring(0, 100));
          console.log("Repaired JSON (last 100 chars):", repairedText.substring(repairedText.length - 100));
          return JSON.parse(repairedText);
        } catch (finalError) {
          console.error("Final JSON parse attempt failed.", finalError);
          throw new Error("The AI response was malformed or truncated. Please try uploading fewer files at once.");
        }
      }
    }
  } catch (err) {
    console.error("Gemini Analysis Error:", err);
    throw err;
  }
}

export async function fetchOtherDirectorships(name: string, din: string, totalDirectorships: number): Promise<any> {
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Role: You are an expert Corporate Data Analyst specializing in Indian MCA (Ministry of Corporate Affairs) records.

Primary Data Source: Use ONLY the Google Search tool to find information from https://mycorporateinfo.com/ or https://www.zaubacorp.com/.

Objective: Generate a complete Directorship Report for: ${name} / ${din}.

SOURCE OF TRUTH — DIRECTORSHIP COUNT:
The official MCA record for this director shows exactly ${totalDirectorships} total directorship(s).
This count includes the CURRENT COMPANY being searched. Do NOT exceed this count.

CRITICAL RULES — READ CAREFULLY:

RULE 1 — COUNT IS AN ABSOLUTE CEILING:
Your output array must contain AT MOST ${totalDirectorships} entries.
If you find more results on the web than ${totalDirectorships}, keep only the most relevant ones and discard extras.
NEVER return more rows than ${totalDirectorships}.

RULE 2 — IF totalDirectorships IS 1:
Return EXACTLY 1 entry — the current company itself.
Do NOT search for or add any other companies.
The only row must be this company: name="${name}", din="${din}".
Do NOT use search results to add more companies when the count is 1.

RULE 3 — ALWAYS INCLUDE THE CURRENT COMPANY:
The company for which this ROC report is being prepared MUST always appear as one of the rows.
Even if search results do not show it, add it manually using the data provided.

RULE 4 — NEVER LEAVE THE TABLE EMPTY:
If no search results are found, or if totalDirectorships is 0 or 1, return at least 1 row — the current company.

SEARCH STRATEGY (only apply if totalDirectorships > 1):
- Search: "${din} mycorporateinfo"
- Search: "${din} zaubacorp"
- Combine results but cap at ${totalDirectorships} total entries.

Return the data as a JSON array of objects with these exact keys:
- company_name: Full official name
- status: Active, Strike Off, Amalgamated, etc.
- appointment_date: Format YYYY-MM-DD (CRITICAL: convert from DD/MM/YYYY)
- industry: Category of business (MANDATORY: infer from name if not found)
- state: Full Indian state name (MANDATORY: search for registered office location)

Do not include any conversational filler. Return ONLY the JSON array.`
            }
          ]
        }
      ],
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              company_name: { type: Type.STRING },
              status: { type: Type.STRING },
              appointment_date: { type: Type.STRING, description: "Date in YYYY-MM-DD format" },
              industry: { type: Type.STRING },
              state: { type: Type.STRING }
            },
            required: ["company_name", "status", "appointment_date", "industry", "state"]
          }
        }
      }
    }));

    let text = response.text || "";
    text = cleanAndExtractJson(text);
    text = repairTruncatedJson(text);
    
    if (!text || text === "" || text === "[]" || text === "{}") return { otherCompanies: [] };

    try {
      const data = JSON.parse(text);
      if (Array.isArray(data)) {
        return {
          otherCompanies: data.map(item => ({
            name: item.company_name || item.companyname || "",
            status: item.status || "",
            appointmentDate: item.appointment_date || item.appointmentdate || "",
            industry: item.industry || "",
            state: item.state || "",
            hasFullDetails: true
          }))
        };
      }
      return { otherCompanies: [] };
    } catch (parseError) {
      console.error("Directorships JSON parse failed, attempting emergency repair...", parseError);
      
      // Try to manually extract if JSON is slightly malformed or truncated
      const companies: any[] = [];
      
      // Look for objects like {"company_name": "...", ...}
      const objectRegex = /\{\s*"company_name":\s*"([^"]+)"(?:,\s*"status":\s*"([^"]*)")?(?:,\s*"appointment_date":\s*"([^"]*)")?(?:,\s*"industry":\s*"([^"]*)")?(?:,\s*"state":\s*"([^"]*)")?\s*\}/g;
      let match;
      while ((match = objectRegex.exec(text)) !== null) {
        companies.push({ 
          name: match[1], 
          status: match[2] || "",
          appointmentDate: match[3] || "",
          industry: match[4] || "",
          state: match[5] || "",
          hasFullDetails: true
        });
      }
      
      return { otherCompanies: companies };
    }
  } catch (err) {
    console.error("Error fetching directorships:", err);
    return { otherCompanies: [] };
  }
}

export async function fetchCompanyDetails(companyName: string, cin: string, directorName: string): Promise<any> {
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Fetch verified details for the company "${companyName}" (CIN: ${cin}) regarding director "${directorName}".

SEARCH STRATEGY (follow ALL steps in order):
1. Search: "${companyName} Zaubacorp" — extract registered office address and business activity
2. Search: "${companyName} Tofler company profile" — extract company description and state
3. Search: "${companyName} ${cin} MCA master data" — cross-verify status and NIC description
4. If CIN is missing or empty, search: "${companyName} India company CIN registered office"

FIELD-SPECIFIC RULES:

industry (THIS IS A BRIEF PROFILE):
- This field represents a BRIEF PROFILE of the company — describe what the company actually does in business terms.
- GOOD examples: 
  "Manufacture of pharmaceuticals, medicinal chemicals and botanical products"
  "Real estate activities with own or leased property"
  "Architectural and engineering activities and related technical consultancy"
  "Wholesale of textiles and garment accessories"
- BAD examples: "Other business activities", "Services", "NIC 99", "N/A", "Not Available"
- If exact NIC description is not found on Zaubacorp/Tofler, INFER a specific business description from the company name:
  "Rosswood Land and Properties" → "Real estate activities on a fee or contract basis"
  "ABC Micro Finance" → "Other financial intermediation n.e.c."
  "Oakley Bowden Pharma" → "Manufacture of pharmaceuticals, medicinal chemicals and botanical products"
- NEVER leave this blank or generic. Always provide a meaningful business description.

state:
- Must be the FULL INDIAN STATE NAME of the registered office.
- Extract from the registered office address found on Zaubacorp/Tofler/MCA.
- Return STATE name, NOT city: Chennai → "Tamil Nadu", Mumbai → "Maharashtra", Gurugram → "Haryana", Bengaluru → "Karnataka", Kolkata → "West Bengal", Delhi → "Delhi"
- If the company is an LLP, check LLP registration address instead.
- NEVER leave blank.

Also extract:
- status: Current company status (Active, Strike Off, Amalgamated, Dissolved, Under Liquidation)
- appointmentDate: Date ${directorName} was appointed as director (YYYY-MM-DD)
- cessationDate: Date ${directorName} ceased as director (YYYY-MM-DD), blank if still active

Return ONLY a JSON object with: status, appointmentDate, cessationDate, industry, state`
            }
          ]
        }
      ],
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        maxOutputTokens: 2048,
        thinkingConfig: { thinkingLevel: ThinkingLevel.HIGH },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            status: { type: Type.STRING },
            appointmentDate: { type: Type.STRING, description: "Date in YYYY-MM-DD format" },
            cessationDate: { type: Type.STRING, description: "Date in YYYY-MM-DD format" },
            industry: { type: Type.STRING, description: "Brief profile: specific description of company's business activity, not generic" },
            state: { type: Type.STRING, description: "Full Indian state name of registered office (e.g. Tamil Nadu, Maharashtra, Delhi, not city names)" }
          }
        }
      }
    }));

    let text = response.text || "";
    text = cleanAndExtractJson(text);
    text = repairTruncatedJson(text);
    
    if (!text || text === "" || text === "{}") return {};

    try {
      const data = JSON.parse(text);
      // Clean up "N/A" values if Gemini ignored instructions
      Object.keys(data).forEach(key => {
        if (typeof data[key] === 'string' && (data[key].toLowerCase() === "n/a" || data[key].toLowerCase() === "not available")) {
          data[key] = "";
        }
      });
      return data;
    } catch (parseError) {
      console.error("Company details JSON parse failed:", parseError);
      return {};
    }
  } catch (err) {
    console.error(`Error fetching details for ${companyName}:`, err);
    return {};
  }
}
