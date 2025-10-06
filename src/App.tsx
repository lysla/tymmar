import { useEffect, useState } from "react";
import { askAI } from "./api";
import "./App.css";

export default function App() {
    const [text, setText] = useState<string>("Loading...");

    useEffect(() => {
        async function fetchAI() {
            try {
                const result = await askAI("Hello world");
                setText(result);
            } catch (err) {
                setText("Error contacting AI 😢");
                console.error(err);
            }
        }
        fetchAI();
    }, []);

    return (
        <div>
            tymmar updating, understanding checks... even more.
            <br />
            {text}
        </div>
    );
}
