import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  WidthType, 
  BorderStyle, 
  AlignmentType, 
  Header, 
  Footer, 
  PageNumber, 
  VerticalAlign,
  HeadingLevel,
  ShadingType
} from 'docx';
import { saveAs } from 'file-saver';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { CompanyData, ReportMetadata } from '../types';
import { FIRM_DETAILS } from '../constants';
import { formatCurrency } from './formatters';

export const generateWord = async (data: CompanyData, metadata: ReportMetadata) => {
  const navy = "1A2744";
  const lightGrey = "F5F5F5";
  const borderGrey = "E5E5E5";

  const createTableCell = (text: string, isHeader = false, isAmount = false, bgColor?: string, width?: number) => {
    return new TableCell({
      width: width ? { size: width, type: WidthType.PERCENTAGE } : undefined,
      children: [new Paragraph({
        children: [new TextRun({
          text: text,
          bold: isHeader,
          size: isHeader ? 20 : 18,
          color: isHeader ? "FFFFFF" : "000000"
        })],
        alignment: isAmount ? AlignmentType.RIGHT : AlignmentType.LEFT
      })],
      shading: {
        fill: bgColor || (isHeader ? navy : "FFFFFF"),
        type: ShadingType.CLEAR
      },
      verticalAlign: VerticalAlign.CENTER,
      margins: { top: 100, bottom: 100, left: 100, right: 100 }
    });
  };

  const doc = new Document({
    sections: [{
      properties: {
        page: {
          margin: { top: 1134, right: 1134, bottom: 1134, left: 1134 } // 20mm
        }
      },
      headers: {
        default: new Header({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: FIRM_DETAILS.name, bold: true, size: 28, color: navy }),
                new TextRun({ text: `\n${FIRM_DETAILS.type}`, size: 16, color: "666666" })
              ]
            }),
            new Paragraph({
              children: [
                new TextRun({ text: `${FIRM_DETAILS.address}\nMobile: ${FIRM_DETAILS.phone} | Email: ${FIRM_DETAILS.email}`, size: 14, color: "999999" })
              ],
              alignment: AlignmentType.RIGHT
            })
          ]
        })
      },
      footers: {
        default: new Footer({
          children: [
            new Paragraph({
              children: [
                new TextRun({ text: `${metadata.referenceNumber} | ${new Date(metadata.reportDate).toLocaleDateString('en-IN')}`, size: 16, color: "999999" }),
                new TextRun({ children: [" | Page ", PageNumber.CURRENT, " of ", PageNumber.TOTAL_PAGES], size: 16, color: "999999" })
              ],
              alignment: AlignmentType.CENTER
            })
          ]
        })
      },
      children: [
        // Title Page
        new Paragraph({ text: "", spacing: { before: 1000 } }),
        new Paragraph({
          children: [new TextRun({ text: "ROC SEARCH & STATUS REPORT", bold: true, size: 48, color: navy })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        new Paragraph({
          children: [new TextRun({ text: "OF", italics: true, size: 28, color: "777777" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        new Paragraph({
          children: [new TextRun({ text: data.companyName.toUpperCase(), bold: true, size: 36, color: navy })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 400 }
        }),
        new Paragraph({
          children: [new TextRun({ text: `CIN: ${data.cin}`, bold: true, size: 28 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 1000 }
        }),
        new Paragraph({
          children: [new TextRun({ text: "REGISTERED OFFICE", bold: true, size: 20, underline: {} })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [new TextRun({ text: data.registeredAddress, size: 18 })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 1000 }
        }),
        new Paragraph({
          children: [new TextRun({ text: "ON BEHALF OF", italics: true, size: 24, color: "777777" })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 200 }
        }),
        new Paragraph({
          children: [new TextRun({ text: metadata.clientName, bold: true, size: 32, color: navy })],
          alignment: AlignmentType.CENTER,
          spacing: { after: 1000 }
        }),

        // Content
        new Paragraph({ text: "1. Name of the Company: " + data.companyName, heading: HeadingLevel.HEADING_3, spacing: { before: 400 } }),
        new Paragraph({ text: "2. Corporate Identity Number: " + data.cin, heading: HeadingLevel.HEADING_3 }),
        new Paragraph({ text: "3. Registered Address: " + data.registeredAddress, heading: HeadingLevel.HEADING_3 }),
        new Paragraph({ text: "4. Status: " + data.status, heading: HeadingLevel.HEADING_3 }),
        new Paragraph({ text: "5. Date of Incorporation: " + data.incorporationDate, heading: HeadingLevel.HEADING_3 }),

        new Paragraph({ text: "6. Directors/Signatory Details", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: ["S.No", "Director Name", "DIN", "Designation", "Appt. Date", "Directorships"].map(h => createTableCell(h, true))
            }),
            ...data.directors.map((d, i) => new TableRow({
              children: [
                createTableCell((i + 1).toString(), false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(d.name, false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(d.din, false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(d.designation, false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(d.appointmentDate, false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(d.totalDirectorships.toString(), false, true, i % 2 === 0 ? "FFFFFF" : lightGrey)
              ]
            }))
          ]
        }),

        new Paragraph({ text: "7. Company Share Capital", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: "Authorised Capital: ", bold: true }), new TextRun(formatCurrency(data.authorizedCapital) + " (" + data.authorizedCapitalWords + ")")] }),
        new Paragraph({ children: [new TextRun({ text: "Paid Up Capital: ", bold: true }), new TextRun(formatCurrency(data.paidUpCapital) + " (" + data.paidUpCapitalWords + ")")] }),

        new Paragraph({ text: "10. List of Continuing Charges", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: ["Sl.No", "Charge ID", "Charge Holder Name", "Amount (INR)", "Creation Date", "Mod. Date"].map(h => createTableCell(h, true))
            }),
            ...data.charges.filter(c => c.status === 'Open' || (!c.satisfactionDate || c.satisfactionDate.trim() === '' || c.satisfactionDate.toLowerCase() === 'n/a')).map((c, i) => new TableRow({
              children: [
                createTableCell((i + 1).toString(), false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(c.id, false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(c.bankName, false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(formatCurrency(c.amountSecured), false, true, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(c.creationDate, false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(c.modificationDate || 'N/A', false, false, i % 2 === 0 ? "FFFFFF" : lightGrey)
              ]
            }))
          ]
        }),

        new Paragraph({ text: "12. Particulars of Charges", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
        ...data.charges.filter(c => c.status === 'Open' || (!c.satisfactionDate || c.satisfactionDate.trim() === '' || c.satisfactionDate.toLowerCase() === 'n/a')).flatMap((c, i) => [
          new Paragraph({ text: `${i + 1}. Charge Created on ${c.creationDate || '[DATE]'} vide charge ID number ${c.id || '[ID]'}`, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: [createTableCell("Name & Address of the Person/Institution In Whose Favour Charge is Created", true, false, "F0F0F0", 40), createTableCell(`${c.bankName || 'Not Available'}${c.bankAddress ? `\n${c.bankAddress}` : '\nAddress not available in records'}`)] }),
              new TableRow({ children: [createTableCell("Amount Secured By the Charge", true, false, "F0F0F0", 40), createTableCell(`Rs. ${formatCurrency(c.amountSecured)}\n(${c.amountInWords || 'Amount in words not available'})`)] }),
              new TableRow({ children: [createTableCell("Brief Particulars of the Property Charged", true, false, "F0F0F0", 40), createTableCell(c.propertyCharged || "Not Available")] }),
              new TableRow({ children: [createTableCell("Terms and Conditions", true, false, "F0F0F0", 40), createTableCell(c.termsAndConditions || "Not Available")] }),
              new TableRow({ children: [createTableCell("Margin", true, false, "F0F0F0", 40), createTableCell(c.margin || "Not Available")] }),
              new TableRow({ children: [createTableCell("Terms of Repayment", true, false, "F0F0F0", 40), createTableCell(c.repaymentTerms || "Not Available")] }),
              new TableRow({ children: [createTableCell("Extent and Operation of the Charge", true, false, "F0F0F0", 40), createTableCell(c.extentOfCharge || "Not Available")] })
            ]
          }),
          ...(c.modificationDate && c.modificationDate !== 'N/A' ? [
            new Paragraph({ text: `${i + 1}.1M Charge Modification on ${c.modificationDate} vide charge ID number ${c.id}`, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({ children: [createTableCell("Updated Amount/Terms", true, false, "F0F0F0", 40), createTableCell(`Rs. ${formatCurrency(c.amountSecured)}\nModified on: ${c.modificationDate}`)] })
              ]
            })
          ] : [])
        ]),

        new Paragraph({ text: "13. Potential Related Parties", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
        new Paragraph({ text: "A. Associate / Subsidiary Companies (as per MGT-7)", heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: ["S.No", "CIN/FCRN", "Name of Company", "Nature", "% Shares"].map(h => createTableCell(h, true))
            }),
            ...(data.associateSubsidiaries.length > 0 ? data.associateSubsidiaries.map((a, i) => new TableRow({
              children: [
                createTableCell((i + 1).toString(), false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(a.cin, false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(a.name, false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(a.nature, false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(a.sharesHeld, false, true, i % 2 === 0 ? "FFFFFF" : lightGrey)
              ]
            })) : [new TableRow({ children: [createTableCell("No data found in MGT-7", false, false, "FFFFFF")] })])
          ]
        }),

        new Paragraph({ text: "B. Companies with Common Directorship", heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: ["S.No", "Company Name", "Status", "Age", "State", "Common Directors"].map(h => createTableCell(h, true))
            }),
            ...(data.commonDirectorships.length > 0 ? data.commonDirectorships.map((cd, i) => new TableRow({
              children: [
                createTableCell((i + 1).toString(), false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(cd.name, false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(cd.status, false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(cd.age, false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(cd.state, false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(cd.commonDirectorsCount.toString(), false, true, i % 2 === 0 ? "FFFFFF" : lightGrey)
              ]
            })) : [new TableRow({ children: [createTableCell("No common directorships identified", false, false, "FFFFFF")] })])
          ]
        }),

        new Paragraph({ text: "", spacing: { before: 1000 } }),
        new Paragraph({ children: [new TextRun({ text: "Place: Delhi", bold: true })] }),
        new Paragraph({ children: [new TextRun({ text: `UDIN: ${metadata.udin || '____________________'}`, bold: true })] }),
        new Paragraph({ text: "", spacing: { before: 400 } }),
        new Paragraph({ children: [new TextRun({ text: `For ${FIRM_DETAILS.name}`, bold: true })], alignment: AlignmentType.RIGHT }),
        new Paragraph({ children: [new TextRun({ text: FIRM_DETAILS.type, bold: true })], alignment: AlignmentType.RIGHT }),
        new Paragraph({ children: [new TextRun({ text: `FRN: ${FIRM_DETAILS.frn}`, bold: true })], alignment: AlignmentType.RIGHT }),
        new Paragraph({ text: "", spacing: { before: 1000 } }),
        new Paragraph({ children: [new TextRun({ text: FIRM_DETAILS.proprietor, bold: true })], alignment: AlignmentType.RIGHT }),
        new Paragraph({ children: [new TextRun({ text: `Proprietor | M.No. ${FIRM_DETAILS.membershipNo}`, bold: true })], alignment: AlignmentType.RIGHT })
      ]
    }]
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, `ROC_Search_Report_${data.companyName.replace(/\s+/g, '_')}.docx`);
};

export const generatePDF = (data: CompanyData, metadata: ReportMetadata) => {
  const doc = new jsPDF({
    orientation: 'p',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);

  // Helper for Header and Footer
  const addHeaderFooter = (pdf: jsPDF, pageNum: number, totalPages: number) => {
    // Header
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(14);
    pdf.setTextColor(26, 39, 68); // Navy
    pdf.text(FIRM_DETAILS.name, margin, 15);
    
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8);
    pdf.setTextColor(100, 100, 100);
    pdf.text(FIRM_DETAILS.type, margin, 19);
    
    pdf.setFontSize(7);
    const addressLines = pdf.splitTextToSize(FIRM_DETAILS.address, 60);
    pdf.text(addressLines, pageWidth - margin, 12, { align: 'right' });
    pdf.text(`Mobile: ${FIRM_DETAILS.phone} | Email: ${FIRM_DETAILS.email}`, pageWidth - margin, 12 + (addressLines.length * 3), { align: 'right' });
    
    pdf.setDrawColor(26, 39, 68);
    pdf.setLineWidth(0.5);
    pdf.line(margin, 25, pageWidth - margin, 25);

    // Footer
    pdf.setDrawColor(240, 240, 240);
    pdf.line(margin, pageHeight - 15, pageWidth - margin, pageHeight - 15);
    
    pdf.setFontSize(8);
    pdf.setTextColor(150, 150, 150);
    const dateStr = new Date(metadata.reportDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
    pdf.text(`${metadata.referenceNumber || 'N/A'} | ${dateStr}`, margin, pageHeight - 10);
    pdf.text(`Page ${pageNum} of ${totalPages}`, pageWidth - margin, pageHeight - 10, { align: 'right' });
  };

  // Title Page
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(26, 39, 68);
  doc.text('ROC SEARCH & STATUS REPORT', pageWidth / 2, 60, { align: 'center' });
  
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(14);
  doc.setTextColor(120, 120, 120);
  doc.text('OF', pageWidth / 2, 75, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(26, 39, 68);
  doc.text(data.companyName.toUpperCase(), pageWidth / 2, 90, { align: 'center' });
  
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(`CIN: ${data.cin}`, pageWidth / 2, 105, { align: 'center' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('REGISTERED OFFICE', pageWidth / 2, 125, { align: 'center' });
  doc.setFont('helvetica', 'normal');
  const addrLines = doc.splitTextToSize(data.registeredAddress, 120);
  doc.text(addrLines, pageWidth / 2, 132, { align: 'center' });

  doc.setFont('helvetica', 'italic');
  doc.setFontSize(12);
  doc.setTextColor(120, 120, 120);
  doc.text('ON BEHALF OF', pageWidth / 2, 160, { align: 'center' });
  
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.setTextColor(26, 39, 68);
  doc.text(metadata.clientName, pageWidth / 2, 170, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(`Ref No: ${metadata.referenceNumber}`, margin, 220);
  doc.text(`Date: ${new Date(metadata.reportDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}`, pageWidth - margin, 220, { align: 'right' });

  // Main Content
  doc.addPage();
  let currentY = 35;

  // Helper to clean up text and prevent extra information
  const cleanText = (text: string) => {
    if (!text) return 'N/A';
    
    // If text is very long, it's likely a raw dump, try to extract the actual name
    if (text.length > 200) {
      // Look for "Company Name: " or "Company: " or "Name: "
      const match = text.match(/(?:Company Name|Company|Name):\s*([^.]+)/i);
      if (match && match[1]) {
        return match[1].trim();
      }
      // If no match, just take the first line and truncate
      const firstLine = text.split('\n')[0].trim();
      return firstLine.substring(0, 100) + '...';
    }
    
    const firstLine = text.split('\n')[0].trim();
    return firstLine;
  };

  const checkPageBreak = (heightNeeded: number) => {
    if (currentY + heightNeeded > pageHeight - 25) {
      doc.addPage();
      currentY = 35;
    }
  };

  // 1-5 Basic Info
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text('1. Name of the Company:', margin, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.companyName, margin + 55, currentY);
  currentY += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('2. Corporate Identity Number:', margin, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.cin, margin + 55, currentY);
  currentY += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('3. Registered Address:', margin, currentY);
  doc.setFont('helvetica', 'normal');
  const regAddrLines = doc.splitTextToSize(data.registeredAddress, contentWidth - 55);
  doc.text(regAddrLines, margin + 55, currentY);
  currentY += (regAddrLines.length * 5) + 3;

  doc.setFont('helvetica', 'bold');
  doc.text('4. Status:', margin, currentY);
  doc.setFont('helvetica', 'bold');
  if (data.status === 'Active') {
    doc.setTextColor(16, 185, 129);
  } else {
    doc.setTextColor(220, 38, 38);
  }
  doc.text(data.status, margin + 55, currentY);
  doc.setTextColor(0, 0, 0);
  currentY += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('5. Date of Incorporation:', margin, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.incorporationDate, margin + 55, currentY);
  currentY += 15;

  // 6. Directors Table
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('6. Directors/Signatory Details', margin, currentY);
  currentY += 5;

  autoTable(doc, {
    startY: currentY,
    head: [['S.No', 'Director Name', 'DIN', 'Designation', 'Appt. Date', 'Directorships']],
    body: data.directors.map((d, i) => [i + 1, d.name, d.din, d.designation, d.appointmentDate, d.totalDirectorships]),
    theme: 'grid',
    headStyles: { fillColor: [26, 39, 68], textColor: [255, 255, 255], fontSize: 9, fontStyle: 'bold' },
    bodyStyles: { fontSize: 8, textColor: [0, 0, 0] },
    alternateRowStyles: { fillColor: [245, 245, 245] },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => { currentY = data.cursor?.y || currentY; }
  });
  currentY += 15;

  // 7. Share Capital
  checkPageBreak(30);
  doc.setFont('helvetica', 'bold');
  doc.text('7. Company Share Capital', margin, currentY);
  currentY += 8;
  doc.setFontSize(10);
  doc.text('Authorised Capital:', margin, currentY);
  doc.setFont('helvetica', 'normal');
  const authCapWords = data.authorizedCapitalWords ? ` (${data.authorizedCapitalWords})` : '';
  doc.text(`Rs. ${formatCurrency(data.authorizedCapital)}${authCapWords}`, margin + 40, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Paid Up Capital:', margin, currentY);
  doc.setFont('helvetica', 'normal');
  const paidUpWords = data.paidUpCapitalWords ? ` (${data.paidUpCapitalWords})` : '';
  doc.text(`Rs. ${formatCurrency(data.paidUpCapital)}${paidUpWords}`, margin + 40, currentY);
  currentY += 15;

  // 8. Highlights
  checkPageBreak(60);
  doc.setFont('helvetica', 'bold');
  doc.text('8. Company Highlights', margin, currentY);
  currentY += 5;

  const highlights = [
    ['CIN', data.cin, 'Authorized Capital', `Rs. ${formatCurrency(data.authorizedCapital)}`],
    ['Age', `${calculateAge(data.incorporationDate)}`, 'Open Charges', `${data.charges.filter(c => !c.satisfactionDate).length}`],
    ['Status', data.status, 'Paid Up Capital', `Rs. ${formatCurrency(data.paidUpCapital)}`],
    ['Class', data.companyClass, 'Last AGM Date', data.lastAgmDate],
    ['Category', data.companyCategory, 'Balance Sheet Date', data.lastBalanceSheetDate],
    ['Sub Category', data.companySubCategory, 'Email ID', data.email],
    ['Industry', data.industryDescription, '', ''],
    ['Address', data.registeredAddress, '', '']
  ];

  autoTable(doc, {
    startY: currentY,
    body: highlights,
    theme: 'grid',
    styles: { fontSize: 8, cellPadding: 2 },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 35 },
      1: { cellWidth: 50 },
      2: { fontStyle: 'bold', fillColor: [245, 245, 245], cellWidth: 35 },
      3: { cellWidth: 50 }
    },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => { currentY = data.cursor?.y || currentY; }
  });
  currentY += 15;

  // 9. Other Directorships
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.text('9. Directors Info and Other Directorships', margin, currentY);
  currentY += 8;

  data.directors.forEach(d => {
    checkPageBreak(30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 39, 68);
    doc.text(`${d.name} (${d.din})`, margin, currentY);
    doc.setTextColor(0, 0, 0);
    currentY += 4;

    autoTable(doc, {
      startY: currentY,
      head: [['Company Name', 'Status', 'Appt. Date', 'Cessation Date', 'Industry', 'State']],
      body: (d.otherCompanies || []).map(oc => [
        cleanText(oc.name), 
        cleanText(oc.status), 
        cleanText(oc.appointmentDate), 
        cleanText(oc.cessationDate || 'N/A'),
        cleanText(oc.industry), 
        cleanText(oc.state)
      ]),
      theme: 'grid',
      headStyles: { fillColor: [230, 230, 230], textColor: [50, 50, 50], fontSize: 8, fontStyle: 'bold' },
      bodyStyles: { fontSize: 7 },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => { currentY = data.cursor?.y || currentY; }
    });
    currentY += 10;
  });
  currentY += 5;

  // 10. List of Continuing Charges
  doc.addPage();
  currentY = 35;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('10. List of Continuing Charges', margin, currentY);
  currentY += 5;

  const openCharges = data.charges.filter(c => c.status === 'Open' || (!c.satisfactionDate || c.satisfactionDate.trim() === '' || c.satisfactionDate.toLowerCase() === 'n/a'));
  autoTable(doc, {
    startY: currentY,
    head: [['Sl.No', 'Charge ID', 'Charge Holder Name', 'Amount (INR)', 'Creation Date', 'Mod. Date']],
    body: openCharges.map((c, i) => [i + 1, c.id, c.bankName, `Rs. ${formatCurrency(c.amountSecured)}`, c.creationDate, c.modificationDate || 'N/A']),
    theme: 'grid',
    headStyles: { fillColor: [26, 39, 68], textColor: [255, 255, 255], fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 3: { halign: 'right' } },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => { currentY = data.cursor?.y || currentY; }
  });
  currentY += 15;

  // 11. List of Satisfied Charges
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.text('11. List of Satisfied Charges', margin, currentY);
  currentY += 5;

  const satisfiedCharges = data.charges.filter(c => c.status === 'Satisfied' || (c.satisfactionDate && c.satisfactionDate.trim() !== '' && c.satisfactionDate.toLowerCase() !== 'n/a'));
  autoTable(doc, {
    startY: currentY,
    head: [['Sl.No', 'Charge ID', 'Charge Holder', 'Amount', 'Creation Date', 'Sat. Date']],
    body: satisfiedCharges.map((c, i) => [i + 1, c.id, c.bankName, `Rs. ${formatCurrency(c.amountSecured)}`, c.creationDate, c.satisfactionDate]),
    theme: 'grid',
    headStyles: { fillColor: [200, 200, 200], textColor: [50, 50, 50], fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 3: { halign: 'right' } },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => { currentY = data.cursor?.y || currentY; }
  });
  currentY += 15;

  // 12. Particulars of Charges
  doc.addPage();
  currentY = 35;
  doc.setFont('helvetica', 'bold');
  doc.text('12. Particulars of Charges', margin, currentY);
  currentY += 10;

  openCharges.forEach((c, i) => {
    checkPageBreak(80);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${i + 1}. Charge Created on ${c.creationDate || '[DATE]'} vide charge ID number ${c.id || '[ID]'}`, margin, currentY);
    currentY += 5;

    autoTable(doc, {
      startY: currentY,
      body: [
        ['Name & Address of the Person/Institution In Whose Favour Charge is Created', `${c.bankName || 'Not Available'}\n${c.bankAddress || 'Address not available in records'}`],
        ['Amount Secured By the Charge', `Rs. ${formatCurrency(c.amountSecured)}\n(${c.amountInWords || 'Amount in words not available'})`],
        ['Brief Particulars of the Property Charged', c.propertyCharged || 'Not Available'],
        ['Terms and Conditions', c.termsAndConditions || 'Not Available'],
        ['Margin', c.margin || 'Not Available'],
        ['Terms of Repayment', c.repaymentTerms || 'Not Available'],
        ['Extent and Operation of the Charge', c.extentOfCharge || 'Not Available']
      ],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60, fillColor: [245, 245, 245] }, 1: { cellWidth: 110 } },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => { currentY = data.cursor?.y || currentY; }
    });
    currentY += 10;

    if (c.modificationDate && c.modificationDate !== 'N/A') {
      checkPageBreak(40);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}.1M Charge Modification on ${c.modificationDate} vide charge ID number ${c.id}`, margin, currentY);
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        body: [
          ['Updated Amount/Terms', `Rs. ${formatCurrency(c.amountSecured)}\nModified on: ${c.modificationDate}`]
        ],
        theme: 'grid',
        styles: { fontSize: 8, cellPadding: 2 },
        columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60, fillColor: [245, 245, 245] }, 1: { cellWidth: 110 } },
        margin: { left: margin, right: margin },
        didDrawPage: (data) => { currentY = data.cursor?.y || currentY; }
      });
      currentY += 10;
    }
    currentY += 5;
  });

  // 13. Related Parties
  doc.addPage();
  currentY = 35;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('13. Potential Related Parties', margin, currentY);
  currentY += 10;

  // Table A
  doc.setFontSize(9);
  doc.text('A. Associate / Subsidiary Companies (as per MGT-7)', margin, currentY);
  currentY += 5;
  autoTable(doc, {
    startY: currentY,
    head: [['S.No', 'CIN/FCRN', 'Name of Company', 'Nature', '% Shares']],
    body: data.associateSubsidiaries.length > 0 ? data.associateSubsidiaries.map((a, i) => [i + 1, a.cin, a.name, a.nature, a.sharesHeld]) : [['-', 'No data found in MGT-7', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [26, 39, 68], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => { currentY = data.cursor?.y || currentY; }
  });
  currentY += 15;

  // Table B
  checkPageBreak(40);
  doc.setFontSize(9);
  doc.text('B. Companies with Common Directorship', margin, currentY);
  currentY += 5;
  autoTable(doc, {
    startY: currentY,
    head: [['S.No', 'Company Name', 'Status', 'Age', 'State', 'Common Directors']],
    body: data.commonDirectorships.length > 0 ? data.commonDirectorships.map((cd, i) => [i + 1, cd.name, cd.status, cd.age, cd.state, cd.commonDirectorsCount]) : [['-', 'No common directorships identified', '-', '-', '-', '-']],
    theme: 'grid',
    headStyles: { fillColor: [26, 39, 68], textColor: [255, 255, 255], fontSize: 8 },
    bodyStyles: { fontSize: 7 },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => { currentY = data.cursor?.y || currentY; }
  });
  currentY += 20;

  // Signature Section
  checkPageBreak(60);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('Place: Delhi', margin, currentY);
  doc.text(`UDIN: ${metadata.udin || '____________________'}`, margin, currentY + 6);

  const sigX = pageWidth - margin - 60;
  doc.text(`For ${FIRM_DETAILS.name}`, sigX, currentY);
  doc.text(FIRM_DETAILS.type, sigX, currentY + 5);
  doc.text(`FRN: ${FIRM_DETAILS.frn}`, sigX, currentY + 10);
  
  doc.setDrawColor(200, 200, 200);
  doc.rect(sigX, currentY + 15, 50, 20);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'italic');
  doc.text('Signature Box', sigX + 15, currentY + 27);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text(FIRM_DETAILS.proprietor, sigX, currentY + 45);
  doc.text(`Proprietor | M.No. ${FIRM_DETAILS.membershipNo}`, sigX, currentY + 50);

  // Add Headers and Footers to all pages
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    addHeaderFooter(doc, i, totalPages);
  }

  doc.save(`ROC_Search_Report_${data.companyName.replace(/\s+/g, '_')}.pdf`);
};

function calculateAge(dateStr: string): string {
  if (!dateStr || dateStr === 'N/A') return 'N/A';
  try {
    const birthDate = new Date(dateStr);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return `${age} Years`;
  } catch {
    return 'N/A';
  }
}
