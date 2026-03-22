import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ReportView } from './components/ReportView';
import { TopBar } from './components/TopBar';
import { ManualChargeModal } from './components/ManualChargeModal';
import { CompanyData, ReportMetadata, FileStatus, Charge, UploadLog, Director, OtherCompany } from './types';
import { extractTextFromFile } from './utils/parsers';
import { parseCompanyFiles, fetchOtherDirectorships } from './utils/gemini';
import { numberToWords } from './utils/formatters';
import { exportToWord } from './utils/export';
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
  relatedParties: [],
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
      const otherCompanies: OtherCompany[] = (result.otherCompanies || []).map((c: any) => ({
        ...c,
        id: Math.random().toString(36).substr(2, 9),
        source: 'Auto-fetched'
      }));

      setCompanyData(prev => ({
        ...prev,
        directors: prev.directors.map(d => 
          d.din === director.din ? { 
            ...d, 
            otherCompanies, 
            isFetchingDirectorships: false 
          } : d
        )
      }));
    } catch (err) {
      console.error(`Error fetching directorships for ${director.name}:`, err);
      setCompanyData(prev => ({
        ...prev,
        directors: prev.directors.map(d => 
          d.din === director.din ? { 
            ...d, 
            isFetchingDirectorships: false,
            fetchError: 'Failed to fetch public records'
          } : d
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
              if (['directors', 'charges', 'relatedParties', 'fileAnalysis', 'authorizedCapitalWords', 'paidUpCapitalWords'].includes(key)) return;
              
              const newValue = parsedData[key];
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
            if (!existing) {
              chargeMap.set(c.id, {
                ...c,
                amountInWords: numberToWords(c.amountSecured || 0),
                sourceFile: fileContents[0].name
              });
              newChargesCount++;
            } else {
              // Merge missing fields
              const merged = { ...existing };
              let updated = false;
              Object.keys(c).forEach(k => {
                if (!(existing as any)[k] && (c as any)[k]) {
                  (merged as any)[k] = (c as any)[k];
                  updated = true;
                }
              });
              if (updated) {
                merged.amountInWords = numberToWords(merged.amountSecured || 0);
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

  const handleExportWord = async () => {
    try {
      await exportToWord(companyData, metadata);
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
        onGenerate={() => window.print()} 
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
