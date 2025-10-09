export const config = { runtime: "nodejs" };
import type { VercelRequest, VercelResponse } from "@vercel/node";

import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

export default async function handler(req: VercelRequest, res: VercelResponse) {
    try {
        if (req.method !== "POST") {
            return res.status(405).send("Method Not Allowed");
        }

        const { prompt } = (req.body ?? {}) as { prompt?: string };

        if (!prompt?.trim()) {
            return res.status(400).send({ error: "Prompt is required." });
        }

        const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY! });

        const { text } = await generateText({
            model: openai("gpt-4o-mini"),
            prompt: prompt.trim(),
        });

        return res.status(200).send({ text });
    } catch (err) {
        console.error(err);
        return res.status(500).send({ error: "Server error" });
    }
}
