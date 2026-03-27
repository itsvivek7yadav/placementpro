const PDFDocument = require('pdfkit');

class PDFGenerator {
  constructor() {
    this.pageWidth = 595;
    this.pageHeight = 842;
    this.margin = 42;
    this.contentWidth = this.pageWidth - (2 * this.margin);
    this.bottomLimit = this.pageHeight - this.margin - 24;
  }

  async generatePDF(resumeData, studentData, template = 'modern') {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margin: this.margin,
          bufferPages: true
        });

        const buffers = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', reject);

        const theme = this.getTheme(template);
        this.drawResume(doc, resumeData || {}, studentData || {}, theme);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  getTheme(template) {
    const themes = {
      modern: {
        name: 'modern',
        headerBg: '#12304a',
        headerAccent: '#d9b36c',
        section: '#12304a',
        subtle: '#5f6f7f',
        text: '#14202b',
        border: '#d6dee5'
      },
      classic: {
        name: 'classic',
        headerBg: '#f7f1e8',
        headerAccent: '#6e4e2f',
        section: '#3f2d1d',
        subtle: '#6b6258',
        text: '#1c1814',
        border: '#d8cdc1'
      },
      minimal: {
        name: 'minimal',
        headerBg: '#f8fafc',
        headerAccent: '#0f172a',
        section: '#0f172a',
        subtle: '#64748b',
        text: '#0f172a',
        border: '#e2e8f0'
      }
    };

    return themes[template] || themes.modern;
  }

  drawResume(doc, resumeData, studentData, theme) {
    let y = this.drawHeader(doc, studentData, theme);

    y = this.drawSection(doc, 'Profile', y, theme, () =>
      this.drawParagraph(doc, this.cleanText(resumeData.personalSummary), y, theme)
    );

    y = this.drawSection(doc, 'Experience', y, theme, () =>
      this.drawExperience(doc, resumeData.experience || [], y, theme)
    );

    y = this.drawSection(doc, 'Projects', y, theme, () =>
      this.drawProjects(doc, resumeData.projects || [], y, theme)
    );

    y = this.drawSection(doc, 'Education', y, theme, () =>
      this.drawEducation(doc, studentData, y, theme)
    );

    y = this.drawSection(doc, 'Skills', y, theme, () =>
      this.drawSkills(doc, resumeData.skills || {}, y, theme)
    );

    y = this.drawSection(doc, 'Certifications', y, theme, () =>
      this.drawCertifications(doc, resumeData.certifications || [], y, theme)
    );

    y = this.drawSection(doc, 'Languages', y, theme, () =>
      this.drawLanguages(doc, resumeData.languages || [], y, theme)
    );

    this.drawSection(doc, 'Achievements', y, theme, () =>
      this.drawAchievements(doc, resumeData.achievements || [], y, theme)
    );
  }

  drawHeader(doc, studentData, theme) {
    const headerHeight = theme.name === 'minimal' ? 94 : 112;

    doc.save();
    doc.rect(0, 0, this.pageWidth, headerHeight).fill(theme.headerBg);
    if (theme.name !== 'minimal') {
      doc
        .fillColor(theme.headerAccent)
        .circle(this.pageWidth - 52, 28, 64)
        .fillOpacity(0.18)
        .fill();
      doc.fillOpacity(1);
    }
    doc.restore();

    const fullName = [studentData.firstName, studentData.lastName]
      .filter(Boolean)
      .join(' ')
      .trim() || 'Your Name';
    const roleLine = [studentData.degree, studentData.branch]
      .filter(Boolean)
      .join(' • ');
    const contactItems = [
      studentData.email,
      studentData.phone,
      [studentData.city, studentData.state].filter(Boolean).join(', '),
      studentData.linkedinUrl,
      studentData.portfolioUrl
    ].filter(Boolean);

    const textColor = theme.name === 'minimal' ? theme.text : '#ffffff';
    const mutedColor = theme.name === 'minimal' ? theme.subtle : '#d7e0e8';

    doc
      .font('Helvetica-Bold')
      .fontSize(theme.name === 'minimal' ? 24 : 28)
      .fillColor(textColor)
      .text(fullName, this.margin, 26, { width: this.contentWidth - 60 });

    if (roleLine) {
      doc
        .font('Helvetica')
        .fontSize(11)
        .fillColor(mutedColor)
        .text(roleLine, this.margin, 58, { width: this.contentWidth - 60 });
    }

    if (contactItems.length) {
      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(mutedColor)
        .text(contactItems.join('   |   '), this.margin, 76, {
          width: this.contentWidth,
          align: 'left'
        });
    }

    return headerHeight + 18;
  }

  drawSection(doc, title, y, theme, renderer) {
    const nextY = this.ensureSpace(doc, y, 68, theme);
    const startY = nextY;
    const contentY = renderer();
    if (contentY === startY) return startY;

    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor(theme.section)
      .text(title.toUpperCase(), this.margin, startY);

    doc
      .moveTo(this.margin, startY + 14)
      .lineTo(this.margin + this.contentWidth, startY + 14)
      .strokeColor(theme.border)
      .lineWidth(1)
      .stroke();

    return contentY + 16;
  }

  drawParagraph(doc, text, y, theme) {
    if (!text) return y;
    const top = this.ensureSpace(doc, y + 24, 60, theme);

    doc
      .font('Helvetica')
      .fontSize(10)
      .fillColor(theme.text)
      .text(text, this.margin, top, {
        width: this.contentWidth,
        lineGap: 3
      });

    return top + doc.heightOfString(text, { width: this.contentWidth, lineGap: 3 });
  }

  drawExperience(doc, experiences, y, theme) {
    if (!Array.isArray(experiences) || experiences.length === 0) return y;
    let cursor = y + 24;

    for (const exp of experiences.slice(0, 4)) {
      const bullets = this.toBullets(exp.description).slice(0, 4);
      const estimate = 54 + (bullets.length * 12);
      cursor = this.ensureSpace(doc, cursor, estimate, theme);

      doc
        .font('Helvetica-Bold')
        .fontSize(11)
        .fillColor(theme.text)
        .text(this.cleanText(exp.role) || 'Role', this.margin, cursor, {
          width: this.contentWidth - 120
        });

      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(theme.subtle)
        .text(this.formatRange(exp.startDate, exp.endDate, exp.currentlyWorking), this.margin + this.contentWidth - 120, cursor, {
          width: 120,
          align: 'right'
        });

      if (exp.company) {
        doc
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor(theme.subtle)
          .text(this.cleanText(exp.company), this.margin, cursor + 15, { width: this.contentWidth });
      }

      cursor += exp.company ? 33 : 22;

      bullets.forEach((bullet) => {
        const line = `• ${bullet}`;
        doc
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor(theme.text)
          .text(line, this.margin + 8, cursor, { width: this.contentWidth - 8, lineGap: 2 });
        cursor += doc.heightOfString(line, { width: this.contentWidth - 8, lineGap: 2 }) + 4;
      });

      cursor += 6;
    }

    return cursor;
  }

  drawProjects(doc, projects, y, theme) {
    if (!Array.isArray(projects) || projects.length === 0) return y;
    let cursor = y + 24;

    for (const project of projects.slice(0, 4)) {
      const bullets = this.toBullets(project.description).slice(0, 3);
      const estimate = 48 + (bullets.length * 12);
      cursor = this.ensureSpace(doc, cursor, estimate, theme);

      doc
        .font('Helvetica-Bold')
        .fontSize(10.5)
        .fillColor(theme.text)
        .text(this.cleanText(project.title) || 'Project', this.margin, cursor, {
          width: this.contentWidth - 110
        });

      if (project.technologies) {
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor(theme.subtle)
          .text(`Stack: ${this.cleanText(project.technologies)}`, this.margin, cursor + 15, {
            width: this.contentWidth
          });
        cursor += 30;
      } else {
        cursor += 16;
      }

      bullets.forEach((bullet) => {
        const line = `• ${bullet}`;
        doc
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor(theme.text)
          .text(line, this.margin + 8, cursor, { width: this.contentWidth - 8, lineGap: 2 });
        cursor += doc.heightOfString(line, { width: this.contentWidth - 8, lineGap: 2 }) + 4;
      });

      cursor += 6;
    }

    return cursor;
  }

  drawEducation(doc, studentData, y, theme) {
    const degreeLine = [studentData.degree, studentData.branch].filter(Boolean).join(' in ');
    const meta = [
      studentData.collegeName,
      studentData.graduationYear ? `Graduation ${studentData.graduationYear}` : '',
      studentData.cgpa ? `CGPA ${studentData.cgpa}/10` : ''
    ].filter(Boolean).join(' • ');

    if (!degreeLine && !meta) return y;
    const cursor = this.ensureSpace(doc, y + 24, 48, theme);

    doc
      .font('Helvetica-Bold')
      .fontSize(10.5)
      .fillColor(theme.text)
      .text(degreeLine || studentData.collegeName || 'Education', this.margin, cursor, {
        width: this.contentWidth
      });

    doc
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor(theme.subtle)
      .text(meta, this.margin, cursor + 16, { width: this.contentWidth });

    return cursor + 34;
  }

  drawSkills(doc, skills, y, theme) {
    const entries = [];
    if (skills.technical && skills.technical.length) entries.push(`Technical: ${skills.technical.join(' • ')}`);
    if (skills.soft && skills.soft.length) entries.push(`Soft: ${skills.soft.join(' • ')}`);
    if (!entries.length) return y;

    let cursor = this.ensureSpace(doc, y + 24, 40 + (entries.length * 14), theme);
    entries.forEach((entry) => {
      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(theme.text)
        .text(entry, this.margin, cursor, { width: this.contentWidth, lineGap: 2 });
      cursor += doc.heightOfString(entry, { width: this.contentWidth, lineGap: 2 }) + 6;
    });

    return cursor;
  }

  drawCertifications(doc, certifications, y, theme) {
    if (!Array.isArray(certifications) || certifications.length === 0) return y;
    let cursor = y + 24;

    certifications.slice(0, 4).forEach((cert) => {
      cursor = this.ensureSpace(doc, cursor, 28, theme);
      const line = [
        this.cleanText(cert.name),
        this.cleanText(cert.issuer),
        this.formatMonthYear(cert.issueDate)
      ].filter(Boolean).join(' • ');

      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(theme.text)
        .text(`• ${line}`, this.margin, cursor, { width: this.contentWidth });

      cursor += 14;
    });

    return cursor;
  }

  drawLanguages(doc, languages, y, theme) {
    if (!Array.isArray(languages) || languages.length === 0) return y;

    const line = languages
      .slice(0, 6)
      .map((lang) => [this.cleanText(lang.language), this.cleanText(lang.proficiency)].filter(Boolean).join(' - '))
      .filter(Boolean)
      .join(' • ');

    if (!line) return y;
    const cursor = this.ensureSpace(doc, y + 24, 24, theme);

    doc
      .font('Helvetica')
      .fontSize(9.5)
      .fillColor(theme.text)
      .text(line, this.margin, cursor, { width: this.contentWidth });

    return cursor + 14;
  }

  drawAchievements(doc, achievements, y, theme) {
    if (!Array.isArray(achievements) || achievements.length === 0) return y;
    let cursor = y + 24;

    achievements.slice(0, 4).forEach((item) => {
      const line = [this.cleanText(item.title), this.cleanText(item.description)]
        .filter(Boolean)
        .join(': ');
      if (!line) return;

      cursor = this.ensureSpace(doc, cursor, 28, theme);
      doc
        .font('Helvetica')
        .fontSize(9.5)
        .fillColor(theme.text)
        .text(`• ${line}`, this.margin, cursor, {
          width: this.contentWidth,
          lineGap: 2
        });

      cursor += doc.heightOfString(`• ${line}`, {
        width: this.contentWidth,
        lineGap: 2
      }) + 4;
    });

    return cursor;
  }

  ensureSpace(doc, y, requiredHeight, theme) {
    if (y + requiredHeight <= this.bottomLimit) return y;
    doc.addPage();
    return this.drawContinuationHeader(doc, theme);
  }

  drawContinuationHeader(doc, theme) {
    doc
      .font('Helvetica-Bold')
      .fontSize(8)
      .fillColor(theme.subtle)
      .text('Resume Continued', this.margin, this.margin - 10);
    return this.margin + 6;
  }

  cleanText(value) {
    return typeof value === 'string' ? value.trim() : '';
  }

  toBullets(text) {
    return this.cleanText(text)
      .split('\n')
      .map((line) => line.replace(/^[•\-*]\s*/, '').trim())
      .filter(Boolean);
  }

  formatMonthYear(value) {
    if (!value) return '';
    const [year, month] = String(value).split('-');
    const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const index = Number(month) - 1;
    return year && index >= 0 && index < 12 ? `${names[index]} ${year}` : String(value);
  }

  formatRange(startDate, endDate, currentlyWorking) {
    const start = this.formatMonthYear(startDate);
    const end = currentlyWorking ? 'Present' : this.formatMonthYear(endDate) || 'Present';
    return [start, end].filter(Boolean).join(' - ');
  }
}

module.exports = new PDFGenerator();
