import React from 'react';
import { ReportMetadata } from '../types';
import { FileText, Download, Printer, Share2, FileDown } from 'lucide-react';

interface TopBarProps {
  metadata: ReportMetadata;
  onMetadataChange: (metadata: ReportMetadata) => void;
  onGenerate: () => void;
  onExportWord: () => void;
}

export function TopBar({ metadata, onMetadataChange, onGenerate, onExportWord }: TopBarProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 no-print">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-navy rounded-lg flex items-center justify-center text-white font-bold text-xl font-serif">
          G
        </div>
        <div>
          <h1 className="text-lg font-bold text-navy leading-none font-serif">Girdhar & Co.</h1>
          <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mt-1">Chartered Accountants</p>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="flex flex-col">
            <label className="text-[10px] text-gray-500 uppercase font-bold">Client Name</label>
            <input 
              type="text" 
              value={metadata.clientName}
              onChange={e => onMetadataChange({ ...metadata, clientName: e.target.value })}
              placeholder="Enter Client Name"
              className="text-sm font-medium border-b border-transparent hover:border-gray-300 focus:border-navy focus:outline-none transition-colors"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] text-gray-500 uppercase font-bold">Ref Number</label>
            <input 
              type="text" 
              value={metadata.referenceNumber}
              onChange={e => onMetadataChange({ ...metadata, referenceNumber: e.target.value })}
              placeholder="G&C/ROC/2026/001"
              className="text-sm font-medium border-b border-transparent hover:border-gray-300 focus:border-navy focus:outline-none transition-colors"
            />
          </div>
          <div className="flex flex-col">
            <label className="text-[10px] text-gray-500 uppercase font-bold">Report Date</label>
            <input 
              type="date" 
              value={metadata.reportDate}
              onChange={e => onMetadataChange({ ...metadata, reportDate: e.target.value })}
              className="text-sm font-medium border-b border-transparent hover:border-gray-300 focus:border-navy focus:outline-none transition-colors"
            />
          </div>
        </div>

        <div className="h-8 w-px bg-gray-200 mx-2" />

        <div className="flex items-center gap-2">
          <button 
            onClick={onGenerate}
            className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg hover:bg-navy/90 transition-colors text-sm font-medium shadow-sm"
          >
            <Printer className="w-4 h-4" />
            Print Report
          </button>
          <button 
            onClick={onExportWord}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            <FileDown className="w-4 h-4" />
            Word
          </button>
          <button className="p-2 text-gray-500 hover:text-navy hover:bg-gray-100 rounded-lg transition-all">
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>
    </header>
  );
}
