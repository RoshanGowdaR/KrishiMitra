import { useState } from 'react';
import { sendChatMessage } from '../services/api';

export default function Chatbot() {
  const [message, setMessage] = useState('');
  const [history, setHistory] = useState([]);

  const handleSend = async (event) => {
    event.preventDefault();
    if (!message.trim()) return;

    const response = await sendChatMessage({
      message,
      conversation_history: history,
      language: 'en',
    });

    setHistory(response.conversation_history || []);
    setMessage('');
  };

  return (
    <div className="page-wrap">
      <h2>AI Chatbot</h2>
      <div className="panel">
        <div className="chat-log">
          {history.map((item, index) => (
            <p key={index}><strong>{item.role}:</strong> {item.content}</p>
          ))}
        </div>

        <form onSubmit={handleSend} className="inline-form">
          <input
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Ask about crops, soil, or markets"
          />
          <button type="submit" className="primary-btn">Send</button>
        </form>
      </div>
    </div>
  );
}
