export function numberToWords(num: number): string {
  if (num === 0) return 'Zero';

  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine'];
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  function convertChunk(n: number): string {
    let chunk = '';
    if (n >= 100) {
      chunk += units[Math.floor(n / 100)] + ' Hundred ';
      n %= 100;
    }
    if (n >= 20) {
      chunk += tens[Math.floor(n / 10)] + ' ';
      n %= 10;
    }
    if (n >= 10) {
      chunk += teens[n - 10] + ' ';
      n = 0;
    }
    if (n > 0) {
      chunk += units[n] + ' ';
    }
    return chunk.trim();
  }

  let result = '';
  
  // Indian Numbering System: Crore, Lakh, Thousand, Hundred
  const crore = Math.floor(num / 10000000);
  num %= 10000000;
  if (crore > 0) result += convertChunk(crore) + ' Crore ';

  const lakh = Math.floor(num / 100000);
  num %= 100000;
  if (lakh > 0) result += convertChunk(lakh) + ' Lakh ';

  const thousand = Math.floor(num / 1000);
  num %= 1000;
  if (thousand > 0) result += convertChunk(thousand) + ' Thousand ';

  if (num > 0) result += convertChunk(num);

  return 'Rupees ' + result.trim() + ' only';
}

export function formatCurrency(num: number): string {
  if (num === undefined || num === null) return '0';
  return new Intl.NumberFormat('en-IN', {
    maximumFractionDigits: 0,
  }).format(num).replace(/\u00A0/g, ' ').replace(/\u202F/g, ' ');
}

export function calculateAge(incorporationDate: string): string {
  try {
    const incDate = new Date(incorporationDate);
    if (isNaN(incDate.getTime())) return 'N/A';
    
    const today = new Date();
    let years = today.getFullYear() - incDate.getFullYear();
    let months = today.getMonth() - incDate.getMonth();
    
    if (months < 0 || (months === 0 && today.getDate() < incDate.getDate())) {
      years--;
      months += 12;
    }
    
    return `${years} Years, ${months} Months`;
  } catch (e) {
    return 'N/A';
  }
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr || dateStr === 'N/A' || dateStr === '-' || dateStr.trim() === '' || dateStr.toLowerCase() === 'not available') return 'N/A';
  
  try {
    let date: Date;
    
    // Handle DD/MM/YYYY or DD-MM-YYYY
    if (dateStr.includes('/') || (dateStr.includes('-') && dateStr.split('-')[0].length !== 4)) {
      const separator = dateStr.includes('/') ? '/' : '-';
      const parts = dateStr.split(separator);
      if (parts.length === 3) {
        // Assuming DD/MM/YYYY or DD-MM-YYYY
        date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else {
        date = new Date(dateStr);
      }
    } else {
      // Assuming YYYY-MM-DD
      date = new Date(dateStr);
    }

    if (isNaN(date.getTime())) return dateStr;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}-${month}-${year}`;
  } catch (e) {
    return dateStr;
  }
}

export function calculateOutstandingYears(creationDate: string, modificationDate?: string): string {
  const dateStr = modificationDate && modificationDate !== 'N/A' && modificationDate.toLowerCase() !== 'not available' ? modificationDate : creationDate;
  if (!dateStr || dateStr === 'N/A' || dateStr.toLowerCase() === 'not available') return 'N/A';
  
  try {
    let date: Date;
    // Use same parsing logic as formatDate
    if (dateStr.includes('/') || (dateStr.includes('-') && dateStr.split('-')[0].length !== 4)) {
      const separator = dateStr.includes('/') ? '/' : '-';
      const parts = dateStr.split(separator);
      if (parts.length === 3) {
        date = new Date(`${parts[2]}-${parts[1]}-${parts[0]}`);
      } else {
        date = new Date(dateStr);
      }
    } else {
      date = new Date(dateStr);
    }

    if (isNaN(date.getTime())) return 'N/A';
    
    const today = new Date();
    const diffTime = Math.abs(today.getTime() - date.getTime());
    const diffYears = (diffTime / (1000 * 60 * 60 * 24 * 365.25)).toFixed(1);
    return `${diffYears} Years`;
  } catch (e) {
    return 'N/A';
  }
}
