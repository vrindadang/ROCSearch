import * as pdfjsLib from 'pdfjs-dist';
import { parseStringPromise } from 'xml2js';
import * as mammoth from 'mammoth';
import * as XLSX from 'xlsx';

// Initialize PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.10.38/pdf.worker.min.mjs`;

export async function extractTextFromFile(file: File): Promise<string> {
  const extension = file.name.split('.').pop()?.toLowerCase();
  
  switch (extension) {
    case 'pdf':
      return extractTextFromPdf(file);
    case 'docx':
      return extractTextFromDocx(file);
    case 'xlsx':
    case 'xlsm':
    case 'xls':
      return extractTextFromExcel(file);
    default:
      throw new Error(`Unsupported file type: .${extension}`);
  }
}

export async function extractTextFromPdf(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = '';

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items.map((item: any) => item.str).join(' ');
      fullText += pageText + '\n';
    }

    return fullText;
  } catch (err) {
    console.error(`Error extracting text from PDF ${file.name}:`, err);
    throw new Error(`Failed to read PDF content: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function extractTextFromDocx(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  } catch (err) {
    console.error(`Error extracting text from DOCX ${file.name}:`, err);
    throw new Error(`Failed to read DOCX content: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function extractTextFromExcel(file: File): Promise<string> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const workbook = XLSX.read(arrayBuffer, { type: 'array' });
    let fullText = '';
    
    workbook.SheetNames.forEach(sheetName => {
      const worksheet = workbook.Sheets[sheetName];
      const csv = XLSX.utils.sheet_to_csv(worksheet);
      fullText += `SHEET: ${sheetName}\n${csv}\n\n`;
    });
    
    return fullText;
  } catch (err) {
    console.error(`Error extracting text from Excel ${file.name}:`, err);
    throw new Error(`Failed to read Excel content: ${err instanceof Error ? err.message : String(err)}`);
  }
}

export async function extractXfaXml(file: File): Promise<string | null> {
  const arrayBuffer = await file.arrayBuffer();
  const uint8Array = new Uint8Array(arrayBuffer);
  const textDecoder = new TextDecoder();
  const content = textDecoder.decode(uint8Array);

  // Look for XFA stream
  const xfaStart = content.indexOf('<xfa:datasets');
  const xfaEnd = content.indexOf('</xfa:datasets>');

  if (xfaStart !== -1 && xfaEnd !== -1) {
    return content.substring(xfaStart, xfaEnd + '</xfa:datasets>'.length);
  }

  // Alternative search for XFA data
  const xdpStart = content.indexOf('<xdp:xdp');
  const xdpEnd = content.indexOf('</xdp:xdp>');
  if (xdpStart !== -1 && xdpEnd !== -1) {
    return content.substring(xdpStart, xdpEnd + '</xdp:xdp>'.length);
  }

  return null;
}

export async function parseXfaXml(xml: string): Promise<any> {
  try {
    const result = await parseStringPromise(xml);
    return result;
  } catch (e) {
    console.error('Error parsing XFA XML:', e);
    return null;
  }
}
