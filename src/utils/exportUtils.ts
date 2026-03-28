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
import { formatCurrency, formatDate, calculateOutstandingYears } from './formatters';

export const generateWord = async (data: CompanyData, metadata: ReportMetadata) => {
  const navy = "1A2744";
  const lightGrey = "F5F5F5";
  const borderGrey = "E5E5E5";
  const openCharges = data.charges.filter(c => c.status === 'Open' || (!c.satisfactionDate || c.satisfactionDate.trim() === '' || c.satisfactionDate.toLowerCase() === 'n/a'));

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
        new Paragraph({ children: [new TextRun({ text: "1. Name of the Company:    ", bold: true }), new TextRun(data.companyName)], spacing: { before: 400 } }),
        new Paragraph({ children: [new TextRun({ text: "2. Corporate Identity Number:    ", bold: true }), new TextRun(data.cin)] }),
        new Paragraph({ children: [new TextRun({ text: "3. Registered Address:    ", bold: true }), new TextRun(data.registeredAddress)] }),
        new Paragraph({ children: [new TextRun({ text: "4. Status:    ", bold: true }), new TextRun(data.status)] }),
        new Paragraph({ children: [new TextRun({ text: "5. Date of Incorporation:    ", bold: true }), new TextRun(formatDate(data.incorporationDate))] }),

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
                createTableCell(formatDate(d.appointmentDate), false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(d.totalDirectorships.toString(), false, true, i % 2 === 0 ? "FFFFFF" : lightGrey)
              ]
            }))
          ]
        }),

        new Paragraph({ text: "7. Company Share Capital", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
        new Paragraph({ children: [new TextRun({ text: "Authorised Capital: ", bold: true }), new TextRun(formatCurrency(data.authorizedCapital) + " (" + data.authorizedCapitalWords + ")")] }),
        new Paragraph({ children: [new TextRun({ text: "Paid Up Capital: ", bold: true }), new TextRun(formatCurrency(data.paidUpCapital) + " (" + data.paidUpCapitalWords + ")")] }),

        new Paragraph({ text: "8. Company Highlights", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({ children: [createTableCell("CIN", true, false, "F0F0F0"), createTableCell(data.cin), createTableCell("Authorized Capital", true, false, "F0F0F0"), createTableCell(formatCurrency(data.authorizedCapital))] }),
            new TableRow({ children: [createTableCell("Age", true, false, "F0F0F0"), createTableCell(calculateAge(data.incorporationDate)), createTableCell("Open Charges", true, false, "F0F0F0"), createTableCell(openCharges.length.toString())] }),
            new TableRow({ children: [createTableCell("Status", true, false, "F0F0F0"), createTableCell(data.status), createTableCell("Paid Up Capital", true, false, "F0F0F0"), createTableCell(formatCurrency(data.paidUpCapital))] }),
            new TableRow({ children: [createTableCell("Class", true, false, "F0F0F0"), createTableCell(data.companyClass), createTableCell("Last AGM Date", true, false, "F0F0F0"), createTableCell(formatDate(data.lastAgmDate))] }),
            new TableRow({ children: [createTableCell("Category", true, false, "F0F0F0"), createTableCell(data.companyCategory), createTableCell("Balance Sheet Date", true, false, "F0F0F0"), createTableCell(formatDate(data.lastBalanceSheetDate))] }),
            new TableRow({ children: [createTableCell("Sub Category", true, false, "F0F0F0"), createTableCell(data.companySubCategory), createTableCell("Email ID", true, false, "F0F0F0"), createTableCell(data.email)] }),
            new TableRow({ children: [createTableCell("Industry", true, false, "F0F0F0"), createTableCell(data.industryDescription)] }),
            new TableRow({ children: [createTableCell("Address", true, false, "F0F0F0"), createTableCell(data.registeredAddress)] })
          ]
        }),

        new Paragraph({ text: "9. Directors Info and Other Directorships", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
        ...data.directors.flatMap((d, idx) => [
          new Paragraph({ text: `${idx + 1}. ${d.name} — (DIN: ${d.din})`, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: ["SNO", "Current Company", "Status", "Appointment Date", "Industry", "State"].map(h => createTableCell(h, true))
              }),
              ...(d.otherCompanies || []).map((oc, ocIdx) => new TableRow({
                children: [
                  createTableCell((ocIdx + 1).toString(), false, false, ocIdx % 2 === 0 ? "FFFFFF" : lightGrey),
                  createTableCell(oc.name, false, false, ocIdx % 2 === 0 ? "FFFFFF" : lightGrey),
                  createTableCell(oc.status, false, false, ocIdx % 2 === 0 ? "FFFFFF" : lightGrey),
                  createTableCell(formatDate(oc.appointmentDate), false, false, ocIdx % 2 === 0 ? "FFFFFF" : lightGrey),
                  createTableCell(oc.industry, false, false, ocIdx % 2 === 0 ? "FFFFFF" : lightGrey),
                  createTableCell(oc.state, false, false, ocIdx % 2 === 0 ? "FFFFFF" : lightGrey)
                ]
              }))
            ]
          })
        ]),

        new Paragraph({ text: "10. List of Continuing Charges", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: ["Sl.No", "Charge ID", "Charge Holder Name", "Amount (In Rupees)", "Date of Creation", "Date of Last Modification", "Outstanding Years"].map(h => createTableCell(h, true))
            }),
            ...data.charges.filter(c => c.status === 'Open' || (!c.satisfactionDate || c.satisfactionDate.trim() === '' || c.satisfactionDate.toLowerCase() === 'n/a')).map((c, i) => new TableRow({
              children: [
                createTableCell((i + 1).toString(), false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(c.id, false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(c.bankName, false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(`Rs. ${formatCurrency(c.amountSecured)}`, false, true, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(formatDate(c.creationDate), false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(formatDate(c.modificationDate) || 'N/A', false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(calculateOutstandingYears(c.creationDate, c.modificationDate), false, false, i % 2 === 0 ? "FFFFFF" : lightGrey)
              ]
            }))
          ]
        }),

        new Paragraph({ text: "11. Particulars of Charges", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
        ...data.charges.filter(c => c.status === 'Open' || (!c.satisfactionDate || c.satisfactionDate.trim() === '' || c.satisfactionDate.toLowerCase() === 'n/a')).flatMap((c, i) => [
          new Paragraph({ text: `${i + 1}. Charge Created on ${formatDate(c.creationDate) || '[DATE]'} vide charge ID number ${c.id || '[ID]'}`, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({ children: [createTableCell("1. Name & Address of the Person/Institution In Whose favor Charge is Created", true, false, "F0F0F0", 40), createTableCell(`${c.bankName || 'Not Available'}${c.bankAddress ? `\n${c.bankAddress}` : '\nAddress not available in records'}`)] }),
              new TableRow({ children: [createTableCell("2. Amount Secured By the Charge", true, false, "F0F0F0", 40), createTableCell(`Rs. ${formatCurrency(c.amountSecured)}\n(${c.amountInWords || 'Amount in words not available'})`)] }),
              new TableRow({ children: [createTableCell("3. Brief Particulars Of the Property Charged", true, false, "F0F0F0", 40), createTableCell(c.propertyCharged || "Not Available")] }),
              new TableRow({ children: [createTableCell("4. Terms and Conditions", true, false, "F0F0F0", 40), createTableCell(c.termsAndConditions || "Not Available")] }),
              new TableRow({ children: [createTableCell("5. Margin", true, false, "F0F0F0", 40), createTableCell(c.margin || "Not Available")] }),
              new TableRow({ children: [createTableCell("6. Terms of repayment", true, false, "F0F0F0", 40), createTableCell(c.repaymentTerms || "Not Available")] }),
              new TableRow({ children: [createTableCell("7. Extent and operation of the charge", true, false, "F0F0F0", 40), createTableCell(c.extentOfCharge || "Not Available")] })
            ]
          }),
          ...(c.modificationDate && c.modificationDate !== 'N/A' && c.modificationDate.toLowerCase() !== 'not available' && c.modificationDate.trim() !== '' ? [
            new Paragraph({ text: `${i + 1}.1M Charge Modification on ${formatDate(c.modificationDate)} vide charge ID number ${c.id}`, heading: HeadingLevel.HEADING_3, spacing: { before: 200, after: 100 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                new TableRow({ children: [createTableCell("Updated Amount/Terms", true, false, "F0F0F0", 40), createTableCell(`Rs. ${formatCurrency(c.modifiedAmountSecured || c.amountSecured)}\nModified on: ${formatDate(c.modificationDate)}`)] })
              ]
            })
          ] : [])
        ]),

        new Paragraph({ text: "12. Potential Related Parties", heading: HeadingLevel.HEADING_2, spacing: { before: 400, after: 200 } }),
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: ["S.No", "Current Company", "Status", "Age of Company (Years)", "State", "No. of Common Directors"].map(h => createTableCell(h, true))
            }),
            ...(data.potentialRelatedParties && data.potentialRelatedParties.length > 0 ? data.potentialRelatedParties.map((rp, i) => new TableRow({
              children: [
                createTableCell((i + 1).toString(), false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(rp.name, false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(rp.status, false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(rp.age, false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(rp.state, false, false, i % 2 === 0 ? "FFFFFF" : lightGrey),
                createTableCell(rp.commonDirectorsCount.toString(), false, true, i % 2 === 0 ? "FFFFFF" : lightGrey)
              ]
            })) : [new TableRow({ children: [createTableCell("No potential related parties identified — please verify manually", false, false, "FFFFFF")] })])
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
  const cleanText = (text: string, fallback: string = '') => {
    if (!text || text.trim().toLowerCase() === 'n/a') return fallback;
    return text.trim();
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
  doc.text(data.companyName, margin + 70, currentY);
  currentY += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('2. Corporate Identity Number:', margin, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(data.cin, margin + 70, currentY);
  currentY += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('3. Registered Address:', margin, currentY);
  doc.setFont('helvetica', 'normal');
  const regAddrLines = doc.splitTextToSize(data.registeredAddress, contentWidth - 70);
  doc.text(regAddrLines, margin + 70, currentY);
  currentY += (regAddrLines.length * 5) + 3;

  doc.setFont('helvetica', 'bold');
  doc.text('4. Status:', margin, currentY);
  doc.setFont('helvetica', 'bold');
  if (data.status === 'Active') {
    doc.setTextColor(16, 185, 129);
  } else {
    doc.setTextColor(220, 38, 38);
  }
  doc.text(data.status, margin + 70, currentY);
  doc.setTextColor(0, 0, 0);
  currentY += 8;

  doc.setFont('helvetica', 'bold');
  doc.text('5. Date of Incorporation:', margin, currentY);
  doc.setFont('helvetica', 'normal');
  doc.text(formatDate(data.incorporationDate), margin + 70, currentY);
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
    body: data.directors.map((d, i) => [i + 1, d.name, d.din, d.designation, formatDate(d.appointmentDate), d.totalDirectorships]),
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
  doc.text(`Rs. ${formatCurrency(data.authorizedCapital)}${authCapWords}`, margin + 50, currentY);
  currentY += 6;
  doc.setFont('helvetica', 'bold');
  doc.text('Paid Up Capital:', margin, currentY);
  doc.setFont('helvetica', 'normal');
  const paidUpWords = data.paidUpCapitalWords ? ` (${data.paidUpCapitalWords})` : '';
  doc.text(`Rs. ${formatCurrency(data.paidUpCapital)}${paidUpWords}`, margin + 50, currentY);
  currentY += 15;

  // 8. Highlights
  checkPageBreak(60);
  doc.setFont('helvetica', 'bold');
  doc.text('8. Company Highlights', margin, currentY);
  currentY += 5;

  const openCharges = data.charges.filter(c => c.status === 'Open' || (!c.satisfactionDate || c.satisfactionDate.trim() === '' || c.satisfactionDate.toLowerCase() === 'n/a'));

  const highlights = [
    ['CIN', data.cin, 'Authorized Capital', `Rs. ${formatCurrency(data.authorizedCapital)}`],
    ['Age', `${calculateAge(data.incorporationDate)}`, 'Open Charges', `${openCharges.length}`],
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

  data.directors.forEach((d, idx) => {
    checkPageBreak(30);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(26, 39, 68);
    doc.text(`${idx + 1}. ${d.name} — (DIN: ${d.din})`, margin, currentY);
    doc.setTextColor(0, 0, 0);
    currentY += 4;

    const hasCessationDate = (d.otherCompanies || []).some(c => c.cessationDate && c.cessationDate.trim() !== "");
    const head = hasCessationDate 
      ? [['SNO', 'Current Company', 'Status', 'Appointment Date', 'Cessation Date', 'Industry', 'State']]
      : [['SNO', 'Current Company', 'Status', 'Appointment Date', 'Industry', 'State']];

    autoTable(doc, {
      startY: currentY,
      head: head,
      body: (d.otherCompanies || []).map((oc, ocIdx) => {
        const row = [
          ocIdx + 1,
          cleanText(oc.name), 
          cleanText(oc.status), 
          formatDate(oc.appointmentDate),
        ];
        if (hasCessationDate) {
          row.push(formatDate(oc.cessationDate));
        }
        row.push(cleanText(oc.industry));
        row.push(cleanText(oc.state));
        return row;
      }),
      theme: 'grid',
      styles: { 
        cellPadding: 1.5,
        overflow: 'linebreak'
      },
      headStyles: { 
        fillColor: [245, 245, 245], 
        textColor: [0, 0, 0], 
        fontSize: 8, 
        fontStyle: 'bold',
        halign: 'center',
        lineWidth: 0.1,
        lineColor: [150, 150, 150]
      },
      bodyStyles: { 
        fontSize: 7,
        lineWidth: 0.1,
        lineColor: [150, 150, 150]
      },
      columnStyles: {
        0: { halign: 'center', cellWidth: 10 },
        2: { halign: 'center', cellWidth: 20 },
        3: { halign: 'center', cellWidth: 25 },
        4: hasCessationDate ? { halign: 'center', cellWidth: 25 } : { halign: 'center', cellWidth: 20 }
      },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => { currentY = data.cursor?.y || currentY; }
    });
    
    if (d.otherCompanies && d.otherCompanies.length > 0) {
      currentY += 4;
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(7);
      doc.setTextColor(120, 120, 120);
      doc.text('Data fetched from public MCA records — verify before finalising', margin, currentY);
      doc.setTextColor(0, 0, 0);
      currentY += 8;
    } else {
      currentY += 10;
    }
  });
  currentY += 5;

  // 10. List of Continuing Charges
  doc.addPage();
  currentY = 35;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('10. List of Continuing Charges', margin, currentY);
  currentY += 5;

  autoTable(doc, {
    startY: currentY,
    head: [['Sl.No', 'Charge ID', 'Charge Holder Name', 'Amount (In Rupees)', 'Date of Creation', 'Date of Last Modification', 'Outstanding Years']],
    body: openCharges.map((c, i) => [i + 1, c.id, c.bankName, `Rs. ${formatCurrency(c.amountSecured)}`, formatDate(c.creationDate), formatDate(c.modificationDate) || 'N/A', calculateOutstandingYears(c.creationDate, c.modificationDate)]),
    theme: 'grid',
    headStyles: { fillColor: [26, 39, 68], textColor: [255, 255, 255], fontSize: 9 },
    bodyStyles: { fontSize: 8 },
    columnStyles: { 3: { halign: 'right' } },
    margin: { left: margin, right: margin },
    didDrawPage: (data) => { currentY = data.cursor?.y || currentY; }
  });
  currentY += 15;

  // 11. Particulars of Charges
  doc.addPage();
  currentY = 35;
  doc.setFont('helvetica', 'bold');
  doc.text('11. Particulars of Charges', margin, currentY);
  currentY += 10;

  openCharges.forEach((c, i) => {
    checkPageBreak(80);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(`${i + 1}. Charge Created on ${formatDate(c.creationDate) || '[DATE]'} vide charge ID number ${c.id || '[ID]'}`, margin, currentY);
    currentY += 5;

    autoTable(doc, {
      startY: currentY,
      body: [
        ['1. Name & Address of the Person/Institution In Whose favor Charge is Created', `${c.bankName || 'Not Available'}\n${c.bankAddress || 'Address not available in records'}`],
        ['2. Amount Secured By the Charge', `Rs. ${formatCurrency(c.amountSecured)}\n(${c.amountInWords || 'Amount in words not available'})`],
        ['3. Brief Particulars Of the Property Charged', c.propertyCharged || 'Not Available'],
        ['4. Terms and Conditions', c.termsAndConditions || 'Not Available'],
        ['5. Margin', c.margin || 'Not Available'],
        ['6. Terms of repayment', c.repaymentTerms || 'Not Available'],
        ['7. Extent and operation of the charge', c.extentOfCharge || 'Not Available']
      ],
      theme: 'grid',
      styles: { fontSize: 8, cellPadding: 2 },
      columnStyles: { 0: { fontStyle: 'bold', cellWidth: 60, fillColor: [245, 245, 245] }, 1: { cellWidth: 110 } },
      margin: { left: margin, right: margin },
      didDrawPage: (data) => { currentY = data.cursor?.y || currentY; }
    });
    currentY += 10;

    if (c.modificationDate && c.modificationDate !== 'N/A' && c.modificationDate.toLowerCase() !== 'not available' && c.modificationDate.trim() !== '') {
      checkPageBreak(40);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`${i + 1}.1M Charge Modification on ${formatDate(c.modificationDate)} vide charge ID number ${c.id}`, margin, currentY);
      currentY += 5;

      autoTable(doc, {
        startY: currentY,
        body: [
          ['Updated Amount/Terms', `Rs. ${formatCurrency(c.modifiedAmountSecured || c.amountSecured)}\nModified on: ${formatDate(c.modificationDate)}`]
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

  // 12. Potential Related Parties
  doc.addPage();
  currentY = 35;
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('12. Potential Related Parties', margin, currentY);
  currentY += 10;

  autoTable(doc, {
    startY: currentY,
    head: [['S.No', 'Current Company', 'Status', 'Age of Company (Years)', 'State', 'No. of Common Directors']],
    body: data.potentialRelatedParties && data.potentialRelatedParties.length > 0 
      ? data.potentialRelatedParties.map((rp, i) => [i + 1, rp.name, rp.status, rp.age, rp.state, rp.commonDirectorsCount]) 
      : [['-', 'No potential related parties identified — please verify manually', '-', '-', '-', '-']],
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
