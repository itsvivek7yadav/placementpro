/**
 * services/summarizerService.js
 * AI summarization: tries local Ollama first, falls back to HuggingFace BART
 * Skips providers silently when not configured — no log spam
 */

const axios = require('axios');

const OLLAMA_URL       = process.env.OLLAMA_URL        || 'http://localhost:11434';
const OLLAMA_MODEL     = process.env.OLLAMA_MODEL       || 'llama3';
const HF_API_KEY       = process.env.HUGGINGFACE_API_KEY || '';
const HF_MODEL         = 'facebook/bart-large-cnn';
const HF_INFERENCE_URL = `https://api-inference.huggingface.co/models/${HF_MODEL}`;

// Common skills to extract from job descriptions via keyword matching
const SKILL_KEYWORDS = [
  'SQL', 'Excel', 'Python', 'Power BI', 'Tableau', 'R', 'JIRA',
  'Agile', 'Scrum', 'Communication', 'Analytical', 'MS Office',
  'Data Analysis', 'Business Analysis', 'Consulting', 'Research',
  'PowerPoint', 'Word', 'Stakeholder', 'Requirements', 'Documentation',
  'MySQL', 'PostgreSQL', 'MongoDB', 'AWS', 'Azure', 'Google Analytics',
  'Looker', 'Salesforce', 'SAP', 'ERP', 'CRM', 'Visio', 'Confluence'
];

/**
 * Build structured summarization prompt for Ollama
 */
function buildSummarizationPrompt(title, company, description) {
  return `You are a career assistant. Given the job details below, respond ONLY with a valid JSON object with exactly these keys:
{
  "role_type": "<one of: business analyst | data analyst | consultant | fresher | other>",
  "skills": ["skill1", "skill2", "skill3"],
  "short_summary": "<2-3 sentence plain English summary>",
  "application_tip": "<1 practical tip for applying>"
}

Job Title: ${title}
Company: ${company}
Description: ${description ? description.substring(0, 1500) : 'N/A'}

Respond ONLY with the JSON object. No markdown, no explanation.`;
}

/**
 * Parse structured JSON response from LLM
 */
function parseStructuredResponse(raw) {
  try {
    const cleaned = raw.replace(/```json/gi, '').replace(/```/g, '').trim();
    const parsed  = JSON.parse(cleaned);
    return {
      role_type:       parsed.role_type       || 'other',
      skills:          Array.isArray(parsed.skills) ? parsed.skills : [],
      short_summary:   parsed.short_summary   || '',
      application_tip: parsed.application_tip || ''
    };
  } catch {
    return {
      role_type:       'other',
      skills:          [],
      short_summary:   raw.substring(0, 200),
      application_tip: ''
    };
  }
}

/**
 * Extract skills from job description using keyword matching
 * Used as fallback when no AI provider is available
 */
function extractSkillsFromText(description = '') {
  const lower = description.toLowerCase();
  return SKILL_KEYWORDS.filter(skill => lower.includes(skill.toLowerCase())).slice(0, 6);
}

/**
 * Simple rule-based role classifier
 */
function classifyRole(title = '') {
  const t = title.toLowerCase();
  if (t.includes('business analyst') || t.includes('ba ')) return 'business analyst';
  if (t.includes('data analyst') || t.includes('data science')) return 'data analyst';
  if (t.includes('consultant')) return 'consultant';
  if (t.includes('fresher') || t.includes('graduate') || t.includes('entry')) return 'fresher';
  return 'other';
}

/**
 * Try Ollama local model (silent failure if not running)
 */
async function tryOllama(prompt) {
  const response = await axios.post(
    `${OLLAMA_URL}/api/generate`,
    { model: OLLAMA_MODEL, prompt, stream: false, options: { temperature: 0.3, num_predict: 400 } },
    { timeout: 10000 }
  );
  const text = response.data?.response || '';
  if (!text) throw new Error('Empty Ollama response');
  return text;
}

/**
 * Try HuggingFace BART (only called when HF_API_KEY is set)
 */
async function tryHuggingFace(title, company, description) {
  const inputText = `Job: ${title} at ${company}. ${description || ''}`.substring(0, 1024);
  const response  = await axios.post(
    HF_INFERENCE_URL,
    { inputs: inputText, parameters: { max_length: 150, min_length: 40 } },
    { headers: { Authorization: `Bearer ${HF_API_KEY}` }, timeout: 20000 }
  );
  const summary = response.data?.[0]?.summary_text || '';
  if (!summary) throw new Error('Empty HuggingFace response');

  return {
    role_type:       classifyRole(title),
    skills:          extractSkillsFromText(description),
    short_summary:   summary,
    application_tip: 'Tailor your resume to match the key skills mentioned in the job description.'
  };
}

/**
 * Main summarization entry point
 * - Tries Ollama silently (no log spam if not running)
 * - Tries HuggingFace only if HUGGINGFACE_API_KEY is set
 * - Falls back to rule-based extraction (always works, no keys needed)
 */
async function summarize(title, company, description) {
  // Attempt 1: Ollama — try silently, no logs on failure
  try {
    const raw    = await tryOllama(buildSummarizationPrompt(title, company, description));
    const result = parseStructuredResponse(raw);
    console.log('[Summarizer] Ollama success');
    return result;
  } catch {
    // silent — Ollama not running is the normal case for most setups
  }

  // Attempt 2: HuggingFace — only if key is configured
  if (HF_API_KEY) {
    try {
      const result = await tryHuggingFace(title, company, description);
      console.log('[Summarizer] HuggingFace success');
      return result;
    } catch (hfErr) {
      console.warn('[Summarizer] HuggingFace failed:', hfErr.message);
    }
  }

  // Fallback: rule-based (always works, zero config needed)
  return {
    role_type:       classifyRole(title),
    skills:          extractSkillsFromText(description),
    short_summary:   `${title} position at ${company}. ${(description || '').substring(0, 200)}`,
    application_tip: 'Read the job description carefully and customize your application accordingly.'
  };
}

module.exports = { summarize };