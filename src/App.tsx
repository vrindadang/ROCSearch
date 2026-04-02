import React, { useState, useEffect, useCallback } from 'react';
import { Sidebar } from './components/Sidebar';
import { ReportView } from './components/ReportView';
import { TopBar } from './components/TopBar';
import { LoginPage } from './components/LoginPage';
import { UserManagementModal } from './components/UserManagementModal';
import { ManualChargeModal } from './components/ManualChargeModal';
import { CompanyData, ReportMetadata, FileStatus, Charge, UploadLog, Director, OtherCompany, CommonDirectorship, AssociateSubsidiary, PotentialRelatedParty, UserAccount } from './types';
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
  potentialRelatedParties: [],
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
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'upload' | 'director-search' | 'related-parties'>('upload');
  const [pendingDirectorships, setPendingDirectorships] = useState<Record<string, OtherCompany[]>>({});
  const [pendingRelatedParties, setPendingRelatedParties] = useState<PotentialRelatedParty[]>([]);
  const [approvedRelatedParties, setApprovedRelatedParties] = useState<PotentialRelatedParty[]>([]);
  const [isRelatedPartiesAppended, setIsRelatedPartiesAppended] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => {
    return localStorage.getItem('is_authenticated') === 'true';
  });
  const [user, setUser] = useState<string | null>(() => {
    return localStorage.getItem('auth_user');
  });
  const [users, setUsers] = useState<UserAccount[]>(() => {
    const stored = localStorage.getItem('app_users');
    if (stored) {
      try {
        return JSON.parse(stored);
      } catch (e) {
        console.error('Failed to parse stored users', e);
      }
    }
    return [
      { id: '1', username: 'admin', password: 'password123', role: 'admin', createdAt: new Date().toISOString() },
      { id: '2', username: 'user', password: 'password123', role: 'user', createdAt: new Date().toISOString() }
    ];
  });
  const [isUserModalOpen, setIsUserModalOpen] = useState(false);

  const handleLogin = (username: string) => {
    setIsAuthenticated(true);
    setUser(username);
    localStorage.setItem('is_authenticated', 'true');
    localStorage.setItem('auth_user', username);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setUser(null);
    localStorage.removeItem('is_authenticated');
    localStorage.removeItem('auth_user');
  };

  const handleSaveUser = (userData: Partial<UserAccount>) => {
    let updatedUsers: UserAccount[];
    if (userData.id) {
      updatedUsers = users.map(u => u.id === userData.id ? { ...u, ...userData } as UserAccount : u);
    } else {
      const newUser: UserAccount = {
        id: Math.random().toString(36).substr(2, 9),
        username: userData.username!,
        password: userData.password!,
        role: userData.role || 'user',
        createdAt: new Date().toISOString()
      };
      updatedUsers = [...users, newUser];
    }
    setUsers(updatedUsers);
    localStorage.setItem('app_users', JSON.stringify(updatedUsers));
  };

  const handleDeleteUser = (id: string) => {
    const updatedUsers = users.filter(u => u.id !== id);
    setUsers(updatedUsers);
    localStorage.setItem('app_users', JSON.stringify(updatedUsers));
  };

  const addLog = (fileName: string, message: string, type: UploadLog['type'] = 'success') => {
    setUploadLogs(prev => [{
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toLocaleTimeString(),
      fileName,
      message,
      type
    }, ...prev]);
  };

  const handleFetchDirectorships = async (director: Director, force?: boolean, currentCompanyName?: string, currentCin?: string) => {
    const isAppended = director.otherCompanies && director.otherCompanies.length > 0;
    if (!director.din || (pendingDirectorships[director.din] && !force) || (director.hasFetchedDirectorships && !force) || (isAppended && !force)) return;

    // If total directorships is 0, we don't need to fetch anything
    if (director.totalDirectorships === 0) {
      setPendingDirectorships(prev => ({
        ...prev,
        [director.din]: []
      }));
      return;
    }

    const targetCompanyName = currentCompanyName || companyData.companyName;
    const targetCin = currentCin || companyData.cin;

    setCompanyData(prev => ({
      ...prev,
      directors: prev.directors.map(d => 
        d.din === director.din ? { ...d, isFetchingDirectorships: true, hasFetchedDirectorships: false, fetchProgress: "🔍 Searching for companies..." } : d
      )
    }));

    try {
      const result = await fetchOtherDirectorships(director.name, director.din, director.totalDirectorships, targetCompanyName);
      
      if (result && Array.isArray(result.otherCompanies)) {
        let otherCompaniesList = [...result.otherCompanies];
        
        // Ensure the current company is in the list
        const hasCurrentCompany = otherCompaniesList.some((c: any) => {
          const fetchedName = (c.name || "").toLowerCase();
          const currentName = (targetCompanyName || "").toLowerCase();
          return fetchedName === currentName || (c.cin && c.cin === targetCin);
        });

        if (!hasCurrentCompany && targetCompanyName) {
          otherCompaniesList.unshift({
            name: targetCompanyName,
            cin: targetCin || "",
            status: companyData.status || "Active",
            appointmentDate: director.appointmentDate || "",
            industry: companyData.industryDescription || "Business Services",
            state: "Unknown",
            source: 'Auto-fetched'
          });
        }

        // Map to OtherCompany type
        const completeArray: OtherCompany[] = otherCompaniesList.map((c: any) => ({
          id: Math.random().toString(36).substr(2, 9),
          name: c.name,
          cin: c.cin || "",
          status: c.status || "Active",
          appointmentDate: c.appointmentDate || "",
          cessationDate: c.cessationDate || "",
          industry: c.industry || "Business Services",
          state: c.state || "Unknown",
          source: 'Auto-fetched'
        }));

        setPendingDirectorships(prev => ({
          ...prev,
          [director.din]: completeArray
        }));
      } else {
        // Even if empty, at least add the current company
        const defaultCompany: OtherCompany[] = [{
          id: Math.random().toString(36).substr(2, 9),
          name: targetCompanyName || "",
          cin: targetCin || "",
          status: companyData.status || "Active",
          appointmentDate: director.appointmentDate || "",
          cessationDate: "",
          industry: companyData.industryDescription || "Business Services",
          state: "Unknown",
          source: 'Auto-fetched'
        }];

        setPendingDirectorships(prev => ({
          ...prev,
          [director.din]: defaultCompany
        }));
      }
    } catch (error: any) {
      console.error("Error in handleFetchDirectorships:", error);
      const isUnavailable = JSON.stringify(error).includes("503") || JSON.stringify(error).includes("UNAVAILABLE");
      const errorMsg = isUnavailable 
        ? "AI model busy. Please try again in a moment." 
        : "Failed to fetch directorships.";
        
      setCompanyData(prev => ({
        ...prev,
        directors: prev.directors.map(d => 
          d.din === director.din ? { ...d, fetchError: errorMsg } : d
        )
      }));
    } finally {
      setCompanyData(prev => ({
        ...prev,
        directors: prev.directors.map(d => 
          d.din === director.din ? { ...d, isFetchingDirectorships: false, hasFetchedDirectorships: true, fetchProgress: "" } : d
        )
      }));
    }
  };

  const handleApprovePendingDirectorships = (din: string) => {
    const pending = pendingDirectorships[din];
    if (!pending) return;

    setCompanyData(prev => ({
      ...prev,
      directors: prev.directors.map(d => 
        d.din === din 
          ? { ...d, otherCompanies: pending, hasFetchedDirectorships: true }
          : d
      )
    }));

    setPendingDirectorships(prev => {
      const next = { ...prev };
      delete next[din];
      return next;
    });
  };

  const handleFileUpload = useCallback(async (uploadedFiles: File[]) => {
    const newFiles: FileStatus[] = uploadedFiles.map(f => ({
      id: Math.random().toString(36).substr(2, 9),
      name: f.name,
      status: 'pending',
    }));
    
    setFiles(prev => [...prev, ...newFiles]);
    setIsAnalyzing(true);
    setAnalysisProgress(5);
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
        const errorMessage = err instanceof Error ? err.message : 'Could not read file';
        setFiles(prev => prev.map(f => f.id === fileId ? { ...f, status: 'error', error: errorMessage } : f));
        return null;
      }
    });

    const results = await Promise.all(extractionPromises);
    setAnalysisProgress(20);
    const fileContents = results.filter((r): r is { name: string, content: string } => r !== null);

    if (fileContents.length > 0) {
      try {
        const parsedData = await parseCompanyFiles(fileContents);
        setAnalysisProgress(50);
        
        // Calculate the new state locally first
        let fieldsFilled = 0;
        let fieldsOverwritten = 0;
        let newChargesCount = 0;
        let newDirectorsCount = 0;

        setCompanyData(prev => {
          const next = { ...prev };
          const fieldMetadata = { ...(prev.fieldMetadata || {}) };

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

          // Trigger directorship fetch ONLY for BRAND NEW directors
          // We do this INSIDE the updater to have access to the most recent state
          if (parsedData && parsedData.directors && Array.isArray(parsedData.directors)) {
            const newDirectors = parsedData.directors.filter((d: any) => 
              !prev.directors?.some(existing => existing.din === d.din)
            );

            if (newDirectors.length > 0) {
              // We can't await here, so we fire and forget, but we use the 'next' state
              setTimeout(async () => {
                try {
                  for (let i = 0; i < newDirectors.length; i++) {
                    const d = newDirectors[i];
                    const current = next.directors.find((dir: any) => dir.din === d.din);
                    if (current) {
                      await handleFetchDirectorships(current, false, next.companyName, next.cin);
                    }
                    setAnalysisProgress(50 + Math.round(((i + 1) / newDirectors.length) * 50));
                  }
                } finally {
                  setAnalysisProgress(100);
                  setTimeout(() => {
                    setIsAnalyzing(false);
                    setAnalysisProgress(0);
                  }, 1000);
                }
              }, 0);
            } else {
              setAnalysisProgress(100);
              setTimeout(() => {
                setIsAnalyzing(false);
                setAnalysisProgress(0);
              }, 1000);
            }
          } else {
            setAnalysisProgress(100);
            setTimeout(() => {
              setIsAnalyzing(false);
              setAnalysisProgress(0);
            }, 1000);
          }

          // Log results
          fileContents.forEach(f => {
            const analysis = (parsedData?.fileAnalysis || []).find((a: any) => a.fileName === f.name);
            let msg = `Filled ${fieldsFilled} fields, added ${newChargesCount} charges, added ${newDirectorsCount} directors — ${fieldsOverwritten} fields updated for completeness.`;
            if (analysis?.isBlankXfa) msg = "Detected as blank XFA template. No data extracted.";
            addLog(f.name, msg, analysis?.isBlankXfa ? 'warning' : 'success');
          });

          return next;
        });
      } catch (err: any) {
        console.error('AI Analysis Error:', err);
        const isUnavailable = JSON.stringify(err).includes("503") || JSON.stringify(err).includes("UNAVAILABLE");
        if (isUnavailable) {
          setError('The AI model is currently experiencing high demand. Please wait a moment and try again.');
        } else {
          setError('AI analysis failed. Please try again or enter details manually.');
        }
        setIsAnalyzing(false);
        setAnalysisProgress(0);
      }
    } else {
      setIsAnalyzing(false);
      setAnalysisProgress(0);
    }
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

  const handleApprovePendingRelatedParties = () => {
    setCompanyData(prev => ({
      ...prev,
      potentialRelatedParties: pendingRelatedParties
    }));
    setIsRelatedPartiesAppended(true);
  };

  // Compute potential related parties whenever directors' otherCompanies change
  useEffect(() => {
    const directors = companyData.directors || [];
    const companyMap = new Map<string, {
      name: string;
      status: string;
      state: string;
      directors: Set<string>;
      cin?: string;
    }>();

    // First pass: Map names to CINs to ensure consistent keys even if CIN is missing in some records
    const nameToCin = new Map<string, string>();
    directors.forEach(director => {
      (director.otherCompanies || []).forEach(oc => {
        if (oc.cin && oc.cin.trim()) {
          nameToCin.set(oc.name.toUpperCase().trim(), oc.cin.toUpperCase().trim());
        }
      });
    });

    directors.forEach(director => {
      if (director.otherCompanies && director.otherCompanies.length > 0) {
        director.otherCompanies.forEach(oc => {
          const normalizedName = oc.name.toUpperCase().trim();
          // Use CIN as key if available (either in this record or found in another record for same name)
          // Fallback to normalized name
          const key = nameToCin.get(normalizedName) || normalizedName;
          
          if (!companyMap.has(key)) {
            companyMap.set(key, {
              name: oc.name,
              status: oc.status,
              state: oc.state,
              directors: new Set(),
              cin: oc.cin || nameToCin.get(normalizedName)
            });
          }
          companyMap.get(key)!.directors.add(director.name);
        });
      }
    });

    const calculateAgeFromCin = (cin?: string) => {
      if (!cin || cin.length < 10) return "N/A";
      const yearStr = cin.substring(6, 10);
      const year = parseInt(yearStr);
      if (isNaN(year)) return "N/A";
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      const age = currentYear - year + (currentMonth / 12);
      return `${age.toFixed(1)} Years`;
    };

    const relatedParties: PotentialRelatedParty[] = Array.from(companyMap.values())
      .filter(c => c.directors.size > 0) // Should always be true if it's in the map
      .map(c => ({
        id: Math.random().toString(36).substr(2, 9),
        name: c.name,
        status: c.status,
        age: calculateAgeFromCin(c.cin),
        state: c.state,
        commonDirectorsCount: c.directors.size,
        source: 'Auto-fetched' as const
      }))
      .sort((a, b) => b.commonDirectorsCount - a.commonDirectorsCount);

    setPendingRelatedParties(relatedParties);
  }, [companyData.directors]);

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden">
      <TopBar 
        metadata={metadata} 
        onMetadataChange={setMetadata} 
        onGenerate={handlePrint} 
        onExportWord={handleExportWord}
        onLogout={handleLogout}
        onManageUsers={() => setIsUserModalOpen(true)}
        user={user || ''}
        isAdmin={user === 'admin' || users.find(u => u.username === user)?.role === 'admin'}
      />

      <UserManagementModal
        isOpen={isUserModalOpen}
        onClose={() => setIsUserModalOpen(false)}
        users={users}
        onSaveUser={handleSaveUser}
        onDeleteUser={handleDeleteUser}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <Sidebar 
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          files={files} 
          uploadLogs={uploadLogs}
          onFileUpload={handleFileUpload} 
          isAnalyzing={isAnalyzing}
          analysisProgress={analysisProgress}
          onAddManual={() => setIsModalOpen(true)}
          directors={companyData.directors}
          pendingDirectorships={pendingDirectorships}
          onApproveDirectorships={handleApprovePendingDirectorships}
          onSearchDirector={handleFetchDirectorships}
          pendingRelatedParties={pendingRelatedParties}
          isRelatedPartiesAppended={isRelatedPartiesAppended}
          onApproveRelatedParties={handleApprovePendingRelatedParties}
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
              relatedParties={approvedRelatedParties}
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
