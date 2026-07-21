'use strict';

/**
 * Minimal Groq client (free, no-credit-card developer tier).
 * OpenAI-compatible chat completions endpoint.
 *
 * Set GROQ_API_KEY in the backend env to enable. Get a free key at
 * https://console.groq.com (no credit card). If the key is missing or the
 * call fails for any reason, callers should fall back to their own logic —
 * this module never throws; it returns null on any failure.
 *
 * Free tier (2026): ~30 req/min, no per-token charge. Plenty for a bio tool.
 * Note: free tiers can use prompts to improve models — never send private
 * user data here. Bio topics are user-supplied public marketing copy, which
 * is fine.
 */

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
// Fast, capable open-weights model on the free tier. Overridable via env.
const GROQ_MODEL = process.env.GROQ_MODEL || 'llama-3.3-70b-versatile';

function isEnabled() {
  return !!process.env.GROQ_API_KEY;
}

/**
 * Chat completion. Returns the assistant text string, or null on any failure.
 * @param {Array<{role:string,content:string}>} messages
 * @param {object} opts { temperature, maxTokens, timeoutMs }
 */
async function chat(messages, opts = {}) {
  if (!isEnabled()) return null;
  const { temperature = 0.9, maxTokens = 400, timeoutMs = 12000 } = opts;
  try {
    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages,
        temperature,
        max_tokens: maxTokens
      }),
      signal: AbortSignal.timeout(timeoutMs)
    });
    if (!res.ok) return null;
    const data = await res.json();
    const text = data?.choices?.[0]?.message?.content;
    return typeof text === 'string' ? text.trim() : null;
  } catch {
    return null;
  }
}

module.exports = { isEnabled, chat, GROQ_MODEL };
