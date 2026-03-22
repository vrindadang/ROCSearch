export interface Director {
  name: string;
  din: string;
  designation: string;
  appointmentDate: string;
  totalDirectorships: number;
  otherCompanies: OtherCompany[];
  disqualified: boolean;
  dinDeactivated: boolean;
  isFetchingDirectorships?: boolean;
  fetchError?: string;
}

export interface OtherCompany {
  id: string;
  name: string;
  status: string;
  appointmentDate: string;
  industry: string;
  state: string;
  source: 'Auto-fetched' | 'Manually added';
}

export interface Charge {
  id: string;
  srn?: string;
  bankName: string;
  bankCin?: string;
  bankAddress: string;
  bankEmail?: string;
  amountSecured: number;
  amountInWords: string;
  propertyCharged: string;
  termsAndConditions: string;
  margin: string;
  repaymentTerms: string;
  extentOfCharge: string;
  creationDate: string;
  modificationDate?: string;
  satisfactionDate?: string;
  status: 'Open' | 'Satisfied';
  isModification?: boolean;
  typeOfCharge?: string;
  rateOfInterest?: string;
  isManual?: boolean;
  isDetailed?: boolean; // True if from Type A CHG file
  sourceFile?: string;
  needsVerification?: boolean;
  verificationMessage?: string;
}

export interface RelatedParty {
  name: string;
  status: string;
  age: string;
  state: string;
  commonDirectorsCount: number;
}

export interface CompanyData {
  companyName: string;
  cin: string;
  registeredAddress: string;
  status: string;
  incorporationDate: string;
  companyClass: string;
  companyCategory: string;
  companySubCategory: string;
  industryDescription: string;
  authorizedCapital: number;
  authorizedCapitalWords: string;
  paidUpCapital: number;
  paidUpCapitalWords: string;
  email: string;
  lastAgmDate: string;
  lastBalanceSheetDate: string;
  directors: Director[];
  charges: Charge[];
  relatedParties: RelatedParty[];
  fieldMetadata?: Record<string, { needsVerification: boolean; message: string }>;
}

export interface UploadLog {
  id: string;
  timestamp: string;
  fileName: string;
  message: string;
  type: 'success' | 'info' | 'warning' | 'error';
}

export interface ReportMetadata {
  clientName: string;
  referenceNumber: string;
  reportDate: string;
  udin: string;
}

export interface FileStatus {
  id: string;
  name: string;
  status: 'pending' | 'parsing' | 'success' | 'partial' | 'blank-xfa' | 'error';
  error?: string;
}
