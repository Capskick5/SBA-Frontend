import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { aiChatService } from '../../services/aiChatService';
import { cartService } from '../../services/cartService';
import { formatCurrency } from '../../utils/formatters';


const renderMarkdown = (text) => {
  if (!text) return null;
  const lines = text.split('\n');
  const elements = [];
  let currentList = [];

  const parseInline = (line) => {
    const parts = line.split('**');
    return parts.map((part, index) => {
      if (index % 2 === 1) {
        return <strong key={index}>{part}</strong>;
      }
      return part;
    });
  };

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();
    if (trimmedLine.startsWith('- ')) {
      const content = trimmedLine.substring(2);
      currentList.push(<li key={index}>{parseInline(content)}</li>);
    } else {
      if (currentList.length > 0) {
        elements.push(<ul key={`list-${index}`}>{currentList}</ul>);
        currentList = [];
      }
      if (trimmedLine === '') {
        elements.push(<div key={`br-${index}`} className="chat-spacer" style={{ height: '8px' }} />);
      } else {
        elements.push(<p key={index}>{parseInline(line)}</p>);
      }
    }
  });

  if (currentList.length > 0) {
    elements.push(<ul key="list-final">{currentList}</ul>);
  }

  return elements;
};

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
      text: 'Xin chào! Tôi có thể giúp gì cho bạn? Hãy nhập yêu cầu tìm kiếm sách của bạn tại đây.',
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
        text: 'Có lỗi xảy ra khi kết nối tới dịch vụ AI. Vui lòng thử lại sau.',
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
          💬 Trò chuyện AI
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

          <div className="ai-chatbot-messages">
            {messages.map((msg) => (
              <div key={msg.id} className={`ai-chatbot-message is-${msg.sender}`}>
                <div className="message-text">{renderMarkdown(msg.text)}</div>
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
                              Chi tiết
                            </button>
                            <button
                              type="button"
                              onClick={() => handleAddToCart(b)}
                              disabled={b.stock === 0}
                              className="btn btn-sm"
                            >
                              Thêm
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
              onClick={() => handleSuggestionClick('Tìm sách lập trình Java')}
            >
              Lập trình Java
            </button>
            <button
              type="button"
              onClick={() => handleSuggestionClick('Đề xuất sách giả tưởng phiêu lưu')}
            >
              Sách giả tưởng
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
              placeholder="Nhập nhu cầu tìm sách của bạn..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              disabled={isLoading}
            />
            <button type="submit" className="btn" disabled={isLoading || !query.trim()}>
              Gửi
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
