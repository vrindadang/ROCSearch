import React, { useState } from 'react';
import { Charge } from '../types';
import { X, Save } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ManualChargeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (charge: Charge) => void;
}

const INITIAL_CHARGE: Charge = {
  id: '',
  srn: '',
  bankName: '',
  bankCin: '',
  bankAddress: '',
  bankEmail: '',
  amountSecured: 0,
  amountInWords: '',
  modifiedAmountSecured: 0,
  modifiedAmountInWords: '',
  propertyCharged: '',
  modifiedPropertyCharged: '',
  termsAndConditions: '',
  modifiedTermsAndConditions: '',
  margin: '',
  modifiedMargin: '',
  repaymentTerms: '',
  modifiedRepaymentTerms: '',
  extentOfCharge: '',
  modifiedExtentOfCharge: '',
  creationDate: '',
  modificationDate: '',
  typeOfCharge: '',
  rateOfInterest: '',
  status: 'Open',
  isManual: true,
  isDetailed: true,
};

export function ManualChargeModal({ isOpen, onClose, onSave }: ManualChargeModalProps) {
  const [charge, setCharge] = useState<Charge>(INITIAL_CHARGE);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[rgba(0,0,0,0.5)] backdrop-blur-sm">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]"
      >
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between bg-navy text-white shrink-0">
          <h2 className="text-lg font-bold">Manual Charge Entry</h2>
          <button onClick={onClose} className="p-1 hover:bg-[rgba(255,255,255,0.1)] rounded-full transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4 overflow-y-auto">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Charge ID (SRN)</label>
            <input 
              type="text" 
              value={charge.srn}
              onChange={e => setCharge({ ...charge, srn: e.target.value, id: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[rgba(26,39,68,0.2)] focus:border-navy outline-none"
              placeholder="e.g. 10023456"
            />
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Bank/Institution Name</label>
            <input 
              type="text" 
              value={charge.bankName}
              onChange={e => setCharge({ ...charge, bankName: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[rgba(26,39,68,0.2)] focus:border-navy outline-none"
              placeholder="e.g. HDFC BANK LIMITED"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Bank CIN/PAN</label>
            <input 
              type="text" 
              value={charge.bankCin}
              onChange={e => setCharge({ ...charge, bankCin: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[rgba(26,39,68,0.2)] focus:border-navy outline-none"
              placeholder="e.g. L65920MH1994PLC080618"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Bank Email</label>
            <input 
              type="email" 
              value={charge.bankEmail}
              onChange={e => setCharge({ ...charge, bankEmail: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[rgba(26,39,68,0.2)] focus:border-navy outline-none"
              placeholder="e.g. contact@bank.com"
            />
          </div>

          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Bank Address</label>
            <input 
              type="text" 
              value={charge.bankAddress}
              onChange={e => setCharge({ ...charge, bankAddress: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[rgba(26,39,68,0.2)] focus:border-navy outline-none"
              placeholder="Full branch address"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Amount Secured (Rs.)</label>
            <input 
              type="number" 
              value={charge.amountSecured}
              onChange={e => setCharge({ ...charge, amountSecured: Number(e.target.value) })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[rgba(26,39,68,0.2)] focus:border-navy outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Date of Instrument/Creation</label>
            <input 
              type="text" 
              value={charge.creationDate}
              onChange={e => setCharge({ ...charge, creationDate: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[rgba(26,39,68,0.2)] focus:border-navy outline-none"
              placeholder="DD/MM/YYYY"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Type of Charge</label>
            <input 
              type="text" 
              value={charge.typeOfCharge}
              onChange={e => setCharge({ ...charge, typeOfCharge: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[rgba(26,39,68,0.2)] focus:border-navy outline-none"
              placeholder="e.g. Hypothecation"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Rate of Interest</label>
            <input 
              type="text" 
              value={charge.rateOfInterest}
              onChange={e => setCharge({ ...charge, rateOfInterest: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[rgba(26,39,68,0.2)] focus:border-navy outline-none"
              placeholder="e.g. 10.5% p.a."
            />
          </div>

          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Property Description</label>
            <textarea 
              value={charge.propertyCharged}
              onChange={e => setCharge({ ...charge, propertyCharged: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[rgba(26,39,68,0.2)] focus:border-navy outline-none h-20 resize-none"
              placeholder="Detailed description of property"
            />
          </div>

          <div className="flex flex-col gap-1 col-span-2">
            <label className="text-xs font-bold text-gray-500 uppercase">Terms of Repayment</label>
            <input 
              type="text" 
              value={charge.repaymentTerms}
              onChange={e => setCharge({ ...charge, repaymentTerms: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[rgba(26,39,68,0.2)] focus:border-navy outline-none"
              placeholder="e.g. Repayable in 60 monthly installments"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Margin</label>
            <input 
              type="text" 
              value={charge.margin}
              onChange={e => setCharge({ ...charge, margin: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[rgba(26,39,68,0.2)] focus:border-navy outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Extent of Charge</label>
            <input 
              type="text" 
              value={charge.extentOfCharge}
              onChange={e => setCharge({ ...charge, extentOfCharge: e.target.value })}
              className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[rgba(26,39,68,0.2)] focus:border-navy outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-gray-500 uppercase">Status</label>
            <input 
              type="text"
              value="Open/Continuing"
              disabled
              className="px-3 py-2 border border-gray-100 rounded-lg bg-gray-50 text-gray-500 outline-none cursor-not-allowed"
            />
          </div>

          <div className="col-span-2 mt-4 pt-4 border-t border-gray-100">
            <h3 className="text-sm font-bold text-navy mb-4 uppercase tracking-wider">Modification Details (Optional)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Modification Date</label>
                <input 
                  type="text" 
                  value={charge.modificationDate}
                  onChange={e => setCharge({ ...charge, modificationDate: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[rgba(26,39,68,0.2)] focus:border-navy outline-none"
                  placeholder="DD/MM/YYYY"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-gray-500 uppercase">Modified Amount (Rs.)</label>
                <input 
                  type="number" 
                  value={charge.modifiedAmountSecured}
                  onChange={e => setCharge({ ...charge, modifiedAmountSecured: Number(e.target.value) })}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[rgba(26,39,68,0.2)] focus:border-navy outline-none"
                />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Modified Property Description</label>
                <textarea 
                  value={charge.modifiedPropertyCharged}
                  onChange={e => setCharge({ ...charge, modifiedPropertyCharged: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[rgba(26,39,68,0.2)] focus:border-navy outline-none h-20 resize-none"
                  placeholder="Updated description if modified"
                />
              </div>
              <div className="flex flex-col gap-1 col-span-2">
                <label className="text-xs font-bold text-gray-500 uppercase">Modified Terms & Conditions</label>
                <textarea 
                  value={charge.modifiedTermsAndConditions}
                  onChange={e => setCharge({ ...charge, modifiedTermsAndConditions: e.target.value })}
                  className="px-3 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-[rgba(26,39,68,0.2)] focus:border-navy outline-none h-20 resize-none"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 bg-gray-50 border-t border-gray-100 flex justify-end gap-3 shrink-0">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(charge)}
            className="flex items-center gap-2 px-6 py-2 bg-navy text-white rounded-lg hover:bg-[rgba(26,39,68,0.9)] transition-colors text-sm font-bold shadow-md"
          >
            <Save className="w-4 h-4" />
            Save Entry
          </button>
        </div>
      </motion.div>
    </div>
  );
}
