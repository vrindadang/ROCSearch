import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// Global lock to prevent concurrent AI requests which trigger 429s
let aiRequestLock: Promise<void> = Promise.resolve();

/**
 * Helper to retry an async function with exponential backoff.
 * Specifically handles 429 (RESOURCE_EXHAUSTED) errors.
 * Also ensures that AI requests are processed sequentially across the app.
 */
async function withRetry<T>(fn: () => Promise<T>, maxRetries = 5, initialDelay = 5000): Promise<T> {
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
        const isQuotaError = 
          err?.message?.includes("RESOURCE_EXHAUSTED") || 
          err?.status === "RESOURCE_EXHAUSTED" ||
          err?.code === 429 ||
          JSON.stringify(err).includes("429") ||
          JSON.stringify(err).includes("RESOURCE_EXHAUSTED");

        if (isQuotaError && i < maxRetries - 1) {
          const delay = initialDelay * Math.pow(2, i);
          console.warn(`Gemini quota exhausted. Retrying in ${delay}ms (Attempt ${i + 1}/${maxRetries})...`);
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
          otherCompanies: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                status: { type: Type.STRING },
                appointmentDate: { type: Type.STRING },
                industry: { type: Type.STRING },
                state: { type: Type.STRING }
              }
            }
          },
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
              
              2. DIRECTOR & SIGNATORY MATCHING:
                 - Extract ALL signatories, including Company Secretaries (CS).
                 - Identify "Common Directorships" by matching DINs/Names from the "Directors Info" section with any "Potential Related Parties" or "Common Directorship" tables found in the documents.
              
              3. CHARGE MASTER DATA:
                 - For the "List of Continuing Charges" or "Index of Charges" section, ALL charges listed there are considered "Open" or "Continuing" unless explicitly marked as "Satisfied" or "Closed".
                 - You MUST set the status to "Open" for all such continuing charges.
                 - If a Charge ID appears in a summary table but has no details in the "Particulars" section, set its details to "Not Available" (do not invent data).
                 - IMPORTANT: The "List of Continuing Charges" summary table may show the CURRENT (post-modification) amount, not the original creation amount. If CHG-1 forms are also provided for a charge, ALWAYS use the amount from the CHG-1 Creation form for "amountSecured" and "amountInWords", NOT the summary table amount. The summary table amount should only be used as a fallback when no CHG-1 Creation form exists for that charge.
                 - If the "Amount in Words" contradicts the numeric "Amount Secured", trust the Amount in Words as ground truth and correct the number accordingly.
              
              4. FORMATTING:
                 - Output all currency in standard Indian format (e.g., ₹ XX,XX,XXX) in your thinking/internal notes, but for the JSON fields, provide raw numbers for numeric fields and formatted strings for word fields.
                 - If data is missing in the source, write "Not Available" instead of leaving it blank or guessing.
              
              5. VALIDATION:
                 - The "Open Charges" count in the Highlights section MUST exactly match the number of charges in your "charges" array that have status "Open".
                 - If you find 7 charges in the "List of Continuing Charges", the "charges" array must have 7 items with status "Open", and any summary count must reflect this.
              
              CRITICAL INSTRUCTIONS FOR CHG FILES:
              1. You are a legal document analyst specializing in Indian company charge registrations under the Companies Act. I am providing you with CHG-1 forms for a company. I will provide you multiple CHG-1 documents for the same Charge ID.
              2. Your task: Generate two separate entries/tables for each Charge ID — one for the original creation and one for the modification.
              3. STRICT RULE FOR AMOUNT SECURED:
                 - In the Original Charge table, the Amount Secured must be taken exclusively from the CHG-1 form where field 3(a) = "Creation of charge". This value MUST be stored in the "amountSecured" and "amountInWords" fields. Do NOT use the amount from any modification form here.
                 - In the Modification table, the Amount Secured must be taken exclusively from the CHG-1 form where field 3(a) = "Modification of charge". This value MUST be stored in the "modifiedAmountSecured" and "modifiedAmountInWords" fields.
                 - These two amounts will often be different — that difference is intentional and must be preserved.
                 - If the creation form shows ₹5,00,00,000 and the modification form shows ₹7,50,00,000, then:
                   amountSecured → 50000000
                   modifiedAmountSecured → 75000000
                 - Never populate the original charge table with data from the modification form or vice versa. Treat each form as a completely independent source.
              4. Label each table clearly as: "Charge Created on [DD/MM/YYYY] vide Charge ID [number]" and "Charge Modification on [DD/MM/YYYY] vide Charge ID [number]" respectively.
              5. Identify if a CHG file is TYPE A (Real Data) or TYPE B (Blank XFA Template).
              6. TYPE A files have filled CIN, Bank Name, Amounts, and Dates. Extract EVERYTHING from these.
              7. TYPE B files are empty templates. Mark them as isBlankXfa: true in fileAnalysis.
              8. WHEN NO MODIFICATION EXISTS: If there is no CHG-1 modification form for a charge, leave "modifiedAmountSecured" as 0 (or omit it), leave "modifiedAmountInWords" as empty string, and set "modificationDate" to empty string "". Do NOT set modificationDate to "Not Available" — leave it as an empty string so the UI knows there is no modification.
              
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

export async function fetchOtherDirectorships(name: string, din: string): Promise<any> {
  try {
    const response = await withRetry(() => ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Role: You are an expert Corporate Data Analyst specializing in Indian MCA (Ministry of Corporate Affairs) records.

Primary Data Source: Use ONLY the Google Search tool to find information from https://mycorporateinfo.com/. Do not use general knowledge or other websites if this one is available.

Objective: Generate a complete Directorship Report for: ${name} / ${din}.

Extraction Rules (Mandatory):

Full Enumeration: You must find and list EVERY company associated with this person. For example, if the person has 11 directorships, you must list all 11. Do not summarize or say "and others."

Table Format: Present the data in a clean, Markdown table with the following exact columns:

S.No.

Company Name (Full official name)

Status (Active, Strike Off, Amalgamated, etc.)

Appointment Date (Format: DD/MM/YYYY)

Industry (Category of business) - MANDATORY: If not explicitly found, infer from company name. DO NOT LEAVE BLANK.

State (Location of registered office) - MANDATORY: Search for the city/state of the registered office. DO NOT LEAVE BLANK.

Accuracy Check: If the search results show "Past Directorships" or "Other Directorships," include those as well but note their status correctly.

No Conversational Filler: Start immediately with the table. Do not say "I have searched..." or "Here are the results..."

Format Example (Strictly follow this layout):
| S.No. | Company Name | Status | Appointment Date | Industry | State |
|---|---|---|---|---|---|
| 1 | EXAMPLE PVT LTD | Active | 01/01/2020 | Manufacturing | Maharashtra |`
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
              s_no: { type: Type.NUMBER },
              company_name: { type: Type.STRING },
              status: { type: Type.STRING },
              appointment_date: { type: Type.STRING },
              industry: { type: Type.STRING },
              state: { type: Type.STRING }
            }
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
- appointmentDate: Date ${directorName} was appointed as director (DD/MM/YYYY)
- cessationDate: Date ${directorName} ceased as director (DD/MM/YYYY), blank if still active

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
            appointmentDate: { type: Type.STRING },
            cessationDate: { type: Type.STRING },
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
