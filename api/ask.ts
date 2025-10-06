// api/ask.ts
import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

export const config = { runtime: "edge" }; // run at the edge (fast)

export default async function handler(req: Request) {
    const { prompt } = await req.json();
    const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });

    const { text } = await generateText({
        model: openai("gpt-4o-mini"),
        prompt: prompt ?? "",
    });

    return new Response(JSON.stringify({ text }), {
        headers: { "content-type": "application/json" },
    });
}
