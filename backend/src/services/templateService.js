const repo = require('../repositories/templateRepository');

const getAllTemplates = async () => repo.findAll();

const updateTemplate = async (code, subject, body) => repo.update(code, { subject, body });

module.exports = { getAllTemplates, updateTemplate };
