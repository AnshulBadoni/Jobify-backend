import PDFDocument from "pdfkit";
import fs from "fs";
import { Document, Packer, Paragraph, TextRun, AlignmentType } from "docx";
import { Resume } from "../types";

const TEXT_COLOR = "#000000";
const SUBTEXT_COLOR = "#666666";

export function generatePDF(resume: Resume, outputPath: string): Promise<string> {
    return new Promise((resolve, reject) => {
        const doc = new PDFDocument({
            margin: 72,
            size: 'A4'
        });

        const stream = fs.createWriteStream(outputPath);
        doc.pipe(stream);

        // === HEADER ===
        doc.fontSize(24)
            .text(resume.name, { align: 'center' });

        doc.moveDown(0.3);

        // Clean contact info without emojis - properly centered
        const contactInfo = [];

        // Extract contact info
        let email = resume.email;
        let phone = resume.phone;

        if (!email && resume.contact) {
            const emailMatch = resume.contact.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
            if (emailMatch) email = emailMatch[0];
        }

        if (!phone && resume.contact) {
            const phoneMatch = resume.contact.match(/(\+?[\d\s\-\(\)]{10,})/);
            if (phoneMatch) phone = phoneMatch[0];
        }

        if (email) contactInfo.push(email);
        if (phone) contactInfo.push(phone);
        if (resume.website) contactInfo.push(resume.website);
        if (resume.github) contactInfo.push(`github.com/${resume.github}`);
        if (resume.linkedin) contactInfo.push(`linkedin.com/in/${resume.linkedin}`);

        // Simple centered text
        const contactText = contactInfo.join(' • ');
        doc.fontSize(9)
            .text(contactText, { align: 'center' });

        doc.moveDown(1.5);

        // === SUMMARY ===
        if (resume.summary) {
            addLaTeXSectionHeader(doc, 'Summary');
            doc.fontSize(10)
                .text(resume.summary, {
                    align: 'left',
                    lineGap: 4
                });
            doc.moveDown(1);
        }

        // === EXPERIENCE ===
        if (resume.experience && resume.experience.length > 0) {
            addLaTeXSectionHeader(doc, 'Work Experience');

            resume.experience.forEach((job, index) => {
                const leftText = `${job.company} - ${job.title}`;
                const rightText = `${job.period}`;

                // Calculate exact positions
                const rightWidth = doc.widthOfString(rightText);
                const rightX = doc.page.width - 72 - rightWidth;
                const currentY = doc.y;

                doc.fontSize(11)
                    .text(leftText, 72, currentY, {
                        width: rightX - 72 - 20
                    });

                doc.fontSize(10)
                    .text(rightText, rightX, currentY);

                doc.y = currentY + doc.currentLineHeight();
                doc.moveDown(0.2);

                // Location
                doc.fontSize(9.5)
                    .fillColor(SUBTEXT_COLOR)
                    .text(job.location, 72, doc.y);

                doc.moveDown(0.3);

                // Bullet points
                job.details.forEach(point => {
                    const bulletY = doc.y;
                    doc.fontSize(9.5)
                        .fillColor(TEXT_COLOR)
                        .text('•', 72, bulletY);

                    doc.text(point, 85, bulletY, {
                        width: doc.page.width - 157,
                        lineGap: 2.5
                    });

                    doc.moveDown(0.2);
                });

                if (index < resume.experience.length - 1) {
                    doc.moveDown(0.8);
                }
            });

            doc.moveDown(1);
        }

        // === PROJECTS ===
        if (resume.projects && resume.projects.length > 0) {
            addLaTeXSectionHeader(doc, 'Projects');

            resume.projects.forEach((project, index) => {
                const leftText = project.title;
                const rightText = project.link ? 'View Project' : '';

                const currentY = doc.y;

                doc.fontSize(11)
                    .text(leftText, 72, currentY);

                if (project.link) {
                    const rightWidth = doc.widthOfString(rightText);
                    const rightX = doc.page.width - 72 - rightWidth;

                    doc.fontSize(9)
                        .fillColor(SUBTEXT_COLOR)
                        .text(rightText, rightX, currentY, {
                            link: project.link,
                            underline: true
                        });
                }

                doc.y = currentY + doc.currentLineHeight();
                doc.moveDown(0.2);

                // Tech stack
                doc.fontSize(9.5)
                    .fillColor(SUBTEXT_COLOR)
                    .text(`Tech: ${project.tech}`, 72, doc.y);

                doc.moveDown(0.3);

                // Description
                doc.fontSize(9.5)
                    .fillColor(TEXT_COLOR)
                    .text(project.description, 72, doc.y, {
                        width: doc.page.width - 144,
                        lineGap: 2.5
                    });

                if (index < resume.projects.length - 1) {
                    doc.moveDown(0.8);
                }
            });

            doc.moveDown(1);
        }

        // === EDUCATION ===
        if (resume.education && resume.education.length > 0) {
            addLaTeXSectionHeader(doc, 'Education');

            resume.education.forEach((edu, index) => {
                const leftText = edu.period;
                let rightText = `${edu.degree} - ${edu.institution}`;
                if (edu.cgpa) rightText += ` (GPA: ${edu.cgpa.toFixed(2)})`;

                const currentY = doc.y;

                doc.fontSize(10)
                    .text(leftText, 72, currentY);

                doc.fontSize(10)
                    .text(rightText, 200, currentY, {
                        width: doc.page.width - 272
                    });

                doc.moveDown(0.6);
            });

            doc.moveDown(1);
        }

        // === TECHNICAL SKILLS ===
        if (resume.skills && resume.skills.length > 0) {
            addLaTeXSectionHeader(doc, 'Technical Skills');

            resume.skills.forEach(skill => {
                const categoryText = skill.category;
                const skillsText = skill.items.join(', ');

                const currentY = doc.y;

                doc.fontSize(10)
                    .text(categoryText, 72, currentY, {
                        width: 120
                    });

                doc.fontSize(10)
                    .text(skillsText, 200, currentY, {
                        width: doc.page.width - 272
                    });

                doc.moveDown(0.3);
            });

            doc.moveDown(1);
        }

        // Last updated
        const lastUpdated = new Date().toLocaleDateString();
        doc.moveDown(2);
        doc.fontSize(8)
            .fillColor(SUBTEXT_COLOR)
            .text(`Last updated: ${lastUpdated}`, { align: 'center' });

        doc.end();

        stream.on('finish', () => resolve(outputPath));
        stream.on('error', reject);
    });
}

function addLaTeXSectionHeader(doc: PDFKit.PDFDocument, title: string) {
    doc.moveDown(0.8);
    doc.fontSize(14)
        .text(title.toUpperCase());
    doc.moveDown(0.2);

    const y = doc.y;
    doc.moveTo(72, y)
        .lineTo(doc.page.width - 72, y)
        .lineWidth(1)
        .stroke();

    doc.moveDown(0.4);
}

// === DOCX VERSION ===
export async function generateDOCX(resume: Resume, outputPath: string): Promise<string> {
    const children = [];

    // Header
    children.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
            children: [
                new TextRun({ text: resume.name, size: 36 }),
            ],
        })
    );

    // Clean contact info - properly centered
    const contactInfo = [];

    let email = resume.email;
    let phone = resume.phone;

    if (!email && resume.contact) {
        const emailMatch = resume.contact.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
        if (emailMatch) email = emailMatch[0];
    }

    if (!phone && resume.contact) {
        const phoneMatch = resume.contact.match(/(\+?[\d\s\-\(\)]{10,})/);
        if (phoneMatch) phone = phoneMatch[0];
    }

    if (email) contactInfo.push(email);
    if (phone) contactInfo.push(phone);
    if (resume.website) contactInfo.push(resume.website);
    if (resume.github) contactInfo.push(`github.com/${resume.github}`);
    if (resume.linkedin) contactInfo.push(`linkedin.com/in/${resume.linkedin}`);

    children.push(
        new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
                new TextRun({ text: contactInfo.join(' • '), size: 18 }),
            ],
        })
    );

    // Summary
    if (resume.summary) {
        children.push(createLaTeXSectionHeader('Summary'));
        children.push(
            new Paragraph({
                spacing: { after: 300 },
                children: [
                    new TextRun({ text: resume.summary, size: 20 }),
                ],
            })
        );
    }

    // Experience
    if (resume.experience?.length) {
        children.push(createLaTeXSectionHeader('Work Experience'));

        resume.experience.forEach(job => {
            // Company/Title and Period
            children.push(
                new Paragraph({
                    spacing: { after: 80 },
                    children: [
                        new TextRun({ text: `${job.company} - ${job.title}`, size: 22 }),
                        new TextRun({ text: "\t".repeat(8) }),
                        new TextRun({ text: job.period, size: 20 }),
                    ],
                })
            );

            // Location
            children.push(
                new Paragraph({
                    spacing: { after: 120 },
                    children: [
                        new TextRun({ text: job.location, size: 18, color: SUBTEXT_COLOR }),
                    ],
                })
            );

            // Bullet points
            job.details.forEach(detail => {
                children.push(
                    new Paragraph({
                        spacing: { after: 80 },
                        indent: { left: 400 },
                        children: [
                            new TextRun({ text: `• ${detail}`, size: 20 }),
                        ],
                    })
                );
            });

            children.push(new Paragraph({ text: '' }));
        });
    }

    // Projects
    if (resume.projects?.length) {
        children.push(createLaTeXSectionHeader('Projects'));

        resume.projects.forEach(project => {
            // Project title and link
            children.push(
                new Paragraph({
                    spacing: { after: 80 },
                    children: [
                        new TextRun({ text: project.title, size: 22 }),
                        ...(project.link ? [
                            new TextRun({ text: "\t".repeat(10) }),
                            new TextRun({ text: "View Project", size: 18, color: SUBTEXT_COLOR })
                        ] : [])
                    ],
                })
            );

            // Tech stack
            children.push(
                new Paragraph({
                    spacing: { after: 60 },
                    children: [
                        new TextRun({ text: `Tech: ${project.tech}`, size: 18, color: SUBTEXT_COLOR }),
                    ],
                })
            );

            // Description
            children.push(
                new Paragraph({
                    spacing: { after: 200 },
                    children: [
                        new TextRun({ text: project.description, size: 20 }),
                    ],
                })
            );
        });
    }

    // Education
    if (resume.education?.length) {
        children.push(createLaTeXSectionHeader('Education'));

        resume.education.forEach(edu => {
            let rightText = `${edu.degree} - ${edu.institution}`;
            if (edu.cgpa) rightText += ` (GPA: ${edu.cgpa.toFixed(2)})`;

            children.push(
                new Paragraph({
                    spacing: { after: 150 },
                    children: [
                        new TextRun({ text: edu.period, size: 20 }),
                        new TextRun({ text: "\t".repeat(6) }),
                        new TextRun({ text: rightText, size: 20 }),
                    ],
                })
            );
        });
    }

    // Technical Skills
    if (resume.skills?.length) {
        children.push(createLaTeXSectionHeader('Technical Skills'));

        resume.skills.forEach(skill => {
            children.push(
                new Paragraph({
                    spacing: { after: 100 },
                    children: [
                        new TextRun({ text: skill.category, size: 20 }),
                        new TextRun({ text: "\t".repeat(4) }),
                        new TextRun({ text: skill.items.join(', '), size: 20 }),
                    ],
                })
            );
        });
    }

    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 72 * 8,
                        right: 72 * 8,
                        bottom: 72 * 8,
                        left: 72 * 8,
                    },
                },
            },
            children
        }],
    });

    const buffer = await Packer.toBuffer(doc);
    fs.writeFileSync(outputPath, buffer);
    return outputPath;
}

function createLaTeXSectionHeader(title: string): Paragraph {
    return new Paragraph({
        spacing: { before: 320, after: 150 },
        border: {
            bottom: {
                color: TEXT_COLOR,
                space: 1,
                size: 2,
            },
        },
        children: [
            new TextRun({ text: title.toUpperCase(), size: 24 }),
        ],
    });
}