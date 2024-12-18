import { useState, useEffect, useRef } from 'react';
import { ChatOllama } from "@langchain/ollama";
import { ChatWebLLM } from "@langchain/community/chat_models/webllm";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import { AIMessage, HumanMessage } from '@langchain/core/messages';


let g_chatData = null;

export function useChatModel({ promptMessage, model, baseUrl = "webllm" }) {
    const [chain, setChain] = useState(null);
    const [progress, setProgress] = useState("");
    const [chat, setChat] = useState(null);

    useEffect(() => {
        if (chat) {
            const template = ChatPromptTemplate.fromMessages([
                ["system", promptMessage],
                new MessagesPlaceholder("chat_history"),
                ["user", "Pregunta: {input}"]
            ]);

            setChain(template.pipe(chat));
        }
    }, [chat, promptMessage]);

    useEffect(() => {
        setChain(null);
        setChat(null);

        if (!g_chatData || g_chatData.model !== model || g_chatData.baseUrl !== baseUrl) {
            if (baseUrl !== "webllm") {
                const chatOllama = new ChatOllama({
                    model,
                    baseUrl,
                    temperature: 0.1
                });
                setChat(chatOllama);
                g_chatData = {
                    chat: chatOllama,
                    model,
                    baseUrl
                }
            }
            else {
                console.log("Reloading model");
                const webllmChat = new ChatWebLLM({
                    model,
                    chatOptions: {
                        temperature: 0.1
                    }
                });

                g_chatData = {
                    chat: webllmChat,
                    model,
                    baseUrl,
                    progressCallback: (progress) => {
                        setProgress(progress.text);    
                    }
                }

                g_chatData.initializePromise = webllmChat.initialize(p => g_chatData.progressCallback(p));

                g_chatData.initializePromise.then(() => {
                    setChat(webllmChat);
                });
            }
        }
        else {
            if (g_chatData.initializePromise) {
                g_chatData.progressCallback = (progress) => {
                    setProgress(progress.text);    
                }
                g_chatData.initializePromise.then(() => {
                    setChat(g_chatData.chat);
                    g_chatData.initializePromise = null;
                });
            }
            else {
                setChat(g_chatData.chat);
            }
        }
        
    }, [model, baseUrl]);

    return { chat: chain, progress };
}

export function useChat({ promptMessage, model, baseUrl = "webllm", chatHistoryMaxMessages = 5 }) {
    const [input, setInput] = useState('');
    const [processing, setProcessing] = useState(false);
    const [messages, setMessages] = useState([]);
    const [chatHistory, setChatHistory] = useState([]);
    const lastMessage = useRef('');
    const [chain, setChain] = useState(null);

    useEffect(() => {
        console.log("Reset messages");
        setMessages([]);
        setChatHistory([]);
        setChain(null);
    }, [promptMessage, model, baseUrl]);

    const { chat, progress: progressMessage } = useChatModel({
        promptMessage,
        model,
        baseUrl
    });

    useEffect(() => {
        if (chat) {
            console.log("Recreating chain");
            setChain(chat);
        }
    }, [chat]);

    useEffect(() => {
        lastMessage.current = '';
    }, [chatHistory]);

    const submitMessage = async (e) => {
        e.preventDefault();
        setChatHistory(h => [...h.slice(-chatHistoryMaxMessages), new HumanMessage(input)]);
        setProcessing(true);
        setMessages(m => [
            ...(m.slice(-5)),
            { role: "human", text: input }, { role: "system", "text": "" }
        ]);
        setInput(() => '');

        new Promise(resolve => {
            chain.stream({ input, chat_history: chatHistory })
                .then(async chunks => {
                    for await (const chunk of chunks) {
                        setMessages(msg => [...msg.slice(0, -1), { ...msg[msg.length - 1], text: msg[msg.length - 1].text + chunk?.content }]);
                        lastMessage.current += chunk?.content;
                    }
                    setChatHistory(h => [...h, new AIMessage(lastMessage.current)]);
                    resolve();
                })
        }).then(() => {
            setProcessing(false);
        });
    }

    return {
        input, setInput,
        messages,
        submitMessage,
        processing,
        ready: chain !== null,
        progressMessage
    }
}