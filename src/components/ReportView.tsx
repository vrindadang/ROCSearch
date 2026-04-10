import React from 'react';
import { CompanyData, ReportMetadata, Charge, Director, OtherCompany, AssociateSubsidiary, CommonDirectorship, PotentialRelatedParty } from '../types';
import { FIRM_DETAILS } from '../constants';
import { formatCurrency, calculateAge, formatDate, calculateOutstandingYears } from '../utils/formatters';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Loader2, Plus, Trash2, AlertCircle } from 'lucide-react';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ReportViewProps {
  data: CompanyData;
  metadata: ReportMetadata;
  onDataChange?: (newData: Partial<CompanyData>) => void;
  relatedParties?: PotentialRelatedParty[];
}

export function ReportView({ data, metadata, onDataChange, relatedParties = [] }: ReportViewProps) {
  const age = calculateAge(data.incorporationDate);
  const directors = data.directors || [];
  const charges = data.charges || [];
  const associateSubsidiaries = data.associateSubsidiaries || [];
  const commonDirectorships = data.commonDirectorships || [];
  
  const openCharges = charges;

  const calculateOutstandingYears = (creationDate: string, modificationDate?: string) => {
    const lastDateStr = modificationDate && 
      modificationDate !== 'N/A' && 
      modificationDate !== '-' && 
      modificationDate.trim() !== '' && 
      modificationDate.toLowerCase() !== 'not available'
      ? modificationDate 
      : creationDate;
      
    if (!lastDateStr || lastDateStr === 'N/A' || lastDateStr === '-' || lastDateStr.trim() === '' || lastDateStr.toLowerCase() === 'not available') return '-';
    
    // Handle different date formats (YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY)
    let date: Date;
    if (lastDateStr.includes('/')) {
      const parts = lastDateStr.split('/');
      if (parts.length === 3) {
        // Assuming DD/MM/YYYY
        date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else {
        date = new Date(lastDateStr);
      }
    } else if (lastDateStr.includes('-') && lastDateStr.split('-')[0].length !== 4) {
      const parts = lastDateStr.split('-');
      if (parts.length === 3) {
        // Assuming DD-MM-YYYY
        date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else {
        date = new Date(lastDateStr);
      }
    } else {
      date = new Date(lastDateStr);
    }

    if (isNaN(date.getTime())) return '-';
    
    const today = new Date();
    const diffTime = today.getTime() - date.getTime();
    if (diffTime < 0) return '0.0 Years';
    
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    return `${diffYears.toFixed(1)} ${diffYears === 1 ? 'Year' : 'Years'}`;
  };

  const updateDirector = (din: string, updates: Partial<Director>) => {
    if (!onDataChange) return;
    const newDirectors = directors.map(d => d.din === din ? { ...d, ...updates } : d);
    onDataChange({ directors: newDirectors });
  };

  const deleteDirector = (din: string) => {
    if (!onDataChange) return;
    const newDirectors = directors.filter(d => d.din !== din);
    onDataChange({ directors: newDirectors });
  };

  const addDirector = () => {
    if (!onDataChange) return;
    const newDirector: Director = {
      name: '',
      din: Math.random().toString(36).substr(2, 9),
      designation: '',
      appointmentDate: '',
      totalDirectorships: 0,
      otherCompanies: [],
      disqualified: false,
      dinDeactivated: false
    };
    onDataChange({ directors: [...directors, newDirector] });
  };

  const updateOtherCompany = (directorDin: string, companyId: string, updates: Partial<OtherCompany>) => {
    if (!onDataChange) return;
    const newDirectors = directors.map(d => {
      if (d.din === directorDin) {
        return {
          ...d,
          otherCompanies: (d.otherCompanies || []).map(c => c.id === companyId ? { ...c, ...updates } : c)
        };
      }
      return d;
    });
    onDataChange({ directors: newDirectors });
  };

  const addOtherCompany = (directorDin: string) => {
    if (!onDataChange) return;
    const newDirectors = directors.map(d => {
      if (d.din === directorDin) {
        const newCompany: OtherCompany = {
          id: Math.random().toString(36).substr(2, 9),
          cin: '',
          name: '',
          status: '',
          appointmentDate: '',
          cessationDate: '',
          industry: '',
          state: '',
          source: 'Manually added'
        };
        return {
          ...d,
          otherCompanies: [...(d.otherCompanies || []), newCompany]
        };
      }
      return d;
    });
    onDataChange({ directors: newDirectors });
  };

  const deleteOtherCompany = (directorDin: string, companyId: string) => {
    if (!onDataChange) return;
    const newDirectors = directors.map(d => {
      if (d.din === directorDin) {
        return {
          ...d,
          otherCompanies: (d.otherCompanies || []).filter(c => c.id !== companyId)
        };
      }
      return d;
    });
    onDataChange({ directors: newDirectors });
  };

  const updateCharge = (id: string, updates: Partial<Charge>) => {
    if (!onDataChange) return;
    const newCharges = charges.map(c => c.id === id ? { ...c, ...updates } : c);
    onDataChange({ charges: newCharges });
  };

  const deleteCharge = (id: string) => {
    if (!onDataChange) return;
    const newCharges = charges.filter(c => c.id !== id);
    onDataChange({ charges: newCharges });
  };

  const addCharge = () => {
    if (!onDataChange) return;
    const newCharge: Charge = {
      id: Math.random().toString(36).substr(2, 9),
      srn: '',
      bankName: '',
      bankAddress: '',
      amountSecured: 0,
      amountInWords: '',
      propertyCharged: '',
      termsAndConditions: '',
      margin: '',
      repaymentTerms: '',
      extentOfCharge: '',
      creationDate: '',
      status: 'Open',
      isManual: true,
      isDetailed: true,
    };
    onDataChange({ charges: [...charges, newCharge] });
  };
  
  const updateAssociateSubsidiary = (id: string, updates: Partial<AssociateSubsidiary>) => {
    if (!onDataChange) return;
    const newList = associateSubsidiaries.map(a => a.id === id ? { ...a, ...updates } : a);
    onDataChange({ associateSubsidiaries: newList });
  };

  const deleteAssociateSubsidiary = (id: string) => {
    if (!onDataChange) return;
    const newList = associateSubsidiaries.filter(a => a.id !== id);
    onDataChange({ associateSubsidiaries: newList });
  };

  const addAssociateSubsidiary = () => {
    if (!onDataChange) return;
    const newItem: AssociateSubsidiary = {
      id: Math.random().toString(36).substr(2, 9),
      cin: '',
      name: '',
      nature: '',
      sharesHeld: '',
      source: 'Manually added'
    };
    onDataChange({ associateSubsidiaries: [...associateSubsidiaries, newItem] });
  };

  const updateCommonDirectorship = (id: string, updates: Partial<CommonDirectorship>) => {
    if (!onDataChange) return;
    const newList = commonDirectorships.map(c => c.id === id ? { ...c, ...updates } : c);
    onDataChange({ commonDirectorships: newList });
  };

  const deleteCommonDirectorship = (id: string) => {
    if (!onDataChange) return;
    const newList = commonDirectorships.filter(c => c.id !== id);
    onDataChange({ commonDirectorships: newList });
  };

  const addCommonDirectorship = () => {
    if (!onDataChange) return;
    const newItem: CommonDirectorship = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      status: '',
      age: '',
      state: '',
      commonDirectorsCount: 0,
      source: 'Manually added'
    };
    onDataChange({ commonDirectorships: [...commonDirectorships, newItem] });
  };

  const updatePotentialRelatedParty = (id: string, updates: Partial<PotentialRelatedParty>) => {
    if (!onDataChange) return;
    const newList = (data.potentialRelatedParties || []).map(p => p.id === id ? { ...p, ...updates } : p);
    onDataChange({ potentialRelatedParties: newList });
  };

  const deletePotentialRelatedParty = (id: string) => {
    if (!onDataChange) return;
    const newList = (data.potentialRelatedParties || []).filter(p => p.id !== id);
    onDataChange({ potentialRelatedParties: newList });
  };

  const addPotentialRelatedParty = () => {
    if (!onDataChange) return;
    const newItem: PotentialRelatedParty = {
      id: Math.random().toString(36).substr(2, 9),
      name: '',
      status: '',
      age: '',
      state: '',
      commonDirectorsCount: 0,
      source: 'Manually added'
    };
    onDataChange({ potentialRelatedParties: [...(data.potentialRelatedParties || []), newItem] });
  };

  return (
    <div id="report-content" className="bg-white shadow-2xl min-h-[29.7cm] p-[2cm] font-sans text-gray-900 print:shadow-none print:p-0 print-container relative group">
      {/* Edit Mode Indicator */}
      {onDataChange && (
        <div className="absolute top-4 right-4 bg-[rgba(26,39,68,0.1)] text-navy px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider print:hidden">
          Edit Mode Active
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div className="flex flex-col">
          <h2 className="text-2xl font-bold text-navy font-serif">{FIRM_DETAILS.name}</h2>
          <p className="text-xs font-semibold text-gray-600">{FIRM_DETAILS.type}</p>
        </div>
        <div className="text-right text-[10px] text-gray-500 leading-tight">
          <p>{FIRM_DETAILS.address}</p>
          <p>Mobile: {FIRM_DETAILS.phone}</p>
          <p>Email: {FIRM_DETAILS.email}</p>
        </div>
      </div>
      
      <div className="h-1 bg-navy mb-12" />

      {/* Title Page */}
      <div className="flex flex-col items-center text-center mb-24">
        <h1 className="text-3xl font-black text-navy mb-4 tracking-tight font-serif">ROC SEARCH & STATUS REPORT</h1>
        <p className="text-lg font-medium italic text-gray-500 mb-4 font-serif">OF</p>
        <h2 className="text-2xl font-bold text-navy mb-2 uppercase font-serif">{data.companyName || '[COMPANY NAME]'}</h2>
        <p className="text-lg font-bold mb-12">CIN: {data.cin || '[CIN NUMBER]'}</p>
        
        <div className="mb-12">
          <h3 className="text-sm font-bold underline mb-2 font-serif uppercase tracking-wider">REGISTERED OFFICE</h3>
          <p className="text-sm font-bold max-w-md">{data.registeredAddress || '[REGISTERED ADDRESS]'}</p>
        </div>

        <div className="mb-8">
          <p className="text-sm font-medium italic text-gray-500 mb-2">ON BEHALF OF</p>
          <p className="text-xl font-bold text-navy">{metadata.clientName || '[CLIENT NAME]'}</p>
        </div>

        <div className="flex gap-12 text-sm">
          <div>
            <p className="text-gray-500 font-medium">Ref No:</p>
            <p className="font-bold">{metadata.referenceNumber || 'N/A'}</p>
          </div>
          <div>
            <p className="text-gray-500 font-medium">Date:</p>
            <p className="font-bold">{formatDate(metadata.reportDate)}</p>
          </div>
        </div>
      </div>

      {/* Report Body */}
      <div className="space-y-12">
        {/* Basic Info */}
        <section>
          <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-3 text-sm">
            <span className="font-bold">1. Name of the Company:</span>
            <span>
              {onDataChange ? (
                <input 
                  className="w-full bg-transparent outline-none focus:bg-gray-100 px-1"
                  value={data.companyName}
                  onChange={e => onDataChange({ companyName: e.target.value })}
                />
              ) : data.companyName}
            </span>
            
            <span className="font-bold">2. Corporate Identity Number:</span>
            <span>
              {onDataChange ? (
                <input 
                  className="w-full bg-transparent outline-none focus:bg-gray-100 px-1"
                  value={data.cin}
                  onChange={e => onDataChange({ cin: e.target.value })}
                />
              ) : data.cin}
            </span>
            
            <span className="font-bold">3. Registered Address:</span>
            <span>
              {onDataChange ? (
                <textarea 
                  className="w-full bg-transparent outline-none focus:bg-gray-100 px-1 resize-none"
                  rows={2}
                  value={data.registeredAddress}
                  onChange={e => onDataChange({ registeredAddress: e.target.value })}
                />
              ) : data.registeredAddress}
            </span>
            
            <span className="font-bold">4. Status:</span>
            <span>
              {onDataChange ? (
                <input 
                  className={cn("font-bold bg-transparent outline-none focus:bg-gray-100 px-1", data.status === 'Active' ? 'text-emerald-600' : 'text-red-600')}
                  value={data.status}
                  onChange={e => onDataChange({ status: e.target.value })}
                />
              ) : (
                <span className={cn("font-bold", data.status === 'Active' ? 'text-emerald-600' : 'text-red-600')}>{data.status}</span>
              )}
            </span>
            
            <span className="font-bold">5. Date of Incorporation:</span>
            <span>
              {onDataChange ? (
                <input 
                  className="w-full bg-transparent outline-none focus:bg-gray-100 px-1"
                  value={data.incorporationDate}
                  onChange={e => onDataChange({ incorporationDate: e.target.value })}
                />
              ) : formatDate(data.incorporationDate)}
            </span>
          </div>
        </section>

        {/* Directors Table */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold">6. Directors/Signatory Details</h3>
            {onDataChange && (
              <button 
                onClick={addDirector}
                className="text-[10px] bg-navy text-white px-2 py-1 rounded hover:bg-navy/90 transition-colors print:hidden"
              >
                + Add Director
              </button>
            )}
          </div>
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-navy text-white">
                <th className="border border-navy p-2 text-left">S.No</th>
                <th className="border border-navy p-2 text-left">Director Name</th>
                <th className="border border-navy p-2 text-left">DIN</th>
                <th className="border border-navy p-2 text-left">Designation</th>
                <th className="border border-navy p-2 text-left">Appointment Date</th>
                <th className="border border-navy p-2 text-left">Total Directorships</th>
                {onDataChange && <th className="border border-navy p-2 text-center w-12 print:hidden">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {directors.length > 0 ? (
                directors.map((d, i) => (
                  <tr key={d.din || `dir-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-200 p-2">{i + 1}</td>
                    <td className="border border-gray-200 p-2 font-bold">
                      {onDataChange ? (
                        <input 
                          className="w-full bg-transparent outline-none focus:bg-white font-bold"
                          value={d.name}
                          onChange={e => updateDirector(d.din, { name: e.target.value })}
                        />
                      ) : d.name}
                    </td>
                    <td className="border border-gray-200 p-2">
                      {onDataChange ? (
                        <input 
                          className="w-full bg-transparent outline-none focus:bg-white"
                          value={d.din}
                          onChange={e => updateDirector(d.din, { din: e.target.value })}
                        />
                      ) : d.din}
                    </td>
                    <td className="border border-gray-200 p-2">
                      {onDataChange ? (
                        <input 
                          className="w-full bg-transparent outline-none focus:bg-white"
                          value={d.designation}
                          onChange={e => updateDirector(d.din, { designation: e.target.value })}
                        />
                      ) : d.designation}
                    </td>
                    <td className="border border-gray-200 p-2">
                      {onDataChange ? (
                        <input 
                          className="w-full bg-transparent outline-none focus:bg-white"
                          value={d.appointmentDate}
                          onChange={e => updateDirector(d.din, { appointmentDate: e.target.value })}
                        />
                      ) : formatDate(d.appointmentDate)}
                    </td>
                    <td className="border border-gray-200 p-2 text-center">
                      {onDataChange ? (
                        <input 
                          type="number"
                          className="w-full bg-transparent outline-none focus:bg-white text-center"
                          value={d.totalDirectorships}
                          onChange={e => updateDirector(d.din, { totalDirectorships: Number(e.target.value) })}
                        />
                      ) : d.totalDirectorships}
                    </td>
                    {onDataChange && (
                      <td className="border border-gray-200 p-2 text-center print:hidden">
                        <button onClick={() => deleteDirector(d.din)} className="text-red-500 hover:text-red-700">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr key="no-directors">
                  <td colSpan={onDataChange ? 7 : 6} className="border border-gray-200 p-4 text-center text-gray-400 italic">No director data available</td>
                </tr>
              )}
            </tbody>
          </table>
        </section>

        {/* Share Capital */}
        <section>
          <h3 className="text-sm font-bold mb-4">7. Company Share Capital</h3>
          <div className="space-y-4 text-sm">
            <div>
              <p className="font-bold">Authorised Capital:</p>
              {onDataChange ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-400">Rs.</span>
                    <input 
                      type="number"
                      className="font-bold bg-transparent outline-none focus:bg-gray-100 px-1"
                      value={data.authorizedCapital}
                      onChange={e => onDataChange({ authorizedCapital: Number(e.target.value) })}
                    />
                  </div>
                  <input 
                    className="w-full text-xs bg-transparent outline-none focus:bg-gray-100 px-1 italic"
                    value={data.authorizedCapitalWords}
                    onChange={e => onDataChange({ authorizedCapitalWords: e.target.value })}
                  />
                </div>
              ) : (
                <p>{formatCurrency(data.authorizedCapital)} ({data.authorizedCapitalWords})</p>
              )}
            </div>
            <div>
              <p className="font-bold">Paid Up Capital:</p>
              {onDataChange ? (
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-400">Rs.</span>
                    <input 
                      type="number"
                      className="font-bold bg-transparent outline-none focus:bg-gray-100 px-1"
                      value={data.paidUpCapital}
                      onChange={e => onDataChange({ paidUpCapital: Number(e.target.value) })}
                    />
                  </div>
                  <input 
                    className="w-full text-xs bg-transparent outline-none focus:bg-gray-100 px-1 italic"
                    value={data.paidUpCapitalWords}
                    onChange={e => onDataChange({ paidUpCapitalWords: e.target.value })}
                  />
                </div>
              ) : (
                <p>{formatCurrency(data.paidUpCapital)} ({data.paidUpCapitalWords})</p>
              )}
            </div>
          </div>
        </section>

        {/* Highlights Table */}
        <section>
          <h3 className="text-sm font-bold mb-4">8. Company Highlights</h3>
          <div className="grid grid-cols-2 border border-gray-200">
            <HighlightRow 
              label="CIN" 
              value={data.cin} 
              metadata={data.fieldMetadata?.cin}
              onChange={v => onDataChange?.({ cin: v })} 
            />
            <HighlightRow label="Authorized Capital" value={formatCurrency(data.authorizedCapital)} />
            <HighlightRow label="Age" value={age} />
            <HighlightRow label="Open Charges" value={openCharges.length.toString()} />
            <HighlightRow 
              label="Status" 
              value={data.status} 
              metadata={data.fieldMetadata?.status}
              onChange={v => onDataChange?.({ status: v })} 
            />
            <HighlightRow label="Paid Up Capital" value={formatCurrency(data.paidUpCapital)} />
            <HighlightRow 
              label="Class" 
              value={data.companyClass} 
              metadata={data.fieldMetadata?.companyClass}
              onChange={v => onDataChange?.({ companyClass: v })} 
            />
            <HighlightRow 
              label="Last AGM Date" 
              value={data.lastAgmDate} 
              metadata={data.fieldMetadata?.lastAgmDate}
              onChange={v => onDataChange?.({ lastAgmDate: v })} 
            />
            <HighlightRow 
              label="Category" 
              value={data.companyCategory} 
              metadata={data.fieldMetadata?.companyCategory}
              onChange={v => onDataChange?.({ companyCategory: v })} 
            />
            <HighlightRow 
              label="Balance Sheet Date" 
              value={data.lastBalanceSheetDate} 
              metadata={data.fieldMetadata?.lastBalanceSheetDate}
              onChange={v => onDataChange?.({ lastBalanceSheetDate: v })} 
            />
            <HighlightRow 
              label="Sub Category" 
              value={data.companySubCategory} 
              metadata={data.fieldMetadata?.companySubCategory}
              onChange={v => onDataChange?.({ companySubCategory: v })} 
            />
            <HighlightRow 
              label="Email ID" 
              value={data.email} 
              metadata={data.fieldMetadata?.email}
              onChange={v => onDataChange?.({ email: v })} 
            />
            <HighlightRow 
              label="Industry" 
              value={data.industryDescription} 
              metadata={data.fieldMetadata?.industryDescription}
              className="col-span-2" 
              onChange={v => onDataChange?.({ industryDescription: v })} 
            />
            <HighlightRow 
              label="Address" 
              value={data.registeredAddress} 
              metadata={data.fieldMetadata?.registeredAddress}
              className="col-span-2" 
              onChange={v => onDataChange?.({ registeredAddress: v })} 
            />
          </div>
        </section>

        {/* Other Directorships */}
        <section>
          <h3 className="text-sm font-bold mb-4">9. Directors Info and Other Directorships</h3>
          <div className="space-y-8">
            {directors.map((d, idx) => {
              const hasCessationDate = (d.otherCompanies || []).some(c => c.cessationDate && c.cessationDate.trim() !== "");
              
              return (
                <div key={d.din || `dir-block-${idx}`}>
                  <div className="flex items-center justify-between mb-2 border-b border-[rgba(26,39,68,0.2)] pb-1">
                    <h4 className="text-xs font-bold text-navy uppercase">
                      {idx + 1}. {d.name} — (DIN: {d.din})
                    </h4>
                    {d.isFetchingDirectorships && (
                      <div className="flex items-center gap-2 text-[10px] text-navy animate-pulse">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span>{d.fetchProgress || `🔍 Searching MCA records for ${d.name}...`}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="relative overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-300 text-[10px]">
                      <thead>
                        <tr className="bg-[#f1f3f5] text-black">
                          <th className="border border-gray-300 p-2 text-center w-10 font-bold uppercase text-[8px]">SNO</th>
                          <th className="border border-gray-300 p-2 text-left font-bold uppercase text-[8px]">Current Company</th>
                          <th className="border border-gray-300 p-2 text-center w-24 font-bold uppercase text-[8px]">Status</th>
                          <th className="border border-gray-300 p-2 text-center w-28 font-bold uppercase text-[8px]">Appointment Date</th>
                          {hasCessationDate && (
                            <th className="border border-gray-300 p-2 text-center w-28 font-bold uppercase text-[8px]">Cessation Date</th>
                          )}
                          <th className="border border-gray-300 p-2 text-left font-bold uppercase text-[8px]">Industry</th>
                          <th className="border border-gray-300 p-2 text-center w-24 font-bold uppercase text-[8px]">State</th>
                          {onDataChange && <th className="border border-gray-300 p-2 text-center w-8 print:hidden"></th>}
                        </tr>
                      </thead>
                      <tbody>
                        {(d.otherCompanies || []).map((c, cIdx) => (
                          <tr key={c.id || `other-${cIdx}`} className="group hover:bg-gray-50 transition-colors">
                            <td className="border border-gray-300 p-2 text-center text-gray-600">
                              {cIdx + 1}
                            </td>
                            <td className="border border-gray-300 p-2 font-medium">
                              {onDataChange ? (
                                <textarea 
                                  className="w-full bg-transparent outline-none focus:bg-white resize-none"
                                  rows={1}
                                  value={c.name || ''}
                                  onChange={e => updateOtherCompany(d.din, c.id, { name: e.target.value })}
                                  onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = target.scrollHeight + 'px';
                                  }}
                                />
                              ) : c.name || ''}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {onDataChange ? (
                                <input 
                                  className="w-full bg-transparent outline-none focus:bg-white text-center"
                                  value={c.status || ''}
                                  onChange={e => updateOtherCompany(d.din, c.id, { status: e.target.value })}
                                />
                              ) : c.status || ''}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {onDataChange ? (
                                <input 
                                  className="w-full bg-transparent outline-none focus:bg-white text-center"
                                  value={c.appointmentDate || ''}
                                  onChange={e => updateOtherCompany(d.din, c.id, { appointmentDate: e.target.value })}
                                />
                              ) : formatDate(c.appointmentDate)}
                            </td>
                            {hasCessationDate && (
                              <td className="border border-gray-300 p-2 text-center">
                                {onDataChange ? (
                                  <input 
                                    className="w-full bg-transparent outline-none focus:bg-white text-center"
                                    value={c.cessationDate || ''}
                                    onChange={e => updateOtherCompany(d.din, c.id, { cessationDate: e.target.value })}
                                  />
                                ) : formatDate(c.cessationDate)}
                              </td>
                            )}
                            <td className="border border-gray-300 p-2">
                              {onDataChange ? (
                                <textarea 
                                  className="w-full bg-transparent outline-none focus:bg-white resize-none"
                                  rows={1}
                                  value={c.industry || ''}
                                  onChange={e => updateOtherCompany(d.din, c.id, { industry: e.target.value })}
                                  onInput={(e) => {
                                    const target = e.target as HTMLTextAreaElement;
                                    target.style.height = 'auto';
                                    target.style.height = target.scrollHeight + 'px';
                                  }}
                                />
                              ) : c.industry || ''}
                            </td>
                            <td className="border border-gray-300 p-2 text-center">
                              {onDataChange ? (
                                <input 
                                  className="w-full bg-transparent outline-none focus:bg-white text-center"
                                  value={c.state || ''}
                                  onChange={e => updateOtherCompany(d.din, c.id, { state: e.target.value })}
                                />
                              ) : c.state || ''}
                            </td>
                            {onDataChange && (
                              <td className="border border-gray-300 p-2 text-center print:hidden">
                                <button 
                                  onClick={() => deleteOtherCompany(d.din, c.id)}
                                  className="text-red-400 hover:text-red-600 transition-colors"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </td>
                            )}
                          </tr>
                        ))}
                        {(d.otherCompanies || []).length === 0 && !d.isFetchingDirectorships && (
                          <tr key="no-other-directorships">
                            <td colSpan={onDataChange ? (hasCessationDate ? 9 : 8) : (hasCessationDate ? 8 : 7)} className="border border-gray-200 p-4 text-center">
                              <div className="flex flex-col items-center gap-1">
                                <span className="text-yellow-700 font-bold bg-yellow-50 px-3 py-1 rounded-full border border-yellow-200 print:hidden">
                                  ⚠️ No additional directorships found in public records for DIN {d.din}. Please add manually if required.
                                </span>
                                {d.fetchError && <span className="text-[9px] text-red-500 italic print:hidden">{d.fetchError}</span>}
                              </div>
                            </td>
                          </tr>
                        )}
                        {d.isFetchingDirectorships && (d.otherCompanies || []).length === 0 && (
                          <tr key="fetching-directorships">
                            <td colSpan={onDataChange ? (hasCessationDate ? 9 : 8) : (hasCessationDate ? 8 : 7)} className="border border-gray-200 p-8 text-center">
                              <div className="flex flex-col items-center gap-2 text-navy">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <p className="text-xs font-medium">{d.fetchProgress || "Searching MCA records..."}</p>
                              </div>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>

                  {!d.isFetchingDirectorships && d.otherCompanies && d.otherCompanies.length > 0 && (
                    <p className="mt-1 text-[8px] text-gray-500 italic">
                      Data fetched from public MCA records — verify before finalising
                    </p>
                  )}
                  
                  {onDataChange && (
                    <button 
                      onClick={() => addOtherCompany(d.din)}
                      className="mt-2 flex items-center gap-1.5 text-[9px] font-bold text-navy hover:text-[rgba(26,39,68,0.7)] transition-colors uppercase tracking-wider print:hidden"
                    >
                      <Plus className="w-3 h-3" />
                      ADD ROW
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Charges Summary */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold">10. List of Continuing Charges</h3>
            {onDataChange && (
              <button 
                onClick={addCharge}
                className="text-[10px] bg-navy text-white px-2 py-1 rounded hover:bg-navy/90 transition-colors print:hidden"
              >
                + Add Charge
              </button>
            )}
          </div>
          <table className="w-full border-collapse text-xs mb-8">
            <thead>
              <tr className="bg-navy text-white">
                <th className="border border-navy p-2 text-left w-12">Sl.No</th>
                <th className="border border-navy p-2 text-left">Charge ID</th>
                <th className="border border-navy p-2 text-left">Charge Holder Name</th>
                <th className="border border-navy p-2 text-left">Amount (In Rupees)</th>
                <th className="border border-navy p-2 text-left">Outstanding Years</th>
                <th className="border border-navy p-2 text-left">Date of Creation</th>
                <th className="border border-navy p-2 text-left">Date of Last Modification</th>
                {onDataChange && <th className="border border-navy p-2 text-center w-12 print:hidden">Actions</th>}
              </tr>
            </thead>
            <tbody>
              {openCharges.length > 0 ? (
                openCharges.map((c, i) => (
                  <tr key={c.id || `open-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="border border-gray-200 p-2">{i + 1}</td>
                    <td className="border border-gray-200 p-2 font-bold">
                      {onDataChange ? (
                        <input 
                          className="w-full bg-transparent outline-none focus:bg-white"
                          value={c.id}
                          onChange={e => updateCharge(c.id, { id: e.target.value })}
                        />
                      ) : c.id}
                    </td>
                    <td className="border border-gray-200 p-2">
                      {onDataChange ? (
                        <input 
                          className="w-full bg-transparent outline-none focus:bg-white"
                          value={c.bankName}
                          onChange={e => updateCharge(c.id, { bankName: e.target.value })}
                        />
                      ) : c.bankName}
                    </td>
                    <td className="border border-gray-200 p-2">
                      {onDataChange ? (
                        <input 
                          type="number"
                          className="w-full bg-transparent outline-none focus:bg-white"
                          value={c.amountSecured}
                          onChange={e => updateCharge(c.id, { amountSecured: Number(e.target.value) })}
                        />
                      ) : formatCurrency(c.amountSecured)}
                    </td>
                    <td className="border border-gray-200 p-2 font-medium text-navy">
                      {calculateOutstandingYears(c.creationDate, c.modificationDate)}
                    </td>
                    <td className="border border-gray-200 p-2">
                      {onDataChange ? (
                        <input 
                          className="w-full bg-transparent outline-none focus:bg-white"
                          value={c.creationDate}
                          onChange={e => updateCharge(c.id, { creationDate: e.target.value })}
                        />
                      ) : formatDate(c.creationDate)}
                    </td>
                    <td className="border border-gray-200 p-2">
                      {onDataChange ? (
                        <input 
                          className="w-full bg-transparent outline-none focus:bg-white"
                          value={c.modificationDate || ''}
                          onChange={e => updateCharge(c.id, { modificationDate: e.target.value })}
                        />
                      ) : formatDate(c.modificationDate)}
                    </td>
                    {onDataChange && (
                      <td className="border border-gray-200 p-2 text-center print:hidden">
                        <button onClick={() => deleteCharge(c.id)} className="text-red-500 hover:text-red-700">
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </td>
                    )}
                  </tr>
                ))
              ) : (
                <tr key="no-open-charges">
                  <td colSpan={onDataChange ? 8 : 7} className="border border-gray-200 p-4 text-center text-gray-400 italic">No open charge data available</td>
                </tr>
              )}
            </tbody>
          </table>

          <h3 className="text-sm font-bold mb-4">11. Particulars of Charges</h3>
          <div className="space-y-8">
            {openCharges.map((c, i) => (
              <div key={c.id || `charge-block-${i}`} className="break-inside-avoid relative group">
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-bold text-navy">
                      {i + 1}. Charge Created on {formatDate(c.creationDate)} vide charge ID number {c.id || '[ID]'}
                      {c.isManual && <span className="ml-2 px-1.5 py-0.5 bg-[rgba(26,39,68,0.1)] text-navy text-[8px] rounded uppercase">Manually entered</span>}
                    </h4>
                    {onDataChange && (
                      <button onClick={() => deleteCharge(c.id)} className="text-red-500 hover:text-red-700 transition-colors print:hidden">
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                      </button>
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 border border-gray-200 text-[10px]">
                    <ChargeDetail 
                      label="1. Name & Address of the Person/Institution In Whose favor Charge is Created" 
                      value={`${c.bankName || 'Not Available'}${c.bankAddress ? `\n${c.bankAddress}` : '\nAddress not available in records'}`} 
                      metadata={c.needsVerification ? { needsVerification: true, message: c.verificationMessage || '' } : undefined}
                      onChange={v => {
                        const parts = v.split('\n');
                        updateCharge(c.id, { bankName: parts[0], bankAddress: parts.slice(1).join('\n') });
                      }}
                    />
                    <ChargeDetail 
                      label="2. Amount Secured By the Charge" 
                      value={`Rs. ${formatCurrency(c.amountSecured)}\n(${c.amountInWords || 'Amount in words not available'})`} 
                      metadata={c.needsVerification ? { needsVerification: true, message: c.verificationMessage || '' } : undefined}
                      onChange={v => {
                        const parts = v.split('\n');
                        const match = parts[0].match(/[\d,]+/);
                        if (match) {
                          const num = Number(match[0].replace(/,/g, ''));
                          updateCharge(c.id, { amountSecured: num, amountInWords: parts.slice(1).join('\n').replace(/^\(|\)$/g, '') });
                        }
                      }}
                    />
                    <ChargeDetail 
                      label="3. Brief Particulars Of the Property Charged" 
                      value={c.propertyCharged || "Not Available"} 
                      metadata={c.needsVerification ? { needsVerification: true, message: c.verificationMessage || '' } : undefined}
                      onChange={v => updateCharge(c.id, { propertyCharged: v, isDetailed: true })}
                    />
                    <ChargeDetail 
                      label="4. Terms and Conditions" 
                      value={c.termsAndConditions || "Not Available"} 
                      metadata={c.needsVerification ? { needsVerification: true, message: c.verificationMessage || '' } : undefined}
                      onChange={v => updateCharge(c.id, { termsAndConditions: v, isDetailed: true })}
                    />
                    <ChargeDetail 
                      label="5. Margin" 
                      value={c.margin || "Not Available"} 
                      metadata={c.needsVerification ? { needsVerification: true, message: c.verificationMessage || '' } : undefined}
                      onChange={v => updateCharge(c.id, { margin: v, isDetailed: true })}
                    />
                    <ChargeDetail 
                      label="6. Terms of repayment" 
                      value={c.repaymentTerms || "Not Available"} 
                      metadata={c.needsVerification ? { needsVerification: true, message: c.verificationMessage || '' } : undefined}
                      onChange={v => updateCharge(c.id, { repaymentTerms: v, isDetailed: true })}
                    />
                    <ChargeDetail 
                      label="7. Extent and operation of the charge" 
                      value={c.extentOfCharge || "Not Available"} 
                      metadata={c.needsVerification ? { needsVerification: true, message: c.verificationMessage || '' } : undefined}
                      onChange={v => updateCharge(c.id, { extentOfCharge: v, isDetailed: true })}
                    />
                  </div>
                </div>

                {/* Modification Sub-block */}
                {c.modificationDate && c.modificationDate !== 'N/A' && c.modificationDate.toLowerCase() !== 'not available' && c.modificationDate.trim() !== '' && (
                  <div className="ml-8 mt-4 border-l-2 border-navy/20 pl-4">
                    <h4 className="text-xs font-bold text-navy mb-2">
                      {i + 1}.1M Charge Modification on {formatDate(c.modificationDate)} vide charge ID number {c.id}
                    </h4>
                    <div className="grid grid-cols-1 border border-gray-200 text-[10px] opacity-90">
                      <div className="p-2 bg-gray-50 italic text-[9px] text-gray-500 border-b border-gray-200">
                        Modification details as per MCA records:
                      </div>
                      <ChargeDetail 
                        label="1. Name & Address of the Person/Institution In Whose favor Charge is Created" 
                        value={`${c.bankName || 'Not Available'}${c.bankAddress ? `\n${c.bankAddress}` : '\nAddress not available in records'}`} 
                        onChange={v => {
                          const parts = v.split('\n');
                          updateCharge(c.id, { bankName: parts[0], bankAddress: parts.slice(1).join('\n') });
                        }}
                      />
                      <ChargeDetail 
                        label="2. Amount Secured By the Charge" 
                        value={`Rs. ${formatCurrency(c.modifiedAmountSecured || c.amountSecured)}\n(${c.modifiedAmountInWords || c.amountInWords || 'Amount in words not available'})`} 
                        onChange={v => {
                          const parts = v.split('\n');
                          const match = parts[0].match(/[\d,]+/);
                          if (match) {
                            const num = Number(match[0].replace(/,/g, ''));
                            updateCharge(c.id, { modifiedAmountSecured: num, modifiedAmountInWords: parts.slice(1).join('\n').replace(/^\(|\)$/g, '') });
                          }
                        }}
                      />
                      <ChargeDetail 
                        label="3. Brief Particulars Of the Property Charged" 
                        value={c.modifiedPropertyCharged || c.propertyCharged || "Not Available"} 
                        onChange={v => updateCharge(c.id, { modifiedPropertyCharged: v })}
                      />
                      <ChargeDetail 
                        label="4. Terms and Conditions" 
                        value={c.modifiedTermsAndConditions || c.termsAndConditions || "Not Available"} 
                        onChange={v => updateCharge(c.id, { modifiedTermsAndConditions: v })}
                      />
                      <ChargeDetail 
                        label="5. Margin" 
                        value={c.modifiedMargin || c.margin || "Not Available"} 
                        onChange={v => updateCharge(c.id, { modifiedMargin: v })}
                      />
                      <ChargeDetail 
                        label="6. Terms of repayment" 
                        value={c.modifiedRepaymentTerms || c.repaymentTerms || "Not Available"} 
                        onChange={v => updateCharge(c.id, { modifiedRepaymentTerms: v })}
                      />
                      <ChargeDetail 
                        label="7. Extent and operation of the charge" 
                        value={c.modifiedExtentOfCharge || c.extentOfCharge || "Not Available"} 
                        onChange={v => updateCharge(c.id, { modifiedExtentOfCharge: v })}
                      />
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>

        {/* Potential Related Parties (Appended from Sidebar) */}
        {(data.potentialRelatedParties || []).length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold">12. Potential Related Parties</h3>
              {onDataChange && (
                <button 
                  onClick={addPotentialRelatedParty}
                  className="text-[10px] bg-navy text-white px-2 py-1 rounded hover:bg-navy/90 transition-colors print:hidden"
                >
                  + Add Row
                </button>
              )}
            </div>
            <div className="border border-gray-200 rounded-sm overflow-hidden">
              <table className="w-full border-collapse text-[10px]">
                <thead>
                  <tr className="bg-navy text-white">
                    <th className="border border-navy p-1.5 text-left w-8">S.No</th>
                    <th className="border border-navy p-1.5 text-left">Current Company</th>
                    <th className="border border-navy p-1.5 text-left">Status</th>
                    <th className="border border-navy p-1.5 text-left">Age of Company (Years)</th>
                    <th className="border border-navy p-1.5 text-left">State</th>
                    <th className="border border-navy p-1.5 text-center w-40">No. of Common Directors</th>
                    {onDataChange && <th className="border border-navy p-1.5 text-center w-8 print:hidden"></th>}
                  </tr>
                </thead>
                <tbody>
                  {(data.potentialRelatedParties || []).map((rp, i) => (
                    <tr key={rp.id || `rp-${i}`} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="border border-gray-200 p-1.5 text-center">{i + 1}</td>
                      <td className="border border-gray-200 p-1.5 font-bold">
                        {onDataChange ? (
                          <input 
                            className="w-full bg-transparent outline-none focus:bg-white font-bold"
                            value={rp.name}
                            onChange={e => updatePotentialRelatedParty(rp.id, { name: e.target.value })}
                          />
                        ) : rp.name}
                      </td>
                      <td className="border border-gray-200 p-1.5">
                        {onDataChange ? (
                          <input 
                            className="w-full bg-transparent outline-none focus:bg-white"
                            value={rp.status}
                            onChange={e => updatePotentialRelatedParty(rp.id, { status: e.target.value })}
                          />
                        ) : rp.status}
                      </td>
                      <td className="border border-gray-200 p-1.5">
                        {onDataChange ? (
                          <input 
                            className="w-full bg-transparent outline-none focus:bg-white"
                            value={rp.age}
                            onChange={e => updatePotentialRelatedParty(rp.id, { age: e.target.value })}
                          />
                        ) : rp.age}
                      </td>
                      <td className="border border-gray-200 p-1.5">
                        {onDataChange ? (
                          <input 
                            className="w-full bg-transparent outline-none focus:bg-white"
                            value={rp.state}
                            onChange={e => updatePotentialRelatedParty(rp.id, { state: e.target.value })}
                          />
                        ) : rp.state}
                      </td>
                      <td className="border border-gray-200 p-1.5 text-center font-bold">
                        {onDataChange ? (
                          <input 
                            type="number"
                            className="w-full bg-transparent outline-none focus:bg-white text-center font-bold"
                            value={rp.commonDirectorsCount}
                            onChange={e => updatePotentialRelatedParty(rp.id, { commonDirectorsCount: Number(e.target.value) })}
                          />
                        ) : rp.commonDirectorsCount}
                      </td>
                      {onDataChange && (
                        <td className="border border-gray-200 p-1.5 text-center print:hidden">
                          <button onClick={() => deletePotentialRelatedParty(rp.id)} className="text-red-500 hover:text-red-700">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>

      {/* Footer */}
      <div className="mt-24 pt-12 border-t border-gray-100 flex justify-between items-end text-[10px]">
        <div className="space-y-1">
          <p className="font-bold">Place: Delhi</p>
          <p className="font-bold">UDIN: {metadata.udin || '____________________'}</p>
        </div>
        <div className="text-right space-y-1">
          <p className="font-bold">For {FIRM_DETAILS.name}</p>
          <p className="font-bold">{FIRM_DETAILS.type}</p>
          <p className="font-bold">FRN: {FIRM_DETAILS.frn}</p>
          <div className="h-12 w-32 border border-gray-200 my-2 ml-auto flex items-center justify-center text-gray-300 italic">Signature Box</div>
          <p className="font-bold">{FIRM_DETAILS.proprietor}</p>
          <p className="font-bold">Proprietor | M.No. {FIRM_DETAILS.membershipNo}</p>
        </div>
      </div>
    </div>
  );
}

function HighlightRow({ 
  label, 
  value, 
  className, 
  metadata,
  onChange 
}: { 
  label: string; 
  value: string | number; 
  className?: string; 
  metadata?: { needsVerification: boolean; message: string };
  onChange?: (val: string) => void 
}) {
  return (
    <div className={cn(
      "flex border-b border-r border-gray-200 p-2 relative group", 
      metadata?.needsVerification && "bg-yellow-50",
      className
    )}>
      <span className="w-1/3 font-bold text-gray-500 uppercase text-[9px]">{label}</span>
      <div className="flex-1 flex flex-col">
        {onChange ? (
          <input 
            className={cn(
              "font-bold text-navy truncate bg-transparent outline-none focus:bg-gray-100 px-1",
              metadata?.needsVerification && "text-yellow-900"
            )}
            value={value || ''}
            onChange={e => onChange(e.target.value)}
          />
        ) : (
          <span className={cn(
            "font-bold text-navy truncate",
            metadata?.needsVerification && "text-yellow-900"
          )}>{value || 'N/A'}</span>
        )}
        {metadata?.needsVerification && (
          <div className="flex items-center gap-1 text-[8px] text-yellow-700 font-bold mt-0.5">
            <AlertCircle className="w-2.5 h-2.5" />
            <span>{metadata.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}

function ChargeDetail({ 
  label, 
  value, 
  className, 
  isMissing, 
  metadata,
  onChange 
}: { 
  label: string; 
  value: string | number; 
  className?: string; 
  isMissing?: boolean; 
  metadata?: { needsVerification: boolean; message: string };
  onChange?: (val: string) => void 
}) {
  const [isFocused, setIsFocused] = React.useState(false);
  const strValue = String(value || '');
  
  const structuredPrefixes = ["Fund Based:", "Primary Security:", "Collateral", "Non-Fund Based:"];
  const isStructured = strValue.split('\n').some(line => 
    structuredPrefixes.some(prefix => line.trim().startsWith(prefix))
  );

  const renderStructuredTable = (val: string) => {
    const lines = val.split('\n');
    const rows = lines.map(line => {
      const trimmedLine = line.trim();
      const colonIndex = trimmedLine.indexOf(':');
      if (colonIndex !== -1) {
        const key = trimmedLine.substring(0, colonIndex).trim();
        const detail = trimmedLine.substring(colonIndex + 1).trim();
        return { key, detail };
      }
      return { key: '', detail: trimmedLine };
    }).filter(row => row.key || row.detail);

    return (
      <table className="w-full border-collapse text-[9px] mt-1">
        <tbody>
          {rows.map((row, idx) => (
            <tr key={idx} className="border-b border-gray-100 last:border-0">
              <td className="py-1 pr-2 font-bold text-gray-500 w-[140px] align-top">{row.key}</td>
              <td className="py-1 text-gray-900 align-top">{row.detail || 'NA'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  return (
    <div className={cn(
      "flex border-b border-r border-gray-200 p-1.5 relative group", 
      (isMissing || metadata?.needsVerification) && "bg-yellow-50",
      className
    )}>
      <span className="w-1/3 font-bold text-gray-500 uppercase text-[8px]">{label}</span>
      <div className="flex-1 flex flex-col">
        {onChange ? (
          <>
            {isStructured && !isFocused ? (
              <div 
                className="cursor-text min-h-[20px]" 
                onClick={() => setIsFocused(true)}
              >
                {renderStructuredTable(strValue)}
              </div>
            ) : (
              <textarea 
                className={cn(
                  "w-full font-medium text-gray-900 bg-transparent outline-none focus:bg-white resize-none",
                  (isMissing || metadata?.needsVerification) && "text-yellow-800 italic"
                )}
                rows={1}
                value={value || 'Not Available'}
                onChange={e => onChange(e.target.value)}
                onFocus={() => setIsFocused(true)}
                onBlur={() => setIsFocused(false)}
                onInput={(e) => {
                  const target = e.target as HTMLTextAreaElement;
                  target.style.height = 'auto';
                  target.style.height = target.scrollHeight + 'px';
                }}
                autoFocus={isFocused}
              />
            )}
          </>
        ) : (
          <div className={cn(
            "font-medium text-gray-900",
            (isMissing || metadata?.needsVerification) && "text-yellow-800 italic"
          )}>
            {isStructured ? renderStructuredTable(strValue) : (value || 'Not Available')}
          </div>
        )}
        {metadata?.needsVerification && (
          <div className="flex items-center gap-1 text-[7px] text-yellow-700 font-bold mt-0.5">
            <AlertCircle className="w-2 h-2" />
            <span>{metadata.message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
