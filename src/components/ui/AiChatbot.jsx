import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { BotMessageSquare } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { aiChatService } from '../../services/aiChatService';
import { cartFacade } from '../../services/cartFacade';
import { formatCurrency } from '../../utils/formatters';
import { showToast } from '../../utils/toast';
import { notifyCartUpdated } from '../../utils/cartEvents';
import { getPendingPaymentUserMessage } from '../../utils/pendingOrderGuard';

function debounce(func, delay) {
  let timeout;
  return function (...args) {
    const context = this;
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(context, args), delay);
  };
}

export default function AiChatbot() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingMap, setIsAddingMap] = useState({});
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Hi! Tell me what kind of book you are looking for, and I will help you find a good match.',
    },
  ]);

  const debouncedAddToCart = useRef(
    debounce(async (book) => {
      try {
        const updatedCart = await cartFacade.addItem(book, 1);
        notifyCartUpdated(updatedCart);
        showToast(`Added "${book.title}" to cart!`);
      } catch (err) {
        showToast(
          getPendingPaymentUserMessage(err) || err.message || 'Failed to add book to cart',
          'error',
        );
      } finally {
        setIsAddingMap((prev) => ({ ...prev, [book.id]: false }));
      }
    }, 500)
  ).current;

  if (user?.role === 'ADMIN') {
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
    } catch {
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



  const handleAddToCart = (book) => {
    setIsAddingMap((prev) => ({ ...prev, [book.id]: true }));
    debouncedAddToCart(book);
  };

  return (
    <div className="ai-chatbot-container">
      {!isOpen ? (
        <button
          type="button"
          className="ai-chatbot-trigger btn"
          onClick={() => setIsOpen(true)}
          aria-label="Open AI chat"
          title="AI Chat"
        >
          <BotMessageSquare size={28} aria-hidden="true" />
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
                              View
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddToCart(b)}
                              disabled={b.stock === 0 || isAddingMap[b.id]}
                              className="btn btn-sm"
                            >
                              {isAddingMap[b.id] ? 'Adding...' : 'Add'}
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
              onClick={() => handleSuggestionClick('Find books about AI and technology')}
            >
              AI & Technology
            </button>
            <button
              type="button"
              onClick={() => handleSuggestionClick('Recommend books about psychology and self-help')}
            >
              Psychology & Self-Help
            </button>
            <button
              type="button"
              onClick={() => handleSuggestionClick('Find fiction and literature books')}
            >
              Fiction & Literature
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
