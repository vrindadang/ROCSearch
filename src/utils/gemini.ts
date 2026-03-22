import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/**
 * Attempts to repair truncated JSON by closing unclosed strings, arrays, and objects.
 */
function repairTruncatedJson(json: string): string {
  if (!json || json.trim() === "") return "{}";
  
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
      return "{}";
    }
  }

  // First pass: fix unescaped backslashes and bad escapes
  // This helps prevent "Bad escaped character" errors
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
  
  // Remove markdown code blocks if present
  // Handle both complete and truncated code blocks
  if (cleaned.includes('```json')) {
    cleaned = cleaned.split('```json')[1] || cleaned;
  } else if (cleaned.includes('```')) {
    cleaned = cleaned.split('```')[1] || cleaned;
  }
  
  // Remove any trailing backticks and everything after them
  if (cleaned.includes('```')) {
    cleaned = cleaned.split('```')[0];
  }
  
  cleaned = cleaned.trim();
  
  // Find the first actual JSON character
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
          amountInWords: { type: Type.STRING },
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
    const response = await ai.models.generateContent({
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
                 - For the "List of Continuing Charges," ONLY include charges explicitly listed as "Open" or "Continuing."
                 - If a Charge ID appears in a summary table but has no details in the "Particulars" section, set its details to "Not Available" (do not invent data).
                 - For "Modified" charges, use the LATEST "Amount Secured" from the modification entry, not the original creation entry.
              
              4. FORMATTING:
                 - Output all currency in standard Indian format (e.g., ₹ XX,XX,XXX) in your thinking/internal notes, but for the JSON fields, provide raw numbers for numeric fields and formatted strings for word fields.
                 - If data is missing in the source, write "Not Available" instead of leaving it blank or guessing.
              
              5. VALIDATION:
                 - Ensure the "Total Number of Open Charges" in the Highlights section exactly matches the number of rows in your "charges" array where status is "Open".
              
              CRITICAL INSTRUCTIONS FOR CHG FILES:
              1. Identify if a CHG file is TYPE A (Real Data) or TYPE B (Blank XFA Template).
              2. TYPE A files have filled CIN, Bank Name, Amounts, and Dates. Extract EVERYTHING from these.
              3. TYPE B files are empty templates. Mark them as isBlankXfa: true in fileAnalysis.
              
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
    });

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
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `Find other current and past directorships for ${name} (DIN ${din}).
              
              Search MCA India records via ZaubaCorp, Tofler, etc.
              
              SOURCES TO TRY:
              1. Zaubacorp: https://www.zaubacorp.com/director/${name.replace(/\s+/g, '-')}/${din}
              2. Tofler: https://www.tofler.in/director/${din}
              3. Google Search: "DIN ${din} ${name} directorships"
              
              Extract up to 20 most recent and relevant directorships.
              
              Extract:
              - Company Name
              - Company CIN (if available)
              - Status (Active/Strike Off/Amalgamated/Dissolved)
              - Appointment Date (DD/MM/YYYY)
              - Cessation Date (if no longer a director)
              - Industry/NIC
              - State/City
              
              Return ONLY a JSON object:
              {
                "otherCompanies": [
                  {
                    "name": "string",
                    "cin": "string",
                    "status": "string",
                    "appointmentDate": "string",
                    "cessationDate": "string",
                    "industry": "string",
                    "state": "string"
                  }
                ]
              }`
            }
          ]
        }
      ],
      config: {
        tools: [{ googleSearch: {} }],
        responseMimeType: "application/json",
        maxOutputTokens: 16384,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            otherCompanies: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  name: { type: Type.STRING },
                  cin: { type: Type.STRING },
                  status: { type: Type.STRING },
                  appointmentDate: { type: Type.STRING },
                  cessationDate: { type: Type.STRING },
                  industry: { type: Type.STRING },
                  state: { type: Type.STRING }
                }
              }
            }
          }
        }
      }
    });

    let text = response.text || "";
    text = cleanAndExtractJson(text);
    
    if (!text || text === "") return { otherCompanies: [] };

    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error("Directorships JSON parse failed, attempting to clean and repair text...", parseError);
      
      // Attempt to fix common JSON issues from LLMs
      // Remove ALL control characters including literal newlines which are invalid in JSON strings
      let cleanedText = text.replace(/[\u0000-\u001f]+/g, " "); 

      try {
        return JSON.parse(cleanedText);
      } catch (secondError) {
        console.error("Second directorships JSON parse attempt failed, attempting emergency repair...", secondError);
        try {
          const repairedText = repairTruncatedJson(cleanedText);
          return JSON.parse(repairedText);
        } catch (finalError) {
          console.error("Final directorships JSON parse attempt failed.", finalError);
          // If everything fails, return what we have or empty
          return { otherCompanies: [] };
        }
      }
    }
  } catch (err) {
    console.error("Error fetching directorships:", err);
    return { otherCompanies: [] };
  }
}
