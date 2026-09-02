import { createOpenAI } from '@ai-sdk/openai';
import { generateText } from 'ai';

// Bypass local SSL cert verification issues (corporate proxy/antivirus)
process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";

const groq = createOpenAI({
  baseURL: 'https://api.groq.com/openai/v1',
  apiKey: process.env.GROQ_API_KEY,
});

export const maxDuration = 30;

export async function POST(req: Request) {
  try {
    const { messages } = await req.json();

    // Map messages to simple role/content format
    const formattedMessages = messages.map((m: any) => ({
      role: m.role,
      content: m.content
    }));

    const { text } = await generateText({
      model: groq('groq/compound'),
      system: 'You are an expert Prompt Engineer assistant. Your goal is to help the user refine, test, and compare different prompt strategies.',
      messages: formattedMessages,
    });

    return new Response(JSON.stringify({ role: 'assistant', content: text }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Chat API Error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Failed to process request' }), { 
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
