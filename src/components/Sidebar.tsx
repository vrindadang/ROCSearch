import React, { useCallback, useState } from 'react';
import ReactDOM from 'react-dom';
import { FileStatus, UploadLog, Director, OtherCompany, PotentialRelatedParty } from '../types';
import { Upload, FileText, CheckCircle2, AlertTriangle, XCircle, Loader2, Plus, History, ChevronDown, ChevronUp, Info, Search, User, ExternalLink } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  activeTab: 'upload' | 'directors' | 'related-parties';
  setActiveTab: (tab: 'upload' | 'directors' | 'related-parties') => void;
  files: FileStatus[];
  uploadLogs: UploadLog[];
  onFileUpload: (files: File[]) => void;
  isAnalyzing: boolean;
  analysisProgress: number;
  onAddManual: () => void;
  directors?: Director[];
  pendingDirectorships?: Record<string, OtherCompany[]>;
  onApproveDirectorships?: (din: string) => void;
  onSearchDirector?: (director: Director, force?: boolean) => void;
  pendingRelatedParties?: PotentialRelatedParty[];
  isRelatedPartiesAppended?: boolean;
  onApproveRelatedParties?: () => void;
}

export function Sidebar({ 
  activeTab,
  setActiveTab,
  files = [], 
  uploadLogs = [], 
  onFileUpload, 
  isAnalyzing, 
  analysisProgress,
  onAddManual,
  directors = [],
  pendingDirectorships = {},
  onApproveDirectorships,
  onSearchDirector,
  pendingRelatedParties = [],
  isRelatedPartiesAppended = false,
  onApproveRelatedParties
}: SidebarProps) {
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [previewDin, setPreviewDin] = useState<string | null>(null);
  const [isPreviewRelatedPartiesOpen, setIsPreviewRelatedPartiesOpen] = useState(false);

  // Auto-switch to upload if directors are cleared
  React.useEffect(() => {
    if (directors.length === 0 && activeTab === 'directors') {
      setActiveTab('upload');
    }
  }, [directors.length, activeTab]);
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const droppedFiles = Array.from(e.dataTransfer.files) as File[];
    onFileUpload(droppedFiles);
  }, [onFileUpload]);

  const onFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      onFileUpload(Array.from(e.target.files));
    }
  }, [onFileUpload]);

  return (
    <aside className="w-80 bg-white border-r border-gray-200 flex flex-col h-full overflow-hidden">
      {/* Tabs Header */}
      <div className="flex border-b border-gray-200 bg-gray-50/50">
        <button 
          onClick={() => setActiveTab('upload')}
          className={cn(
            "flex-1 py-4 text-xs font-bold uppercase tracking-wider border-b-2 transition-all",
            activeTab === 'upload' 
              ? "border-navy text-navy bg-white" 
              : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100/50"
          )}
        >
          Upload MCA Files
        </button>
        {directors.length > 0 && (
          <button 
            onClick={() => setActiveTab('directors')}
            className={cn(
              "flex-1 py-4 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all relative",
              activeTab === 'directors' 
                ? "border-navy text-navy bg-white" 
                : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100/50"
            )}
          >
            Director Search
            {Object.keys(pendingDirectorships).length > 0 && (
              <span className="absolute top-3 right-2 bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded-full shadow-sm">
                {Object.keys(pendingDirectorships).length}
              </span>
            )}
          </button>
        )}
        {directors.some(d => (d.otherCompanies || []).length > 0) && (
          <button 
            onClick={() => setActiveTab('related-parties')}
            className={cn(
              "flex-1 py-4 text-[10px] font-bold uppercase tracking-wider border-b-2 transition-all relative",
              activeTab === 'related-parties' 
                ? "border-navy text-navy bg-white" 
                : "border-transparent text-gray-400 hover:text-gray-600 hover:bg-gray-100/50"
            )}
          >
            Related Parties
            {pendingRelatedParties.length > 0 && !isRelatedPartiesAppended && (
              <span className="absolute top-3 right-2 bg-emerald-500 text-white text-[8px] px-1.5 py-0.5 rounded-full shadow-sm">
                {pendingRelatedParties.length}
              </span>
            )}
          </button>
        )}
      </div>

      <div className="flex-1 flex flex-col overflow-hidden">
        <AnimatePresence mode="wait">
          {activeTab === 'upload' ? (
            <motion.div 
              key="upload-tab"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              className="flex flex-col h-full overflow-hidden"
            >
              <div className="p-6 border-b border-gray-100">
                <label 
                  onDragOver={e => e.preventDefault()}
                  onDrop={onDrop}
                  className={cn(
                    "flex flex-col items-center justify-center w-full h-32 border-2 border-dashed rounded-xl cursor-pointer transition-all",
                    "border-gray-300 bg-gray-50 hover:bg-gray-100 hover:border-[rgba(26,39,68,0.3)]",
                    isAnalyzing && "opacity-50 pointer-events-none"
                  )}
                >
                  <div className="flex flex-col items-center justify-center pt-5 pb-6">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <p className="text-sm text-gray-500">Drag & drop or <span className="text-navy font-medium">browse</span></p>
                    <p className="text-xs text-gray-400 mt-1">PDF, XML, MGT, DIR, CHG</p>
                  </div>
                  <input type="file" className="hidden" multiple onChange={onFileSelect} />
                </label>
                
                <button 
                  onClick={onAddManual}
                  className="mt-4 w-full flex items-center justify-center gap-2 py-2 px-4 bg-[rgba(26,39,68,0.05)] text-navy rounded-lg hover:bg-[rgba(26,39,68,0.1)] transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4" />
                  Add Manual Charge Entry
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <AnimatePresence initial={false}>
                  {files.map((file) => (
                    <motion.div
                      key={file.id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.95 }}
                      className="p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-3"
                    >
                      <div className="p-2 bg-white rounded-md shadow-sm">
                        <FileText className="w-4 h-4 text-gray-500" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          {file.status === 'pending' && <span className="text-xs text-gray-400">Waiting...</span>}
                          {file.status === 'parsing' && (
                            <div className="flex items-center gap-1.5">
                              <Loader2 className="w-3 h-3 animate-spin text-navy" />
                              <span className="text-xs text-navy">Analyzing...</span>
                            </div>
                          )}
                          {file.status === 'success' && (
                            <div className="flex items-center gap-1.5">
                              <CheckCircle2 className="w-3 h-3 text-emerald-500" />
                              <span className="text-xs text-emerald-600">✅ Success</span>
                            </div>
                          )}
                          {file.status === 'partial' && (
                            <div className="flex items-center gap-1.5">
                              <AlertTriangle className="w-3 h-3 text-amber-500" />
                              <span className="text-xs text-amber-600">🟡 Partial Data</span>
                            </div>
                          )}
                          {file.status === 'blank-xfa' && (
                            <div className="flex flex-col gap-2 mt-1">
                              <div className="flex items-center gap-1.5">
                                <AlertTriangle className="w-3 h-3 text-orange-500" />
                                <span className="text-xs text-orange-600 font-semibold">🟠 Blank Template</span>
                              </div>
                              <div className="p-2 bg-orange-50 border border-orange-100 rounded text-[10px] text-orange-800 leading-tight">
                                ⚠️ This CHG file is a blank form template. Please enter charge details manually.
                                <button 
                                  onClick={onAddManual}
                                  className="mt-1.5 w-full py-1 px-2 bg-orange-600 text-white rounded hover:bg-orange-700 transition-colors font-medium"
                                >
                                  Enter Details Manually
                                </button>
                              </div>
                            </div>
                          )}
                          {file.status === 'error' && (
                            <div className="flex flex-col gap-1 mt-1">
                              <div className="flex items-center gap-1.5">
                                <XCircle className="w-3 h-3 text-red-500" />
                                <span className="text-xs text-red-600 font-semibold">❌ Failed</span>
                              </div>
                              <p className="text-[10px] text-red-500 leading-tight bg-red-50 p-1.5 rounded border border-red-100">
                                {file.error || 'Could not read file'}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </AnimatePresence>
                
                {files.length === 0 && (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400 py-12">
                    <FileText className="w-12 h-12 mb-2 opacity-20" />
                    <p className="text-sm">No files uploaded yet</p>
                  </div>
                )}
              </div>

              {isAnalyzing && (
                <div className="p-4 bg-navy text-white">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span className="text-sm font-medium">AI Analysis in progress...</span>
                    </div>
                    <span className="text-xs font-bold">{analysisProgress}%</span>
                  </div>
                  <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
                    <motion.div 
                      className="bg-white h-full"
                      initial={{ width: "0%" }}
                      animate={{ width: `${analysisProgress}%` }}
                      transition={{ duration: 0.5, ease: "easeOut" }}
                    />
                  </div>
                </div>
              )}

              {/* Upload Log Panel */}
              <div className="border-t border-gray-200 bg-white">
                <button 
                  onClick={() => setIsLogsOpen(!isLogsOpen)}
                  className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="flex items-center gap-2 text-sm font-semibold text-gray-700">
                    <History className="w-4 h-4" />
                    <span>Upload Log</span>
                    {uploadLogs.length > 0 && (
                      <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full text-[10px]">
                        {uploadLogs.length}
                      </span>
                    )}
                  </div>
                  {isLogsOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </button>
                
                <AnimatePresence>
                  {isLogsOpen && (
                    <motion.div 
                      initial={{ height: 0 }}
                      animate={{ height: "auto" }}
                      exit={{ height: 0 }}
                      className="overflow-hidden bg-gray-50"
                    >
                      <div className="p-4 pt-0 max-h-60 overflow-y-auto space-y-3">
                        {uploadLogs.length === 0 ? (
                          <p className="text-xs text-gray-400 text-center py-4 italic">No logs available yet</p>
                        ) : (
                          uploadLogs.map(log => (
                            <div key={log.id} className="text-[11px] leading-relaxed border-b border-gray-200 pb-2 last:border-0">
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-bold text-gray-900 truncate max-w-[140px]">{log.fileName}</span>
                                <span className="text-gray-400">{log.timestamp}</span>
                              </div>
                              <div className="flex gap-1.5">
                                {log.type === 'success' && <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0 mt-0.5" />}
                                {log.type === 'info' && <Info className="w-3 h-3 text-blue-500 shrink-0 mt-0.5" />}
                                {log.type === 'warning' && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0 mt-0.5" />}
                                {log.type === 'error' && <XCircle className="w-3 h-3 text-red-500 shrink-0 mt-0.5" />}
                                <p className="text-gray-600">{log.message}</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          ) : (
            <motion.div 
              key="directors-tab"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex-1 overflow-y-auto p-4 space-y-3 bg-gray-50/30"
            >
              <div className="flex items-center gap-2 px-2 mb-4">
                <Search className="w-4 h-4 text-gray-400" />
                <h3 className="text-sm font-bold text-gray-700">Director Search Results</h3>
              </div>
              
              {directors.map(director => {
                const pending = pendingDirectorships[director.din];
                const isAppended = director.otherCompanies && director.otherCompanies.length > 0;
                
                return (
                  <div key={director.din} className="p-4 bg-white border border-gray-200 rounded-xl shadow-sm hover:border-navy/20 transition-all">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-gray-100 rounded-lg">
                          <User className="w-4 h-4 text-gray-600" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-bold text-gray-900 break-words leading-tight">{director.name}</p>
                          <p className="text-[11px] text-gray-500 font-medium">DIN: {director.din}</p>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-gray-50">
                      {director.isFetchingDirectorships ? (
                        <div className="flex items-center gap-2 text-navy">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span className="text-[11px] font-bold">Searching records...</span>
                        </div>
                      ) : pending ? (
                        <button
                          onClick={() => setPreviewDin(director.din)}
                          className="w-full py-2 px-4 bg-emerald-600 text-white rounded-lg text-[11px] font-bold hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-sm shadow-emerald-100"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Review & Approve
                        </button>
                      ) : isAppended ? (
                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg w-full justify-center">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span className="text-[11px] font-bold uppercase tracking-tight">Appended to Report</span>
                        </div>
                      ) : director.hasFetchedDirectorships ? (
                        <div className="flex flex-col gap-2 w-full">
                          <div className="flex items-center gap-2 text-gray-500 bg-gray-100 px-3 py-1.5 rounded-lg w-full justify-center">
                            <Info className="w-3.5 h-3.5" />
                            <span className="text-[11px] font-bold uppercase tracking-tight">No Records Found</span>
                          </div>
                          <button
                            onClick={() => onSearchDirector?.(director, true)}
                            className="w-full py-1.5 px-3 border border-navy/20 text-navy rounded-lg text-[10px] font-bold hover:bg-navy/5 transition-all flex items-center justify-center gap-1.5"
                          >
                            <Search className="w-3 h-3" />
                            Re-search Records
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-gray-400 px-3 py-1.5 italic w-full justify-center">
                          <Loader2 className="w-3.5 h-3.5 animate-spin opacity-50" />
                          <span className="text-[11px]">Waiting for analysis...</span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </motion.div>
          )}

          {activeTab === 'related-parties' && (
            <motion.div 
              key="related-parties-tab"
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-all group">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-navy/5 flex items-center justify-center text-navy group-hover:bg-navy group-hover:text-white transition-all">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-gray-900">Potential Related Parties</h4>
                      <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Cross-referenced from directors</p>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {isRelatedPartiesAppended ? (
                    <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 px-3 py-1.5 rounded-lg w-full justify-center">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span className="text-[11px] font-bold uppercase tracking-tight">Appended to Report</span>
                    </div>
                  ) : pendingRelatedParties.length > 0 ? (
                    <button 
                      onClick={() => setIsPreviewRelatedPartiesOpen(true)}
                      className="w-full py-2 bg-navy text-white rounded-lg text-[11px] font-bold hover:bg-navy/90 transition-all flex items-center justify-center gap-2 shadow-sm"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Review & Approve ({pendingRelatedParties.length})
                    </button>
                  ) : (
                    <div className="flex items-center gap-2 text-gray-400 px-3 py-1.5 italic w-full justify-center">
                      <Loader2 className="w-3.5 h-3.5 animate-spin opacity-50" />
                      <span className="text-[11px]">Waiting for director data...</span>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      {/* Directorships Preview Modal */}
      {previewDin && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  Directorships — {directors.find(d => d.din === previewDin)?.name}
                </h3>
                <p className="text-sm text-gray-500 mt-1">
                  DIN: {previewDin} • {pendingDirectorships[previewDin]?.length || 0} directorships found — review before appending to report
                </p>
              </div>
              <button 
                onClick={() => setPreviewDin(null)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <XCircle className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-12 text-center">S.No</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Current Company</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-24">Status</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-32">Appointment Date</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Industry</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-32">State</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {(!pendingDirectorships[previewDin] || pendingDirectorships[previewDin].length === 0) ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center gap-2 text-gray-400">
                            <Search className="w-8 h-8 opacity-20" />
                            <p className="text-sm font-medium">No other directorships found for this DIN</p>
                            <p className="text-xs">The search tool couldn't find any additional records.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      pendingDirectorships[previewDin]?.map((company, idx) => (
                        <tr key={company.id} className="hover:bg-gray-50/50 transition-colors">
                          <td className="px-4 py-3 text-sm text-gray-500 text-center">{idx + 1}</td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-bold text-gray-900">{company.name}</p>
                            <p className="text-[10px] text-gray-400 font-mono">{company.cin}</p>
                          </td>
                          <td className="px-4 py-3">
                            <span className={cn(
                              "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                              company.status?.toLowerCase() === 'active' ? "bg-emerald-100 text-emerald-700" :
                              company.status?.toLowerCase().includes('strike') ? "bg-red-100 text-red-700" :
                              "bg-amber-100 text-amber-700"
                            )}>
                              {company.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-600">{company.appointmentDate}</td>
                          <td className="px-4 py-3 text-sm text-gray-600 leading-tight">{company.industry}</td>
                          <td className="px-4 py-3 text-sm text-gray-600">{company.state}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-4">
              <button
                onClick={() => setPreviewDin(null)}
                className="px-6 py-2.5 text-sm font-bold text-gray-600 hover:bg-gray-200 rounded-xl transition-colors flex items-center gap-2"
              >
                <XCircle className="w-4 h-4" />
                Cancel
              </button>
              <button
                onClick={() => {
                  if (onApproveDirectorships) {
                    onApproveDirectorships(previewDin);
                    setPreviewDin(null);
                  }
                }}
                className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 shadow-lg shadow-emerald-200 transition-all flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve & Append to Report
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
      {/* Related Parties Preview Modal */}
      {isPreviewRelatedPartiesOpen && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden"
          >
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <h3 className="text-xl font-bold text-gray-900">Potential Related Parties</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {pendingRelatedParties.length} companies identified with common directors — review before appending to report
                </p>
              </div>
              <button 
                onClick={() => setIsPreviewRelatedPartiesOpen(false)}
                className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              >
                <XCircle className="w-6 h-6 text-gray-400" />
              </button>
            </div>

            <div className="flex-1 overflow-auto p-6">
              <div className="border border-gray-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-12 text-center">S.No</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider">Current Company</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-24">Status</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-32">Age of Company (Years)</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-32">State</th>
                      <th className="px-4 py-3 text-[11px] font-bold text-gray-500 uppercase tracking-wider w-40 text-center">No. of Common Directors</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {pendingRelatedParties.map((company, idx) => (
                      <tr key={company.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="px-4 py-3 text-sm text-gray-500 text-center">{idx + 1}</td>
                        <td className="px-4 py-3">
                          <p className="text-sm font-bold text-gray-900">{company.name}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={cn(
                            "px-2 py-0.5 rounded-full text-[10px] font-bold uppercase",
                            company.status?.toLowerCase() === 'active' ? "bg-emerald-100 text-emerald-700" :
                            company.status?.toLowerCase().includes('strike') ? "bg-red-100 text-red-700" :
                            "bg-amber-100 text-amber-700"
                          )}>
                            {company.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{company.age}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{company.state}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 font-bold text-center">{company.commonDirectorsCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="p-6 border-t border-gray-100 bg-gray-50/50 flex items-center justify-between gap-4">
              <button 
                onClick={() => setIsPreviewRelatedPartiesOpen(false)}
                className="px-6 py-2.5 border border-gray-200 text-gray-600 rounded-xl text-sm font-bold hover:bg-gray-100 transition-all"
              >
                Cancel
              </button>
              <button 
                onClick={() => {
                  onApproveRelatedParties?.();
                  setIsPreviewRelatedPartiesOpen(false);
                }}
                className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-200 flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" />
                Approve & Append to Report
              </button>
            </div>
          </motion.div>
        </div>,
        document.body
      )}
    </aside>
  );
}
