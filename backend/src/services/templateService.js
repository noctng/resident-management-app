const prisma = require('../config/prisma');

async function getRenderedContent(code, variables) {
    const template = await prisma.email_templates.findUnique({ where: { code } });
    if (!template) {
        console.warn(`Email template ${code} not found.`);
        return null;
    }

    let subject = template.subject;
    let html = template.body;

    // 1. Handle Conditional Blocks: {{#if key}} content {{/if}}
    // Supports checks for non-empty/non-false values
    const conditionalRegex = /{{#if\s+(\w+)}}([\s\S]*?){{\/if}}/g;
    html = html.replace(conditionalRegex, (match, key, content) => {
        const val = variables[key];
        // Show content if value is truthy and not an empty string
        return val && val !== '' ? content : '';
    });

    // 2. Handle Variable Replacement: {{key}}
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{{${key}}}`, 'g');
        const safeValue = value === null || value === undefined ? '' : String(value);
        subject = subject.replace(regex, safeValue);
        html = html.replace(regex, safeValue);
    }

    // 3. Handle CID for embedded images (legacy support if needed)
    // Replaces src="cid:{QR_CID}" with actual URL if provided in variable
    html = html.replace(/cid:{(\w+)}/g, (match, key) => {
        return variables[key] || match; // Fallback to original if not found
    });

    return { subject, html };
}

module.exports = { getRenderedContent };
