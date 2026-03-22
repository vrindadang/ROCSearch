import { numberToWords } from './formatters';

/**
 * Validates a numeric amount against its "amount in words" equivalent.
 * Following the user's strict rules:
 * Rule 1: Read the amount in words to verify the figures.
 * Rule 2: Compare the leading digits.
 * Rule 3: Strip leading incorrect digits if they don't match the words.
 */
export function validateAndFixAmount(amount: number, words: string): number {
  if (!words || words.trim() === '' || words.toLowerCase() === 'not available') {
    return amount;
  }

  // Clean the words string
  const cleanWords = words.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').trim();
  
  // Extract numbers from words (e.g., "one crore" -> 10000000)
  // We can use our numberToWords logic in reverse or just check for keywords
  
  const amountStr = Math.floor(amount).toString();
  
  // Check for the "1" prefix bug specifically
  // Examples: 19500000 (1.95 Cr) showing as 119500000 (11.95 Cr)
  // Words would say "One Crore Ninety Five Lakhs"
  
  const firstWord = cleanWords.split(' ')[0]; // "one", "two", etc.
  const wordToDigit: Record<string, string> = {
    'one': '1', 'two': '2', 'three': '3', 'four': '4', 'five': '5',
    'six': '6', 'seven': '7', 'eight': '8', 'nine': '9'
  };
  
  const expectedFirstDigit = wordToDigit[firstWord];
  
  if (expectedFirstDigit && amountStr.startsWith('1') && amountStr.length > 1) {
    const actualFirstDigit = amountStr[0];
    const secondDigit = amountStr[1];
    
    // If the words say "Two Crore" but the number is "120000000", 
    // it's likely the "1" prefix bug.
    if (expectedFirstDigit !== '1' && actualFirstDigit === '1' && secondDigit === expectedFirstDigit) {
      return Number(amountStr.substring(1));
    }
    
    // If the words say "One Crore" but the number is "110000000",
    // it's harder to tell, but we can check the scale.
    // "One Crore" is 8 digits. "11 Crore" is 9 digits.
    if (expectedFirstDigit === '1') {
      // Check if the number of digits matches the scale in words
      const hasCrore = cleanWords.includes('crore');
      const hasLakh = cleanWords.includes('lakh');
      
      if (hasCrore && !cleanWords.includes('ten crore') && !cleanWords.includes('eleven') && amountStr.length === 9 && amountStr.startsWith('11')) {
         return Number(amountStr.substring(1));
      }
    }
  }

  return amount;
}

/**
 * Cleans a numeric value that might have been extracted as a string with symbols.
 */
export function cleanNumericValue(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value !== 'string') return 0;
  
  const cleaned = value.replace(/[^0-9.]/g, '');
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}
