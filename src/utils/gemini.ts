import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

/**
 * Attempts to repair truncated JSON by closing unclosed strings, arrays, and objects.
 */
function repairTruncatedJson(json: string): string {
  let result = json.trim();
  
  const stack: string[] = [];
  let inString = false;
  let escaped = false;
  
  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    
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
      if (char === '{') {
        stack.push('}');
      } else if (char === '[') {
        stack.push(']');
      } else if (char === '}' || char === ']') {
        if (stack.length > 0 && stack[stack.length - 1] === char) {
          stack.pop();
        }
      }
    }
  }
  
  // If we are in a string, we need to close it.
  if (inString) {
    // If we ended on an escape character, remove it as it's partial
    if (escaped) {
      result = result.slice(0, -1);
    }
    // Also check for partial unicode escapes \uXXXX
    const lastBackslash = result.lastIndexOf('\\');
    if (lastBackslash !== -1 && lastBackslash >= result.length - 5) {
      const sub = result.substring(lastBackslash);
      if (sub.startsWith('\\u')) {
        result = result.slice(0, lastBackslash);
      }
    }
    result += '"';
  }
  
  // Now handle the stack.
  // Before closing objects/arrays, remove trailing commas or colons which are invalid at the end of a truncated JSON.
  if (!inString) {
    result = result.trim();
    while (result.length > 0 && (result.endsWith(',') || result.endsWith(':'))) {
      result = result.slice(0, -1).trim();
    }
  }
  
  // Close everything in the stack
  for (let i = stack.length - 1; i >= 0; i--) {
    result += stack[i];
  }
  
  return result;
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
    paidUpCapital: { type: Type.NUMBER },
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
    relatedParties: {
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
              
              CRITICAL INSTRUCTIONS FOR CHG FILES:
              1. Identify if a CHG file is TYPE A (Real Data) or TYPE B (Blank XFA Template).
              2. TYPE A files have filled CIN, Bank Name, Amounts, and Dates. Extract EVERYTHING from these.
              3. TYPE B files are empty templates. Mark them as isBlankXfa: true in fileAnalysis.
              4. For TYPE A CHG files, extract: Charge ID, SRN, Bank Name/Address, Amount, Property Charged, Terms, Margin, Repayment Terms, Extent, Dates, Status, Type of Charge, Rate of Interest.
              
              DATA SOURCE PRIORITY:
              - If a charge is in a TYPE A CHG file, use that as the primary source for details.
              - Use Master Data for the full list of charges (Charge Index).
              - Use MGT-7 for supporting info.
              
              Documents:
              ${combinedText}`
            }
          ]
        }
      ],
      config: {
        systemInstruction: "You are an expert ROC Search Report generator. You extract data from MCA portal documents with 100% accuracy. You MUST return a valid JSON object matching the provided schema. For CHG files, distinguish between real data and blank templates. If a file is a blank XFA template (no CIN/Name filled), mark it as isBlankXfa: true. Ensure all strings are properly escaped. Do not truncate.",
        responseMimeType: "application/json",
        responseSchema: companySchema,
        maxOutputTokens: 8192,
        thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }
      }
    });

    let text = response.text || "";
    
    // Basic cleaning of the response text
    text = text.trim();
    
    // Remove markdown code blocks if present
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      text = jsonMatch[1];
    }
    
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error("Initial JSON parse failed, attempting to clean and repair text...", parseError);
      
      // Attempt to fix common JSON issues from LLMs
      let cleanedText = text.replace(/[\u0000-\u0019]+/g, " "); // Remove control characters

      try {
        return JSON.parse(cleanedText);
      } catch (secondError) {
        console.error("Second JSON parse attempt failed, attempting emergency repair...", secondError);
        try {
          const repairedText = repairTruncatedJson(cleanedText);
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
              text: `Find other current and past directorships for the director with DIN ${din} and name ${name}.
              
              Search query: "DIN ${din} ${name} directorships MCA India"
              
              Check sources like ZaubaCorp, Tofler, and MCA.gov.in.
              
              Extract for each directorship:
              - Company Name
              - Company Status (Active / Strike Off / Amalgamated / etc.)
              - Date of Appointment
              - Industry / NIC Description
              - State
              
              Return a JSON array of objects matching this schema:
              {
                "otherCompanies": [
                  {
                    "name": "string",
                    "status": "string",
                    "appointmentDate": "string",
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
        responseSchema: {
          type: Type.OBJECT,
          properties: {
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
            }
          }
        }
      }
    });

    let text = response.text || "";
    
    // Basic cleaning of the response text
    text = text.trim();
    
    // Remove markdown code blocks if present
    const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/) || text.match(/```\s*([\s\S]*?)\s*```/);
    if (jsonMatch) {
      text = jsonMatch[1];
    }
    
    try {
      return JSON.parse(text);
    } catch (parseError) {
      console.error("Directorships JSON parse failed, attempting to clean and repair text...", parseError);
      
      // Attempt to fix common JSON issues from LLMs
      let cleanedText = text.replace(/[\u0000-\u0019]+/g, " "); // Remove control characters

      try {
        return JSON.parse(cleanedText);
      } catch (secondError) {
        console.error("Second directorships JSON parse attempt failed, attempting emergency repair...", secondError);
        try {
          const repairedText = repairTruncatedJson(cleanedText);
          return JSON.parse(repairedText);
        } catch (finalError) {
          console.error("Final directorships JSON parse attempt failed.", finalError);
          return { otherCompanies: [] };
        }
      }
    }
  } catch (err) {
    console.error("Error fetching directorships:", err);
    throw err;
  }
}
