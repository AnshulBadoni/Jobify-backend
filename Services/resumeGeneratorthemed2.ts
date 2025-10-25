import PDFDocument from "pdfkit";
import fs from "fs";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { Resume } from "../types";

const TEXT_COLOR = "#1C1C1C";
const SUBTEXT_COLOR = "#4F4F4F";
const ACCENT_COLOR = "#007ACC";

// ---------- PDF Helper ----------
function addPDFSection(doc: PDFKit.PDFDocument, title: string) {
    doc.moveDown(1.2);
    doc.font("Helvetica-Bold")
        .fontSize(12)
        .fillColor(TEXT_COLOR)
        .text(title.toUpperCase(), { characterSpacing: 0.5 });
    const y = doc.y;
    doc.moveTo(50, y + 2)
        .lineTo(550, y + 2)
        .strokeColor(ACCENT_COLOR)
        .lineWidth(0.5)
        .stroke();
    doc.moveDown(0.4);
}

// ---------- PDF Generator ----------
export function generatePDF(resume: Resume, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        try {
            const doc = new PDFDocument({
                margin: 55,
                size: "A4",
                info: {
                    Title: `${resume.name} - Resume`,
                    Author: resume.name,
                },
            });
            const stream = fs.createWriteStream(outputPath);
            doc.pipe(stream);

            // ---- Header ----
            doc.font("Helvetica-Bold").fontSize(22).fillColor(TEXT_COLOR).text(resume.name, { align: "center" });
            if (resume.role) {
                doc.font("Helvetica-Oblique").fontSize(11).fillColor(SUBTEXT_COLOR).text(resume.role, { align: "center" });
            }
            doc.moveDown(0.3);
            doc.font("Helvetica").fontSize(9.5).fillColor(SUBTEXT_COLOR).text(resume.contact, { align: "center" });
            doc.moveDown(1.2);

            // ---- Summary ----
            if (resume.summary) {
                addPDFSection(doc, "Summary");
                doc.font("Helvetica").fontSize(9.5).fillColor(TEXT_COLOR)
                    .text(resume.summary, { align: "justify", lineGap: 4 });
                doc.moveDown(0.6);
            }

            // ---- Experience ----
            if (resume.experience?.length) {
                addPDFSection(doc, "Experience");
                resume.experience.forEach(exp => {
                    // Header line
                    doc.font("Helvetica-Bold").fontSize(10.5).fillColor(TEXT_COLOR)
                        .text(`${exp.title} | ${exp.company}`, { align: "left" });
                    doc.font("Helvetica-Oblique").fontSize(9).fillColor(SUBTEXT_COLOR)
                        .text(`${exp.location} | ${exp.period}`, { align: "left" });
                    doc.moveDown(0.15);

                    // Bullet details
                    exp.details.forEach(d => {
                        doc.font("Helvetica").fontSize(9).fillColor(TEXT_COLOR)
                            .text("• " + d, { indent: 15, lineGap: 2.5, align: "justify" });
                    });
                    doc.moveDown(0.6);
                });
            }

            // ---- Skills ----
            if (resume.skills?.length) {
                addPDFSection(doc, "Technical Skills");
                resume.skills.forEach(s => {
                    const line = `${s.category}: ${s.items.join(", ")}`;
                    doc.font("Helvetica").fontSize(9.5).fillColor(TEXT_COLOR)
                        .text(line, { align: "left", lineGap: 2 });
                    doc.moveDown(0.25);
                });
                doc.moveDown(0.8);
            }

            // ---- Education ----
            if (resume.education?.length) {
                addPDFSection(doc, "Education");
                resume.education.forEach(edu => {
                    doc.font("Helvetica-Bold").fontSize(10.5).fillColor(TEXT_COLOR)
                        .text(`${edu.degree} - ${edu.institution}`, { align: "left" });
                    doc.font("Helvetica-Oblique").fontSize(9).fillColor(SUBTEXT_COLOR)
                        .text(`${edu.location ? edu.location + " | " : ""}${edu.period}`, { align: "left" });
                    if (edu.cgpa !== undefined) {
                        doc.font("Helvetica").fontSize(9).fillColor(TEXT_COLOR)
                            .text(`CGPA: ${edu.cgpa.toFixed(2)}`);
                    }
                    doc.moveDown(0.6);
                });
            }

            // ---- Projects ----
            if (resume.projects?.length) {
                addPDFSection(doc, "Projects");
                resume.projects.forEach(proj => {
                    doc.font("Helvetica-Bold").fontSize(10.5).fillColor(TEXT_COLOR)
                        .text(proj.title, { continued: true });
                    if (proj.link) {
                        doc.font("Helvetica").fillColor(ACCENT_COLOR)
                            .text("  " + proj.link, { link: proj.link, underline: true });
                    } else {
                        doc.text("");
                    }
                    doc.font("Helvetica-Oblique").fontSize(9).fillColor(SUBTEXT_COLOR).text(proj.tech);
                    doc.moveDown(0.2);
                    doc.font("Helvetica").fontSize(9).fillColor(TEXT_COLOR)
                        .text(proj.description, { align: "justify", lineGap: 2.5 });
                    doc.moveDown(0.8);
                });
            }

            // ---- Honors ----
            if (resume.honors?.length) {
                addPDFSection(doc, "Awards & Achievements");
                resume.honors.forEach(h => {
                    doc.font("Helvetica").fontSize(9).fillColor(TEXT_COLOR)
                        .text("• " + h, { indent: 15, lineGap: 2.5 });
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
        children: [
            new TextRun({
                text: title.toUpperCase(),
                bold: true,
                size: 22,
                color: TEXT_COLOR,
            }),
        ],
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
                        spacing: { after: 150 },
                        children: [new TextRun({ text: resume.name, bold: true, size: 30, color: TEXT_COLOR })],
                    }),
                    resume.role
                        ? new Paragraph({
                            alignment: AlignmentType.CENTER,
                            children: [new TextRun({ text: resume.role, italics: true, size: 22, color: SUBTEXT_COLOR })],
                        })
                        : new Paragraph({ text: "" }),
                    new Paragraph({
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 200 },
                        children: [new TextRun({ text: resume.contact, size: 18, color: SUBTEXT_COLOR })],
                    }),

                    // Summary
                    ...(resume.summary
                        ? [
                            sectionHeading("Summary"),
                            new Paragraph({
                                text: resume.summary,
                                spacing: { after: 150 },
                                children: [new TextRun({ color: TEXT_COLOR })],
                            }),
                        ]
                        : []),

                    // Experience
                    ...(resume.experience?.length
                        ? [
                            sectionHeading("Experience"),
                            ...resume.experience.flatMap(exp => [
                                new Paragraph({
                                    spacing: { after: 80 },
                                    children: [
                                        new TextRun({ text: `${exp.title} | ${exp.company}`, bold: true, color: TEXT_COLOR }),
                                        new TextRun({
                                            text: `   ${exp.location} | ${exp.period}`,
                                            italics: true,
                                            color: SUBTEXT_COLOR,
                                        }),
                                    ],
                                }),
                                ...exp.details.map(d =>
                                    new Paragraph({
                                        text: d,
                                        bullet: { level: 0 },
                                        spacing: { after: 50 },
                                        children: [new TextRun({ color: TEXT_COLOR })],
                                    }),
                                ),
                            ]),
                        ]
                        : []),

                    // Skills
                    ...(resume.skills?.length
                        ? [
                            sectionHeading("Technical Skills"),
                            ...resume.skills.map(s =>
                                new Paragraph({
                                    spacing: { after: 60 },
                                    children: [
                                        new TextRun({ text: `${s.category}: `, bold: true, color: TEXT_COLOR }),
                                        new TextRun({ text: s.items.join(", "), color: SUBTEXT_COLOR }),
                                    ],
                                }),
                            ),
                        ]
                        : []),

                    // Education
                    ...(resume.education?.length
                        ? [
                            sectionHeading("Education"),
                            ...resume.education.flatMap(edu => [
                                new Paragraph({
                                    spacing: { after: 80 },
                                    children: [
                                        new TextRun({ text: `${edu.degree} - ${edu.institution}`, bold: true, color: TEXT_COLOR }),
                                        new TextRun({
                                            text: `   ${edu.location} | ${edu.period}${edu.cgpa ? ` | CGPA: ${edu.cgpa.toFixed(2)}` : ""}`,
                                            italics: true,
                                            color: SUBTEXT_COLOR,
                                        }),
                                    ],
                                }),
                            ]),
                        ]
                        : []),

                    // Projects
                    ...(resume.projects?.length
                        ? [
                            sectionHeading("Projects"),
                            ...resume.projects.flatMap(proj => [
                                new Paragraph({
                                    spacing: { after: 50 },
                                    children: [
                                        new TextRun({ text: proj.title, bold: true, color: TEXT_COLOR }),
                                        proj.link
                                            ? new TextRun({ text: " | " + proj.link, color: ACCENT_COLOR })
                                            : new TextRun(""),
                                    ],
                                }),
                                new Paragraph({
                                    spacing: { after: 50 },
                                    children: [new TextRun({ text: proj.tech, italics: true, color: SUBTEXT_COLOR })],
                                }),
                                new Paragraph({
                                    spacing: { after: 100 },
                                    children: [new TextRun({ text: proj.description, color: TEXT_COLOR })],
                                }),
                            ]),
                        ]
                        : []),

                    // Honors
                    ...(resume.honors?.length
                        ? [
                            sectionHeading("Awards and Achievements"),
                            ...resume.honors.map(h =>
                                new Paragraph({
                                    text: h,
                                    bullet: { level: 0 },
                                    spacing: { after: 50 },
                                    children: [new TextRun({ color: TEXT_COLOR })],
                                }),
                            ),
                        ]
                        : []),
                ],
            },
        ],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);
    return outputPath;
}
