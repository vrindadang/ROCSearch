import React, { useCallback } from 'react';
import { FileStatus, UploadLog } from '../types';
import { Upload, FileText, CheckCircle2, AlertTriangle, XCircle, Loader2, Plus, History, ChevronDown, ChevronUp, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface SidebarProps {
  files: FileStatus[];
  uploadLogs: UploadLog[];
  onFileUpload: (files: File[]) => void;
  isAnalyzing: boolean;
  onAddManual: () => void;
}

export function Sidebar({ files = [], uploadLogs = [], onFileUpload, isAnalyzing, onAddManual }: SidebarProps) {
  const [isLogsOpen, setIsLogsOpen] = React.useState(false);
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
      <div className="p-6 border-b border-gray-100">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Upload MCA Files</h2>
        
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
                    <div className="flex items-center gap-1.5">
                      <XCircle className="w-3 h-3 text-red-500" />
                      <span className="text-xs text-red-600">❌ Failed</span>
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
          <div className="flex items-center gap-3 mb-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm font-medium">AI Analysis in progress...</span>
          </div>
          <div className="w-full bg-white/20 h-1.5 rounded-full overflow-hidden">
            <motion.div 
              className="bg-white h-full"
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: 10, ease: "linear" }}
            />
          </div>
        </div>
      )}

      {/* Upload Log Panel */}
      <div className="border-t border-gray-200">
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
    </aside>
  );
}
