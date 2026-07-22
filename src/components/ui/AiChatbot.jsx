import { useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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
  const location = useLocation();
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isAddingMap, setIsAddingMap] = useState({});
  const [messages, setMessages] = useState([
    {
      id: 1,
      sender: 'bot',
      text: 'Xin chào! Hãy cho tôi biết bạn đang tìm loại sách nào, tôi sẽ giúp bạn chọn phù hợp.',
    },
  ]);

  const debouncedAddToCart = useRef(
    debounce(async (book) => {
      try {
        const updatedCart = await cartFacade.addItem(book, 1);
        notifyCartUpdated(updatedCart);
        showToast(`Đã thêm "${book.title}" vào giỏ hàng!`);
      } catch (err) {
        showToast(
          getPendingPaymentUserMessage(err) || err.message || 'Không thể thêm sách vào giỏ hàng',
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
        text: 'Không kết nối được dịch vụ AI. Vui lòng thử lại sau.',
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
          aria-label="Mở trợ lý AI"
          title="Trợ lý AI"
        >
          <BotMessageSquare size={28} aria-hidden="true" />
          Trợ lý AI
        </button>
      ) : (
        <div className="ai-chatbot-window">
          <div className="ai-chatbot-header">
            <h3>Trợ lý tìm sách AI</h3>
            <button
              type="button"
              className="ai-chatbot-close"
              onClick={() => setIsOpen(false)}
            >
              ✕
            </button>
          </div>

          {!user ? (
            <div className="ai-chatbot-messages">
              <div className="ai-chatbot-message is-bot">
                <div className="message-text">
                  <p>Trợ lý tìm sách AI dành cho khách hàng đã đăng nhập.</p>
                  <p>Vui lòng đăng nhập để trò chuyện và nhận gợi ý cá nhân hóa.</p>
                </div>
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => navigate(`/login?redirect=${encodeURIComponent(location.pathname)}`)}
              >
                Đăng nhập để trò chuyện
              </button>
            </div>
          ) : (
          <>
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
                              Xem
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddToCart(b)}
                              disabled={b.stock === 0 || isAddingMap[b.id]}
                              className="btn btn-sm"
                            >
                              {isAddingMap[b.id] ? 'Đang thêm...' : 'Thêm'}
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
                <span>Đang xử lý yêu cầu...</span>
              </div>
            )}
          </div>

          <div className="ai-chatbot-suggestions">
            <button
              type="button"
              onClick={() => handleSuggestionClick('Tìm sách về AI và công nghệ')}
            >
              AI & Công nghệ
            </button>
            <button
              type="button"
              onClick={() => handleSuggestionClick('Gợi ý sách tâm lý và phát triển bản thân')}
            >
              Tâm lý & Phát triển bản thân
            </button>
            <button
              type="button"
              onClick={() => handleSuggestionClick('Tìm sách văn học và tiểu thuyết')}
            >
              Văn học & Tiểu thuyết
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
              placeholder="Mô tả cuốn sách bạn muốn tìm..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" className="btn" disabled={isLoading || !query.trim()}>
              Gửi
            </button>
          </form>
          </>
          )}
        </div>
      )}
    </div>
  );
}
