import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ReportView } from './components/ReportView';
import { TopBar } from './components/TopBar';
import { ManualChargeModal } from './components/ManualChargeModal';
import { CompanyData, ReportMetadata, FileStatus, Charge, UploadLog, Director, OtherCompany, CommonDirectorship, AssociateSubsidiary } from './types';
import { extractTextFromFile } from './utils/parsers';
import { parseCompanyFiles, fetchOtherDirectorships } from './utils/gemini';
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
        d.din === director.din ? { ...d, isFetchingDirectorships: true } : d
      )
    }));

    try {
      const result = await fetchOtherDirectorships(director.name, director.din);
      
      setCompanyData(prev => {
        // Create subject company entry
        const subjectCompany: OtherCompany = {
          id: 'subject-' + director.din,
          name: prev.companyName,
          status: prev.status,
          appointmentDate: director.appointmentDate,
          industry: prev.industryDescription,
          state: prev.registeredAddress.split(',').pop()?.trim() || '',
          source: 'Auto-fetched'
        };

        const fetchedCompanies: OtherCompany[] = (result.otherCompanies || [])
          .filter((c: any) => c.name.toLowerCase() !== prev.companyName.toLowerCase()) // De-duplicate subject company
          .map((c: any) => ({
            ...c,
            id: Math.random().toString(36).substr(2, 9),
            source: 'Auto-fetched'
          }));

        let otherCompanies = [subjectCompany, ...fetchedCompanies];

        // If only subject company found, add an empty row for manual input as requested
        if (otherCompanies.length === 1) {
          otherCompanies.push({
            id: Math.random().toString(36).substr(2, 9),
            cin: '',
            name: '',
            status: '',
            appointmentDate: '',
            cessationDate: '',
            industry: '',
            state: '',
            source: 'Manually added'
          });
        }

        // Update director's other companies
        const updatedDirectors = prev.directors.map(d => 
          d.din === director.din ? { 
            ...d, 
            otherCompanies, 
            isFetchingDirectorships: false 
          } : d
        );

        // Recalculate common directorships
        const commonMap = new Map<string, CommonDirectorship>();
        // Existing common directorships (keep manual ones)
        (prev.commonDirectorships || []).forEach(cd => {
          if (cd.source === 'Manually added') commonMap.set(cd.name, cd);
        });

        // Collect all other companies from all directors
        const allOtherCompanies: Record<string, { name: string, status: string, age: string, state: string, directors: Set<string> }> = {};
        
        updatedDirectors.forEach(d => {
          (d.otherCompanies || []).forEach(oc => {
            if (oc.name.toLowerCase() === prev.companyName.toLowerCase()) return; // Skip subject company in common directorships

            if (!allOtherCompanies[oc.name]) {
              allOtherCompanies[oc.name] = {
                name: oc.name,
                status: oc.status,
                age: 'N/A',
                state: oc.state,
                directors: new Set()
              };
            }
            allOtherCompanies[oc.name].directors.add(d.name);
          });
        });

        Object.values(allOtherCompanies).forEach(oc => {
          commonMap.set(oc.name, {
            id: Math.random().toString(36).substr(2, 9),
            name: oc.name,
            status: oc.status,
            age: oc.age,
            state: oc.state,
            commonDirectorsCount: oc.directors.size,
            source: 'Auto-fetched'
          });
        });

        return {
          ...prev,
          directors: updatedDirectors,
          commonDirectorships: Array.from(commonMap.values())
        };
      });
    } catch (err) {
      console.error(`Error fetching directorships for ${director.name}:`, err);
      setCompanyData(prev => {
        // Even on error, add subject company
        const subjectCompany: OtherCompany = {
          id: 'subject-' + director.din,
          name: prev.companyName,
          status: prev.status,
          appointmentDate: director.appointmentDate,
          industry: prev.industryDescription,
          state: prev.registeredAddress.split(',').pop()?.trim() || '',
          source: 'Auto-fetched'
        };

        return {
          ...prev,
          directors: prev.directors.map(d => 
            d.din === director.din ? { 
              ...d, 
              otherCompanies: [
                subjectCompany,
                {
                  id: Math.random().toString(36).substr(2, 9),
                  cin: '',
                  name: '',
                  status: '',
                  appointmentDate: '',
                  cessationDate: '',
                  industry: '',
                  state: '',
                  source: 'Manually added'
                }
              ],
              isFetchingDirectorships: false,
              fetchError: 'Failed to fetch public records'
            } : d
          )
        };
      });
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

    const fileContents: { name: string, content: string }[] = [];
    const updatedFiles = [...newFiles];

    for (let i = 0; i < uploadedFiles.length; i++) {
      const file = uploadedFiles[i];
      const fileId = updatedFiles[i].id;

      try {
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'parsing' } : f));
        const text = await extractTextFromFile(file);
        fileContents.push({ name: file.name, content: text });
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'success' } : f));
      } catch (err) {
        console.error(`Error parsing ${file.name}:`, err);
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error', error: 'Could not read file' } : f));
      }
    }

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
