import React from 'react';
import { ReportMetadata } from '../types';
import { FileText, Download, Printer, Share2, FileDown, LogOut, User, Shield } from 'lucide-react';

interface TopBarProps {
  metadata: ReportMetadata;
  onMetadataChange: (metadata: ReportMetadata) => void;
  onGenerate: () => void;
  onExportWord: () => void;
  onLogout: () => void;
  onManageUsers?: () => void;
  user: string;
  isAdmin?: boolean;
}

export function TopBar({ metadata, onMetadataChange, onGenerate, onExportWord, onLogout, onManageUsers, user, isAdmin }: TopBarProps) {
  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 z-10 no-print">
      <div className="flex items-center gap-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-navy rounded-lg flex items-center justify-center text-white font-bold text-xl font-serif">
            G
          </div>
          <div>
            <h1 className="text-lg font-bold text-navy leading-none font-serif">Girdhar & Co.</h1>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-medium mt-1">Chartered Accountants</p>
          </div>
        </div>

        <div className="h-8 w-px bg-gray-200" />

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-50 rounded-full border border-gray-100">
            <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-blue-600" />
            </div>
            <span className="text-xs font-semibold text-gray-700 capitalize">{user}</span>
            <button 
              onClick={onLogout}
              className="ml-2 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all"
              title="Sign Out"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>

          {isAdmin && (
            <button
              onClick={onManageUsers}
              className="flex items-center gap-2 px-3 py-1.5 bg-navy text-white rounded-full hover:bg-[rgba(26,39,68,0.9)] transition-all text-xs font-semibold shadow-sm"
            >
              <Shield className="w-3.5 h-3.5" />
              Manage Users
            </button>
          )}
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
            className="flex items-center gap-2 px-4 py-2 bg-navy text-white rounded-lg hover:bg-[rgba(26,39,68,0.9)] transition-colors text-sm font-medium shadow-sm"
          >
            <Download className="w-4 h-4" />
            Download PDF
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
