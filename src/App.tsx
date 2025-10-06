import { askAI } from "./api";
import "./App.css";

async function App() {
    const text = await askAI("Hello world");

    return (
        <>
            <div>
                tymmar updating, understanding checks... even more.
                <br />
                {text}
            </div>
        </>
    );
}

export default App;
