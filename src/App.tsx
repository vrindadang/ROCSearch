import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ReportView } from './components/ReportView';
import { TopBar } from './components/TopBar';
import { ManualChargeModal } from './components/ManualChargeModal';
import { CompanyData, ReportMetadata, FileStatus, Charge, UploadLog, Director, OtherCompany, CommonDirectorship, AssociateSubsidiary } from './types';
import { extractTextFromFile } from './utils/parsers';
import { parseCompanyFiles, fetchOtherDirectorships, fetchCompanyDetails } from './utils/gemini';
import { numberToWords } from './utils/formatters';
import { validateAndFixAmount } from './utils/validation';
import { generatePDF, generateWord } from './utils/exportUtils';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, CheckCircle2, Loader2, XCircle, Info, History } from 'lucide-react';

const INITIAL_COMPANY_DATA: CompanyData = {
  companyName: '',
  cin: '',
  registeredAddress: '',
  status: '',
  incorporationDate: '',
  companyClass: '',
  companyCategory: '',
  companySubCategory: '',
  industryDescription: '',
  authorizedCapital: 0,
  authorizedCapitalWords: '',
  paidUpCapital: 0,
  paidUpCapitalWords: '',
  email: '',
  lastAgmDate: '',
  lastBalanceSheetDate: '',
  directors: [],
  charges: [],
  associateSubsidiaries: [],
  commonDirectorships: [],
};

const INITIAL_METADATA: ReportMetadata = {
  clientName: '',
  referenceNumber: '',
  reportDate: new Date().toISOString().split('T')[0],
  udin: '',
};

export default function App() {
  const [companyData, setCompanyData] = useState<CompanyData>(INITIAL_COMPANY_DATA);
  const [metadata, setMetadata] = useState<ReportMetadata>(INITIAL_METADATA);
  const [files, setFiles] = useState<FileStatus[]>([]);
  const [uploadLogs, setUploadLogs] = useState<UploadLog[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addLog = (fileName: string, message: string, type: UploadLog['type'] = 'success') => {
    setUploadLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      fileName,
      message,
      type
    }, ...prev]);
  };

  const handleFetchDirectorships = async (director: Director) => {
    if (!director.din || (director.otherCompanies && director.otherCompanies.length > 0)) return;

    setCompanyData(prev => ({
      ...prev,
      directors: prev.directors.map(d => 
        d.din === director.din ? { ...d, isFetchingDirectorships: true, fetchProgress: "🔍 Searching for companies..." } : d
      )
    }));

    try {
      // Step 1: Get list of companies
      const result = await fetchOtherDirectorships(director.name, director.din);
      
      if (result && Array.isArray(result.otherCompanies)) {
        // Filter out subject company if it's already in the fetched list
        const otherCompaniesList = result.otherCompanies.filter((c: any) => {
          const companyName = companyData.companyName || "";
          const fetchedName = c.name || "";
          return fetchedName.toLowerCase() !== companyName.toLowerCase() &&
                 c.cin !== companyData.cin;
        });

        // Initialize with subject company as the first row
        let subjectIndustry = companyData.industryDescription || "";
        let subjectState = companyData.registeredAddress?.split(',').pop()?.trim() || "";

        // If subject info is missing, try to fetch it
        if (!subjectIndustry || !subjectState) {
          try {
            const subjectDetails = await fetchCompanyDetails(companyData.companyName, companyData.cin, director.name);
            if (!subjectIndustry) subjectIndustry = subjectDetails.industry || "";
            if (!subjectState) subjectState = subjectDetails.state || "";
          } catch (e) {
            console.error("Failed to fetch subject company details:", e);
          }
        }

        const subjectCompanyRow: OtherCompany = {
          id: 'subject-' + director.din,
          name: companyData.companyName,
          cin: companyData.cin,
          status: companyData.status || "Active",
          appointmentDate: director.appointmentDate || "",
          cessationDate: "",
          industry: subjectIndustry,
          state: subjectState,
          source: 'Auto-fetched'
        };

        // Start with just the subject company
        let currentOtherCompanies = [subjectCompanyRow];

        // Update state with initial list
        setCompanyData(prev => ({
          ...prev,
          directors: prev.directors.map(d => 
            d.din === director.din 
              ? { ...d, otherCompanies: currentOtherCompanies } 
              : d
          )
        }));

        // Step 2: Fetch details for each company sequentially
        for (let i = 0; i < otherCompaniesList.length; i++) {
          const company = otherCompaniesList[i];
          
          let details;
          // Only use the initial data if it has the critical fields
          if (company.hasFullDetails && company.industry && company.state && company.status && company.appointmentDate) {
            details = {
              status: company.status || "",
              appointmentDate: company.appointmentDate || "",
              cessationDate: "",
              industry: company.industry || "",
              state: company.state || ""
            };
          } else {
            // Update progress message
            setCompanyData(prev => ({
              ...prev,
              directors: prev.directors.map(d => 
                d.din === director.din 
                  ? { ...d, fetchProgress: `🔍 Fetching details for ${company.name}... (${i + 1}/${otherCompaniesList.length})` } 
                  : d
              )
            }));

            // Add a small delay between calls to avoid rate limiting
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 1500));
            }
            details = await fetchCompanyDetails(company.name, company.cin, director.name);
            
            // If still missing fields, merge with what we had
            if (company.hasFullDetails) {
              if (!details.status) details.status = company.status;
              if (!details.appointmentDate) details.appointmentDate = company.appointmentDate;
              if (!details.industry) details.industry = company.industry;
              if (!details.state) details.state = company.state;
            }
          }
          
          const enrichedCompany: OtherCompany = {
            id: Math.random().toString(36).substr(2, 9),
            name: company.name,
            cin: company.cin || "",
            status: details.status || "",
            appointmentDate: details.appointmentDate || "",
            cessationDate: details.cessationDate || "",
            industry: details.industry || "",
            state: details.state || "",
            source: 'Auto-fetched'
          };

          currentOtherCompanies = [...currentOtherCompanies, enrichedCompany];

          // Update state incrementally
          setCompanyData(prev => ({
            ...prev,
            directors: prev.directors.map(d => 
              d.din === director.din 
                ? { ...d, otherCompanies: currentOtherCompanies } 
                : d
            )
          }));
        }

        // If no other companies found, add a blank row for manual input
        if (currentOtherCompanies.length === 1) {
          setCompanyData(prev => ({
            ...prev,
            directors: prev.directors.map(d => 
              d.din === director.din 
                ? { 
                    ...d, 
                    otherCompanies: [
                      ...currentOtherCompanies,
                      { id: Math.random().toString(36).substr(2, 9), name: "", cin: "", status: "", appointmentDate: "", cessationDate: "", industry: "", state: "", source: 'Manually added' }
                    ] 
                  } 
                : d
            )
          }));
        }
      }
    } catch (error) {
      console.error("Error in handleFetchDirectorships:", error);
      setCompanyData(prev => ({
        ...prev,
        directors: prev.directors.map(d => 
          d.din === director.din ? { ...d, fetchError: "Failed to fetch directorships. Please try again or add manually." } : d
        )
      }));
    } finally {
      setCompanyData(prev => ({
        ...prev,
        directors: prev.directors.map(d => 
          d.din === director.din ? { ...d, isFetchingDirectorships: false, fetchProgress: "" } : d
        )
      }));
    }
  };

  const handleFileUpload = useCallback(async (uploadedFiles: File[]) => {
    const newFiles: FileStatus[] = uploadedFiles.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      name: f.name,
      status: 'pending',
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    setIsAnalyzing(true);
    setError(null);

    const extractionPromises = uploadedFiles.map(async (file, index) => {
      const fileId = newFiles[index].id;
      try {
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'parsing' } : f));
        const text = await extractTextFromFile(file);
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'success' } : f));
        return { name: file.name, content: text };
      } catch (err) {
        console.error(`Error parsing ${file.name}:`, err);
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error', error: 'Could not read file' } : f));
        return null;
      }
    });

    const results = await Promise.all(extractionPromises);
    const fileContents = results.filter((r): r is { name: string, content: string } => r !== null);

    if (fileContents.length > 0) {
      try {
        const parsedData = await parseCompanyFiles(fileContents);
        
        setCompanyData(prev => {
          const next = { ...prev };
          const fieldMetadata = { ...(prev.fieldMetadata || {}) };
          let fieldsFilled = 0;
          let fieldsOverwritten = 0;
          let newChargesCount = 0;
          let newDirectorsCount = 0;

          // 1. Merge basic fields
          if (parsedData && typeof parsedData === 'object') {
            Object.keys(parsedData).forEach(key => {
              if (['directors', 'charges', 'associateSubsidiaries', 'commonDirectorships', 'fileAnalysis', 'authorizedCapitalWords', 'paidUpCapitalWords'].includes(key)) return;
              
              let newValue = parsedData[key];
              
              // Validate and fix numbers if words are available
              if (key === 'authorizedCapital' && parsedData.authorizedCapitalWords) {
                newValue = validateAndFixAmount(newValue, parsedData.authorizedCapitalWords);
              } else if (key === 'paidUpCapital' && parsedData.paidUpCapitalWords) {
                newValue = validateAndFixAmount(newValue, parsedData.paidUpCapitalWords);
              }

              const oldValue = (prev as any)[key];

              if (!oldValue && newValue) {
                (next as any)[key] = newValue;
                fieldsFilled++;
              } else if (oldValue && newValue && String(newValue).length > String(oldValue).length && String(newValue).includes(String(oldValue))) {
                // More complete data
                (next as any)[key] = newValue;
                fieldMetadata[key] = {
                  needsVerification: true,
                  message: `Updated from ${fileContents[0].name} — please verify`
                };
                fieldsOverwritten++;
              }
            });
          }

          // 2. Merge Charges
          const chargeMap = new Map<string, Charge>();
          (prev.charges || []).forEach(c => chargeMap.set(c.id, c));

          (parsedData.charges || []).forEach((c: any) => {
            const existing = chargeMap.get(c.id);
            
            // Validate and fix amountSecured if amountInWords is available
            const validatedAmount = validateAndFixAmount(c.amountSecured || 0, c.amountInWords || '');
            
            if (!existing) {
              chargeMap.set(c.id, {
                ...c,
                amountSecured: validatedAmount,
                amountInWords: c.amountInWords || numberToWords(validatedAmount),
                sourceFile: fileContents[0].name
              });
              newChargesCount++;
            } else {
              // Merge missing fields
              const merged = { ...existing };
              let updated = false;
              Object.keys(c).forEach(k => {
                if (k === 'amountSecured') {
                  if (validatedAmount !== existing.amountSecured) {
                    merged.amountSecured = validatedAmount;
                    updated = true;
                  }
                } else if (!(existing as any)[k] && (c as any)[k]) {
                  (merged as any)[k] = (c as any)[k];
                  updated = true;
                }
              });
              if (updated) {
                merged.amountInWords = merged.amountInWords || numberToWords(merged.amountSecured || 0);
                merged.needsVerification = true;
                merged.verificationMessage = `Updated from ${fileContents[0].name} — please verify`;
                chargeMap.set(c.id, merged);
                fieldsOverwritten++;
              }
            }
          });
          next.charges = Array.from(chargeMap.values());

          // 3. Merge Directors
          const directorMap = new Map<string, Director>();
          (prev.directors || []).forEach(d => directorMap.set(d.din, d));

          (parsedData.directors || []).forEach((d: any) => {
            const existing = directorMap.get(d.din);
            if (!existing) {
              directorMap.set(d.din, { ...d, otherCompanies: d.otherCompanies || [] });
              newDirectorsCount++;
            } else {
              const merged = { ...existing };
              Object.keys(d).forEach(k => {
                if (!(existing as any)[k] && (d as any)[k]) {
                  (merged as any)[k] = (d as any)[k];
                }
              });
              directorMap.set(d.din, merged);
            }
          });
          next.directors = Array.from(directorMap.values());

          // 4. Merge Associate/Subsidiaries
          const associateMap = new Map<string, AssociateSubsidiary>();
          (prev.associateSubsidiaries || []).forEach(a => associateMap.set(a.cin || a.name, a));
          (parsedData.associateSubsidiaries || []).forEach((a: any) => {
            associateMap.set(a.cin || a.name, {
              ...a,
              id: Math.random().toString(36).substr(2, 9),
              source: 'Auto-fetched'
            });
          });
          next.associateSubsidiaries = Array.from(associateMap.values());

          next.fieldMetadata = fieldMetadata;

          // Log results
          fileContents.forEach(f => {
            const analysis = (parsedData?.fileAnalysis || []).find((a: any) => a.fileName === f.name);
            const type = analysis?.fileType || 'Document';
            let msg = `Filled ${fieldsFilled} fields, added ${newChargesCount} charges, added ${newDirectorsCount} directors — ${fieldsOverwritten} fields updated for completeness.`;
            if (analysis?.isBlankXfa) msg = "Detected as blank XFA template. No data extracted.";
            addLog(f.name, msg, analysis?.isBlankXfa ? 'warning' : 'success');
          });

          return next;
        });

        // Trigger directorship fetch for new directors
        if (parsedData && parsedData.directors && Array.isArray(parsedData.directors)) {
          parsedData.directors.forEach((d: any) => {
            handleFetchDirectorships(d);
          });
        }

      } catch (err) {
        console.error('AI Analysis Error:', err);
        setError('AI analysis failed. Please try again or enter details manually.');
      }
    }

    setIsAnalyzing(false);
  }, [addLog]);

  const handleAddManualCharge = (charge: Charge) => {
    setCompanyData(prev => ({
      ...prev,
      charges: [...(prev.charges || []), { ...charge, amountInWords: numberToWords(charge.amountSecured) }]
    }));
    setIsModalOpen(false);
  };

  const handlePrint = () => {
    generatePDF(companyData, metadata);
  };

  const handleExportWord = async () => {
    try {
      await generateWord(companyData, metadata);
    } catch (err) {
      console.error('Word Export Error:', err);
      setError('Failed to export Word document.');
    }
  };

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      <TopBar 
        metadata={metadata} 
        onMetadataChange={setMetadata} 
        onGenerate={handlePrint} 
        onExportWord={handleExportWord}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          files={files} 
          uploadLogs={uploadLogs}
          onFileUpload={handleFileUpload} 
          isAnalyzing={isAnalyzing}
          onAddManual={() => setIsModalOpen(true)}
        />
        
        <main className="flex-1 overflow-y-auto p-8 bg-gray-200 flex justify-center">
          <div className="w-full max-w-5xl">
            {error && (
              <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-center gap-3 text-red-700">
                <XCircle className="w-5 h-5" />
                <span>{error}</span>
              </div>
            )}
            
            <ReportView 
              data={companyData} 
              metadata={metadata} 
              onDataChange={(newData) => setCompanyData(prev => ({ ...prev, ...newData }))}
            />
          </div>
        </main>
      </div>

      <ManualChargeModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        onSave={handleAddManualCharge} 
      />
    </div>
  );
}
