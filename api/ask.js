export const config = { runtime: "nodejs" };

import { createOpenAI } from "@ai-sdk/openai";
import { generateText } from "ai";

export default async function handler(req, res) {
    try {
        if (req.method !== "POST") {
            return res.status(405).send("Method Not Allowed");
        }

        const { prompt } = req.body || {};
        const openai = createOpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const { text } = await generateText({
            model: openai("gpt-4o-mini"),
            prompt: prompt ?? "",
        });

        return res.status(200).json({ text });
    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: "Server error" });
    }
}
