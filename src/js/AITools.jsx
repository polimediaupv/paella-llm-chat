import ReactDOM from "react-dom";
import React, { useState, useEffect, useRef } from "react";
import "./AITools.css";
import Chat from "./Chat.jsx";
import TabContainer, { TabItem } from "./TabContainer.jsx";

const AIWindow = ({paellaPlugin}) => {
    const model = 'Llama-3.1-8B-Instruct-q4f32_1-MLC';
    const baseUrl = "webllm";
    const dialogRef = useRef();

    const showDialog = () => {
        console.log("show dialog");
        dialogRef.current?.show();
    }

    const hideDialog = () => {
        console.log("hide dialog");
        dialogRef.current?.close();
    }

    useEffect(() => {
        const showListener = () => {
            showDialog();
        }
        const hideListener = () => {
            hideDialog();
        }

        window.addEventListener("paella-llm-chat:show", showListener);
        window.addEventListener("paella-llm-chat:hide", hideListener);

        return () => {
            window.removeEventListener("paella-llm-chat:show", showListener);
            window.removeEventListener("paella-llm-chat:hide", hideListener);
        }
    }, []);

    return <dialog ref={dialogRef}>
        <div className="dialog-content">
            <TabContainer>
                <TabItem label="Chat">
                    <Chat
                        promptMessage={"Eres un asistente que resuelve dudas de los usuarios. Responde a la pregunta."}
                        model={model}
                        baseUrl={baseUrl}
                        className="ia-tools-tab-content"
                    />
                </TabItem>
                <TabItem label="Summary">
                    <h2>Hello World!</h2>
                </TabItem>
            </TabContainer>
            <button onClick={() => hideDialog()}>Close</button>
        </div>
    </dialog>
}

const AITools = () => {    
    return  <AIWindow paellaPlugin={paellaPlugin} />
}

export default function setupChat(element, paellaPlugin) {
    const appRootElement = document.createElement('div');
    appRootElement.classList.add("llm-chat-container");
    element.appendChild(appRootElement);
    const root = ReactDOM.createRoot(appRootElement);

    root.render(<AITools paellaPlugin={paellaPlugin}/>);

    return {
        show() {
            const evt = new CustomEvent("paella-llm-chat:show");
            window.dispatchEvent(evt);
        },

        hide() {
            const evt = new CustomEvent("paella-llm-chat:hide");
            window.dispatchEvent(evt);
        },

        get visible() {
            return appRootElement.querySelector("dialog")?.open;
        }
    }
}
