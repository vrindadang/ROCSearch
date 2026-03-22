import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, AlignmentType, HeadingLevel, TextRun, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { CompanyData, ReportMetadata } from '../types';
import { FIRM_DETAILS } from '../constants';
import { formatCurrency } from './formatters';

export async function exportToWord(data: CompanyData, metadata: ReportMetadata) {
  const dateStr = new Date().toISOString().split('T')[0];
  const fileName = `ROC_Report_${data.companyName.replace(/[^a-z0-9]/gi, '_')}_${dateStr}.docx`;

  const openCharges = (data.charges || []).filter(c => c.status === 'Open');
  const satisfiedCharges = (data.charges || []).filter(c => c.status === 'Satisfied');

  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [
          // Header
          new Paragraph({
            children: [
              new TextRun({ text: FIRM_DETAILS.name, bold: true, size: 32, color: '1a2744' }),
            ],
          }),
          new Paragraph({
            children: [
              new TextRun({ text: FIRM_DETAILS.type, bold: true, size: 20, color: '666666' }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            children: [
              new TextRun({ text: `${FIRM_DETAILS.address}\nMobile: ${FIRM_DETAILS.phone}\nEmail: ${FIRM_DETAILS.email}`, size: 16 }),
            ],
          }),
          
          new Paragraph({ text: '', spacing: { before: 400, after: 400 } }),

          // Title
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'ROC SEARCH & STATUS REPORT', bold: true, size: 48, color: '1a2744' }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: 'OF', italics: true, size: 28 }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: data.companyName, bold: true, size: 36, color: '1a2744' }),
            ],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            children: [
              new TextRun({ text: `CIN: ${data.cin}`, bold: true, size: 24 }),
            ],
          }),

          new Paragraph({ text: '', spacing: { before: 800 } }),

          // Details Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              createTableRow('1. Name of the Company', data.companyName),
              createTableRow('2. Corporate Identity Number', data.cin),
              createTableRow('3. Registered Address', data.registeredAddress),
              createTableRow('4. Status', data.status),
              createTableRow('5. Date of Incorporation', data.incorporationDate),
            ],
          }),

          new Paragraph({ text: '', spacing: { before: 400 } }),

          // Directors Table
          new Paragraph({ text: '6. Directors/Signatory Details', heading: HeadingLevel.HEADING_3 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('S.No'),
                  createHeaderCell('Director Name'),
                  createHeaderCell('DIN'),
                  createHeaderCell('Designation'),
                  createHeaderCell('Appt. Date'),
                ],
              }),
              ...(data.directors || []).map((d, i) => new TableRow({
                children: [
                  createCell((i + 1).toString()),
                  createCell(d.name, true),
                  createCell(d.din),
                  createCell(d.designation),
                  createCell(d.appointmentDate),
                ],
              })),
            ],
          }),

          new Paragraph({ text: '', spacing: { before: 400 } }),

          // Open Charges Table
          new Paragraph({ text: '10. List of Open/Continuing Charges', heading: HeadingLevel.HEADING_3 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Sl.No'),
                  createHeaderCell('Charge ID'),
                  createHeaderCell('Charge Holder Name'),
                  createHeaderCell('Amount (Rs.)'),
                  createHeaderCell('Creation Date'),
                ],
              }),
              ...openCharges.map((c, i) => new TableRow({
                children: [
                  createCell((i + 1).toString()),
                  createCell(c.id, true),
                  createCell(c.bankName),
                  createCell(formatCurrency(c.amountSecured)),
                  createCell(c.creationDate),
                ],
              })),
            ],
          }),

          new Paragraph({ text: '', spacing: { before: 400 } }),

          // Satisfied Charges Table
          new Paragraph({ text: '11. List of Satisfied/Closed Charges', heading: HeadingLevel.HEADING_3 }),
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  createHeaderCell('Sl.No'),
                  createHeaderCell('Charge ID'),
                  createHeaderCell('Charge Holder Name'),
                  createHeaderCell('Amount (Rs.)'),
                  createHeaderCell('Satisfaction Date'),
                ],
              }),
              ...satisfiedCharges.map((c, i) => new TableRow({
                children: [
                  createCell((i + 1).toString()),
                  createCell(c.id, true),
                  createCell(c.bankName),
                  createCell(formatCurrency(c.amountSecured)),
                  createCell(c.satisfactionDate || 'N/A'),
                ],
              })),
            ],
          }),

          new Paragraph({ text: '', spacing: { before: 400 } }),

          // Detailed Charge Blocks
          new Paragraph({ text: '12. Detailed Charge Blocks', heading: HeadingLevel.HEADING_3 }),
          ...(data.charges || []).map((c, i) => [
            new Paragraph({ text: `Charge No. ${i + 1}`, heading: HeadingLevel.HEADING_4, spacing: { before: 200 } }),
            new Table({
              width: { size: 100, type: WidthType.PERCENTAGE },
              rows: [
                createTableRow('Charge ID', c.id),
                createTableRow('Bank/Institution', c.bankName),
                createTableRow('Amount Secured', `${formatCurrency(c.amountSecured)} (${c.amountInWords})`),
                createTableRow('Property Description', c.isDetailed ? c.propertyCharged : 'Details not available — CHG file not uploaded'),
                createTableRow('Terms & Conditions', c.isDetailed ? c.termsAndConditions : 'Details not available — CHG file not uploaded'),
                createTableRow('Margin', c.isDetailed ? c.margin : 'Details not available — CHG file not uploaded'),
                createTableRow('Repayment Terms', c.isDetailed ? c.repaymentTerms : 'Details not available — CHG file not uploaded'),
                createTableRow('Extent of Charge', c.isDetailed ? c.extentOfCharge : 'Details not available — CHG file not uploaded'),
                createTableRow('Date of Creation', c.creationDate),
                createTableRow('Status', c.status),
              ],
            }),
          ]).flat(),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  saveAs(blob, fileName);
}

function createTableRow(label: string, value: string) {
  return new TableRow({
    children: [
      new TableCell({
        children: [new Paragraph({ children: [new TextRun({ text: label, bold: true })] })],
        width: { size: 40, type: WidthType.PERCENTAGE },
      }),
      new TableCell({
        children: [new Paragraph({ text: value })],
        width: { size: 60, type: WidthType.PERCENTAGE },
      }),
    ],
  });
}

function createHeaderCell(text: string) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold: true, color: 'ffffff' })], alignment: AlignmentType.CENTER })],
    shading: { fill: '1a2744' },
  });
}

function createCell(text: string, bold: boolean = false) {
  return new TableCell({
    children: [new Paragraph({ children: [new TextRun({ text, bold })] })],
  });
}
