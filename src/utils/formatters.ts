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
