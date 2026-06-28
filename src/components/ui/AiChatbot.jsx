import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { useAuth } from '../../context/AuthContext';
import { aiChatService } from '../../services/aiChatService';
import { cartService } from '../../services/cartService';
import { formatCurrency } from '../../utils/formatters';

export default function AiChatbot() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Hi! Tell me what kind of book you are looking for, and I will help you find a good match.',
    },
  ]);

  if (!user) {
    return null;
  }

  const handleSend = async (textToSend) => {
    const trimmed = (textToSend || '').trim();
    if (!trimmed) return;

    const userMsg = {
      id: Date.now(),
      sender: 'user',
      text: trimmed,
    };
    setMessages((prev) => [...prev, userMsg]);
    setQuery('');
    setIsLoading(true);

    const history = messages.map(msg => ({
      role: msg.sender === 'user' ? 'user' : 'assistant',
      content: msg.text
    }));
    history.push({
      role: 'user',
      content: trimmed
    });

    try {
      const response = await aiChatService.recommend(trimmed, history, 5);
      const botMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: response.answer,
        books: response.books,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err) {
      const errorMsg = {
        id: Date.now() + 1,
        sender: 'bot',
        text: 'Something went wrong while connecting to the AI service. Please try again later.',
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSuggestionClick = (text) => {
    handleSend(text);
  };

  const handleAddToCart = async (book) => {
    await cartService.addItem(book, 1);
    navigate('/cart');
  };

  return (
    <div className="ai-chatbot-container">
      {!isOpen ? (
        <button
          type="button"
          className="ai-chatbot-trigger btn"
          onClick={() => setIsOpen(true)}
        >
          💬 AI Chat
        </button>
      ) : (
        <div className="ai-chatbot-window">
          <div className="ai-chatbot-header">
            <h3>AI Book Assistant</h3>
            <button
              type="button"
              className="ai-chatbot-close"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          <div className="ai-chatbot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`ai-chatbot-message is-${msg.sender}`}>
                <div className="message-text"><ReactMarkdown>{msg.text}</ReactMarkdown></div>
                {msg.books && msg.books.length > 0 && (
                  <div className="chatbot-books-list">
                    {msg.books.map((b) => (
                      <div key={b.id} className="chatbot-book-item">
                        <img src={b.coverUrl} alt={b.title} />
                        <div className="chatbot-book-info">
                          <h4>{b.title}</h4>
                          <p>{b.author}</p>
                          <strong>{formatCurrency(b.price)}</strong>
                          <div className="chatbot-book-actions">
                            <button
                              type="button"
                              onClick={() => navigate(`/books/${b.id}`)}
                              className="btn btn-sm"
                            >
                              Details
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddToCart(b)}
                              disabled={b.stock === 0}
                              className="btn btn-sm"
                            >
                              Add
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {isLoading && (
              <div className="ai-chatbot-message is-bot is-loading">
                <span>Processing your request...</span>
              </div>
            )}
          </div>

          <div className="ai-chatbot-suggestions">
            <button
              type="button"
              onClick={() => handleSuggestionClick('Find Java programming books')}
            >
              Java Programming
            </button>
            <button
              type="button"
              onClick={() => handleSuggestionClick('Recommend adventure fantasy books')}
            >
              Fantasy Books
            </button>
          </div>

          <form
            className="ai-chatbot-input-form"
            onSubmit={(e) => {
              e.preventDefault();
              handleSend(query);
            }}
          >
            <input
              type="text"
              placeholder="Describe the book you want to find..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" className="btn" disabled={isLoading || !query.trim()}>
              Send
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
