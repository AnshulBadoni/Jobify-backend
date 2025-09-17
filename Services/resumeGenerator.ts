import PDFDocument from "pdfkit";
import fs from "fs";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { Resume } from "../types";

const DARK_GRAY = "#333333";

// ---------- PDF Helper ----------
function addPDFSection(doc: PDFKit.PDFDocument, title: string) {
    doc.moveDown(1);
    doc.font("Helvetica-Bold").fontSize(11).fillColor(DARK_GRAY).text(title.toUpperCase());
    const y = doc.y;
    doc.moveTo(50, y + 2).lineTo(550, y + 2).strokeColor(DARK_GRAY).lineWidth(0.5).stroke();
    doc.moveDown();
}

// ---------- PDF Generator ----------
export function generatePDF(resume: Resume, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({ margin: 50 });
            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            // ---- Header ----
            doc.font("Helvetica").fontSize(18).fillColor(DARK_GRAY).text(resume.name, { align: "center" });
            if (resume.role) {
                doc.font("Helvetica").fontSize(11).fillColor(DARK_GRAY).text(resume.role, { align: "center" });
            }
            doc.moveDown(0.3);
            doc.font("Helvetica").fontSize(9).fillColor(DARK_GRAY).text(resume.contact, { align: "center" });
            doc.moveDown(1);

            // ---- Summary ----
            if (resume.summary) {
                addPDFSection(doc, "Summary");
                doc.font("Helvetica").fontSize(9).fillColor(DARK_GRAY)
                    .text(resume.summary, { align: "justify", lineGap: 3 });
                doc.moveDown(0.5);
            }

            // ---- Experience ----
            addPDFSection(doc, "Experience");
            resume.experience.forEach(exp => {
                doc.font("Helvetica").fontSize(10).fillColor(DARK_GRAY)
                    .text(`${exp.title} | ${exp.company}`, { continued: true });
                doc.font("Helvetica").fontSize(9).fillColor(DARK_GRAY)
                    .text(`${exp.location} | ${exp.period}`, { align: "right" });
                doc.moveDown(0.15);

                exp.details.forEach(d => {
                    doc.font("Helvetica").fontSize(9).fillColor(DARK_GRAY).text("• " + d, { indent: 0, lineGap: 2 });
                    doc.moveDown(0.05);
                });
                doc.moveDown(0.4);
            });

            // ---- Skills ----
            addPDFSection(doc, "Technical Skills");
            resume.skills.forEach(s => {
                // Combine category and items in one line
                const line = `${s.category}: ${s.items.join(", ")}`;
                doc.font("Helvetica").fontSize(9).fillColor(DARK_GRAY).text(line);
                doc.moveDown(0.3);
            });

            // ---- Education ----
            addPDFSection(doc, "Education");
            resume.education.forEach(edu => {
                doc.font("Helvetica-Bold").fontSize(10).fillColor(DARK_GRAY)
                    .text(`${edu.degree} - ${edu.institution}`, { continued: true });
                doc.font("Helvetica").fontSize(9).fillColor(DARK_GRAY)
                    .text(`${edu.location !== undefined ? " | " + edu.location : ""} ${edu.period}`, { align: "right" });
                if (edu.cgpa !== undefined) {
                    doc.font("Helvetica").fontSize(9).fillColor(DARK_GRAY).text(`CGPA: ${edu.cgpa.toFixed(2)}`);
                }
                doc.moveDown(0.5);
            });

            // ---- Projects ----
            addPDFSection(doc, "Projects");
            resume.projects.forEach(proj => {
                doc.font("Helvetica-Bold").fontSize(10).fillColor(DARK_GRAY)
                    .text(proj.title + (proj.link ? " | " + proj.link : ""), { continued: true });
                doc.font("Helvetica").fontSize(9).fillColor(DARK_GRAY).text(proj.tech, { align: "right" });
                doc.moveDown(0.5)
                doc.font("Helvetica").fontSize(9).fillColor(DARK_GRAY).text(proj.description, { align: "justify", lineGap: 2 });
                doc.moveDown(0.5);
            });

            // ---- Honors ----
            if (resume.honors && resume.honors.length) {
                addPDFSection(doc, "Awards and Achievements");
                resume.honors.forEach(h => {
                    doc.font("Helvetica").fontSize(9).fillColor(DARK_GRAY).text("• " + h);
                    doc.moveDown(0.2);
                });
            }

            doc.end();
            stream.on("finish", () => resolve(outputPath));
        } catch (err) {
            reject(err);
        }
    });
}

// ---------- DOCX Helper ----------
function sectionHeading(title: string): Paragraph {
    return new Paragraph({
        spacing: { before: 200, after: 100 },
        children: [new TextRun({ text: title.toUpperCase(), bold: true, size: 20, color: DARK_GRAY })],
    });
}

// ---------- DOCX Generator ----------
export async function generateDOCX(resume: Resume, outputPath: string): Promise<string> {
    const doc = new Document({
        sections: [
            {
                children: [
                    // Header
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: resume.name, bold: true, size: 28, color: DARK_GRAY })],
                    }),
                    resume.role
                        ? new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: resume.role, italics: true, size: 20, color: DARK_GRAY })],
                        })
                        : new Paragraph({ text: "" }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        children: [new TextRun({ text: resume.contact, size: 18, color: DARK_GRAY })]
                    }),
                    new Paragraph({ text: "" }),

                    // Summary
                    ...(resume.summary ? [
                        sectionHeading("Summary"),
                        new Paragraph({ text: resume.summary, spacing: { after: 120 }, children: [new TextRun({ color: DARK_GRAY })] })
                    ] : []),

                    // Experience
                    sectionHeading("Experience"),
                    ...resume.experience.flatMap(exp => [
                        new Paragraph({
                            children: [
                                new TextRun({ text: `${exp.title} | ${exp.company}`, bold: true, color: DARK_GRAY }),
                                new TextRun({ text: `   ${exp.location} | ${exp.period}`, italics: true, color: DARK_GRAY }),
                            ],
                            spacing: { after: 100 },
                        }),
                        ...exp.details.map(d => new Paragraph({ text: d, bullet: { level: 0 }, spacing: { after: 50 }, children: [new TextRun({ color: DARK_GRAY })] }))
                    ]),

                    // Skills
                    sectionHeading("Technical Skills"),
                    ...resume.skills.map(s => {
                        return new Paragraph({
                            children: [
                                new TextRun({ text: `${s.category}: `, bold: true, color: DARK_GRAY }),
                                new TextRun({ text: s.items.join(", "), color: DARK_GRAY }),
                            ],
                            spacing: { after: 50 }
                        });
                    }),

                    // Education
                    sectionHeading("Education"),
                    ...resume.education.flatMap(edu => [
                        new Paragraph({
                            children: [
                                new TextRun({ text: `${edu.degree} - ${edu.institution}`, bold: true, color: DARK_GRAY }),
                                new TextRun({ text: `   ${edu.location} | ${edu.period}${edu.cgpa ? ` | CGPA: ${edu.cgpa.toFixed(2)}` : ''}`, italics: true, color: DARK_GRAY }),
                            ],
                            spacing: { after: 100 },
                        })
                    ]),

                    // Projects
                    sectionHeading("Projects"),
                    ...resume.projects.flatMap(proj => [
                        new Paragraph({
                            children: [
                                new TextRun({ text: proj.title, bold: true, color: DARK_GRAY }),
                                proj.link ? new TextRun({ text: " | " + proj.link, color: "0066CC" }) : new TextRun(""),
                            ],
                            spacing: { after: 50 },
                        }),
                        new Paragraph({ text: proj.tech, spacing: { after: 50 }, children: [new TextRun({ text: proj.tech, italics: true, color: DARK_GRAY })] }),
                        new Paragraph({ text: proj.description, spacing: { after: 100 }, children: [new TextRun({ color: DARK_GRAY })] }),
                    ]),

                    // Honors
                    ...(resume.honors?.length
                        ? [sectionHeading("Awards and Achievements"), ...resume.honors.map(h => new Paragraph({ text: h, bullet: { level: 0 }, spacing: { after: 50 }, children: [new TextRun({ color: DARK_GRAY })] }))]
                        : []),
                ],
            },
        ],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);
    return outputPath;
}
