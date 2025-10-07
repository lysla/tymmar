export async function askAI(prompt: string) {
    const r = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
    });
    const { text } = await r.json();
    return text as string;
}
