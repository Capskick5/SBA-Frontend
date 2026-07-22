import { useEffect, useState, useRef } from 'react';
import { Link } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import {
  BookOpen,
  MessageSquare,
  Plus,
  Trash2,
  ShieldCheck,
  Sparkles,
  Send,
  ShoppingBag,
  Info,
  Lock,
  Search,
  CheckCircle2,
  X,
  Layers,
  Bot,
  User as UserIcon,
  ArrowLeft,
  CheckSquare,
  Square,
} from 'lucide-react';
import { aiChatService } from '../../services/aiChatService';
import { orderService } from '../../services/orderService';
import { bookService } from '../../services/bookService';
import { LoadingState, EmptyState } from '../../components/ui/State';
import { formatDate } from '../../utils/formatters';

function BookCover({ src, title, className = '' }) {
  const [hasError, setHasError] = useState(false);

  if (!src || hasError) {
    return (
      <div className={`book-cover-fallback ${className}`}>
        <BookOpen size={22} />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={title || ''}
      className={className}
      onError={() => setHasError(true)}
    />
  );
}

export default function BookChatPage() {
  const chatType = 'BOOK_CHAT';
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [purchasedBooks, setPurchasedBooks] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [booksLoading, setBooksLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [showPolicy, setShowPolicy] = useState(true);

  // Library search and multi-select states
  const [librarySearchTerm, setLibrarySearchTerm] = useState('');
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState([]);

  const chatHistoryRef = useRef(null);

  useEffect(() => {
    if (chatHistoryRef.current) {
      chatHistoryRef.current.scrollTop = chatHistoryRef.current.scrollHeight;
    }
  }, [currentSession?.messages, sending]);

  async function loadSessions() {
    setLoading(true);
    setError('');
    try {
      const data = await aiChatService.getSessions(chatType);
      setSessions(data || []);
      if (data && data.length > 0) {
        loadSessionDetails(data[0].id);
      } else {
        setCurrentSession(null);
      }
    } catch (err) {
      console.error(err);
      setError('Không thể tải lịch sử trò chuyện.');
    } finally {
      setLoading(false);
    }
  }

  async function loadPurchasedBooks() {
    setBooksLoading(true);
    try {
      const orders = await orderService.getOrders();
      const validOrders = (orders || []).filter(
        (o) =>
          o.status === 'PAID' ||
          o.status === 'PROCESSING' ||
          o.status === 'SHIPPED' ||
          o.status === 'DELIVERED' ||
          o.status === 'COMPLETED'
      );

      const detailedOrders = await Promise.all(
        validOrders.map((o) => orderService.getOrderById(o.id))
      );

      const booksMap = {};
      for (const orderDetail of detailedOrders) {
        if (orderDetail?.items) {
          for (const item of orderDetail.items) {
            booksMap[item.bookId] = {
              bookId: item.bookId,
              title: item.title,
            };
          }
        }
      }

      const bookIds = Object.keys(booksMap);
      const bookDetailsList = await Promise.all(
        bookIds.map(async (id) => {
          try {
            const detail = await bookService.getBookById(id);
            return {
              bookId: Number(id),
              title: detail.title,
              coverUrl: detail.coverUrl,
              author: detail.author?.name || detail.author || 'Tác giả',
              category: detail.category?.name || (typeof detail.category === 'string' ? detail.category : 'Tổng hợp'),
            };
          } catch (err) {
            console.error(err);
            return {
              bookId: Number(id),
              title: booksMap[id].title,
              coverUrl: null,
              author: 'Tác giả',
              category: 'Tổng hợp',
            };
          }
        })
      );

      setPurchasedBooks(bookDetailsList);
    } catch (err) {
      console.error('Failed to load purchased books:', err);
      setPurchasedBooks([]);
    } finally {
      setBooksLoading(false);
    }
  }

  async function loadSessionDetails(id) {
    try {
      const details = await aiChatService.getSessionById(id);
      setCurrentSession(details);
    } catch (err) {
      console.error(err);
      setError('Không thể tải chi tiết cuộc trò chuyện.');
    }
  }

  useEffect(() => {
    Promise.resolve().then(() => {
      loadSessions();
      loadPurchasedBooks();
    });
  }, []);

  const handleStartChatWithBook = async (book) => {
    const defaultTitle = book.title.length > 35 ? book.title.substring(0, 35) + '...' : book.title;
    try {
      const newSession = await aiChatService.createSession('BOOK_CHAT', defaultTitle, [book.bookId]);
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSession({
        ...newSession,
        messages: [],
      });
    } catch (err) {
      console.error(err);
      alert('Không thể bắt đầu cuộc trò chuyện mới.');
    }
  };

  const handleStartMultiBookChat = async () => {
    if (selectedBookIds.length === 0) return;

    const firstBook = purchasedBooks.find((b) => b.bookId === selectedBookIds[0]);
    let title = `Hỏi đáp về ${selectedBookIds.length} cuốn sách`;
    if (firstBook) {
      title = `Thảo luận (${selectedBookIds.length} sách): ${firstBook.title.substring(0, 25)}...`;
    }

    try {
      const newSession = await aiChatService.createSession('BOOK_CHAT', title, selectedBookIds);
      setSessions((prev) => [newSession, ...prev]);
      setCurrentSession({
        ...newSession,
        messages: [],
      });
      setIsMultiSelectMode(false);
      setSelectedBookIds([]);
    } catch (err) {
      console.error(err);
      alert('Không thể bắt đầu cuộc trò chuyện mới.');
    }
  };

  const handleDeleteSession = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Bạn có chắc muốn xóa lịch sử trò chuyện này?')) return;

    try {
      await aiChatService.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (currentSession?.id === id) {
        setCurrentSession(null);
      }
    } catch (err) {
      console.error(err);
      alert('Không thể xóa cuộc trò chuyện.');
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!messageText.trim() || !currentSession) return;

    const query = messageText.trim();
    setMessageText('');
    setSending(true);

    const tempUserMessage = {
      id: Date.now(),
      role: 'user',
      content: query,
      createdAt: new Date().toISOString(),
    };

    setCurrentSession((prev) => ({
      ...prev,
      messages: [...(prev.messages || []), tempUserMessage],
    }));

    try {
      const botResponse = await aiChatService.sendMessage(currentSession.id, query);
      setCurrentSession((prev) => {
        const filtered = prev.messages.filter((m) => m.id !== tempUserMessage.id);
        return {
          ...prev,
          messages: [...filtered, tempUserMessage, botResponse],
        };
      });
    } catch (err) {
      console.error(err);
      alert(err.message || 'Không thể nhận câu trả lời từ trợ lý AI.');
    } finally {
      setSending(false);
    }
  };

  const toggleBookSelection = (bookId, e) => {
    if (e) e.stopPropagation();
    setSelectedBookIds((prev) =>
      prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId]
    );
  };

  // Filtered books based on search query
  const displayedBooks = purchasedBooks.filter((book) => {
    return (
      book.title.toLowerCase().includes(librarySearchTerm.toLowerCase()) ||
      book.author.toLowerCase().includes(librarySearchTerm.toLowerCase())
    );
  });

  return (
    <div className="book-chat-page-wrapper">
      {/* Page Header Title */}
      <div className="book-chat-page-header">
        <div className="book-chat-header-title">
          <BookOpen size={28} className="book-chat-header-icon" />
          <div>
            <h1>Trợ lý đọc sách AI</h1>
            <p>Hỗ trợ tóm tắt, giải thích ngữ cảnh & đào sâu kiến thức từ các cuốn sách bạn đã mua</p>
          </div>
        </div>

        <button
          type="button"
          className="book-chat-policy-toggle-btn"
          onClick={() => setShowPolicy(!showPolicy)}
        >
          <ShieldCheck size={16} />
          {showPolicy ? 'Ẩn cam kết bản quyền' : 'Xem cam kết bản quyền'}
        </button>
      </div>

      {/* Content Usage Commitment Policy Banner */}
      {showPolicy && (
        <div className="book-chat-policy-banner">
          <div className="book-chat-policy-header">
            <div className="book-chat-policy-badge">
              <ShieldCheck size={18} />
              Cam kết bảo vệ bản quyền & Hỗ trợ đọc sách cá nhân
            </div>
            <button
              type="button"
              className="book-chat-policy-close"
              onClick={() => setShowPolicy(false)}
              aria-label="Đóng thông báo"
            >
              <X size={16} />
            </button>
          </div>
          <div className="book-chat-policy-grid">
            <div className="book-chat-policy-item">
              <BookOpen size={16} className="book-chat-policy-icon" />
              <div>
                <strong>Chỉ phục vụ học tập cá nhân</strong>
                <p>Nội dung sách được phân tích dành riêng cho tài khoản đã sở hữu tác phẩm.</p>
              </div>
            </div>
            <div className="book-chat-policy-item">
              <Lock size={16} className="book-chat-policy-icon" />
              <div>
                <strong>Tôn trọng tác quyền & NXB</strong>
                <p>Hệ thống không chia sẻ, sao chép hoặc phát tán nguyên văn toàn bộ tác phẩm.</p>
              </div>
            </div>
            <div className="book-chat-policy-item">
              <Layers size={16} className="book-chat-policy-icon" />
              <div>
                <strong>Đối chiếu đa cuốn sách</strong>
                <p>Bạn có thể chọn 1 hoặc nhiều cuốn sách đã mua để so sánh và liên kết kiến thức.</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {error && (
        <div className="book-chat-error-alert" role="alert">
          <Info size={18} />
          <span>{error}</span>
        </div>
      )}

      {/* Main Chat Layout */}
      <div className="book-chat-layout">
        {/* Left Sidebar: New Session CTA & Chat History */}
        <aside className="book-chat-sidebar">
          {/* Action: Create New Session */}
          <button
            type="button"
            className="btn book-chat-new-btn"
            onClick={() => {
              setCurrentSession(null);
            }}
          >
            <Plus size={18} />
            Cuộc trò chuyện mới
          </button>

          {/* Chat Session History List */}
          <div className="book-chat-history-widget">
            <div className="book-chat-widget-header">
              <span className="book-chat-widget-title">Lịch sử trò chuyện</span>
              {sessions.length > 0 && (
                <span className="book-chat-widget-count">{sessions.length}</span>
              )}
            </div>

            {loading ? (
              <LoadingState text="Đang tải..." />
            ) : sessions.length === 0 ? (
              <div className="book-chat-widget-empty">
                Chưa có lịch sử trò chuyện. Chọn sách từ Tủ sách bên phải để bắt đầu.
              </div>
            ) : (
              <div className="book-chat-session-list">
                {sessions.map((session) => {
                  const isActive = currentSession?.id === session.id;
                  return (
                    <div
                      key={session.id}
                      onClick={() => loadSessionDetails(session.id)}
                      className={`book-chat-session-item${isActive ? ' is-active' : ''}`}
                    >
                      <MessageSquare size={16} className="book-chat-session-icon" />
                      <div className="book-chat-session-info">
                        <span className="book-chat-session-title">{session.title}</span>
                        <span className="book-chat-session-date">
                          {formatDate(session.updatedAt || session.createdAt)}
                        </span>
                      </div>
                      <button
                        type="button"
                        className="book-chat-delete-btn"
                        onClick={(e) => handleDeleteSession(session.id, e)}
                        title="Xóa trò chuyện"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </aside>

        {/* Right Main Panel */}
        <main className={`book-chat-main${currentSession ? ' is-chatting' : ''}`}>
          {currentSession ? (
            /* Active Chat Conversation View */
            <div className="book-chat-area">
              {/* Header inside Active Chat */}
              <div className="book-chat-area-header">
                <div className="book-chat-area-title-row">
                  <button
                    type="button"
                    className="book-chat-back-to-lib-btn"
                    onClick={() => setCurrentSession(null)}
                    title="Về Tủ sách đã mua"
                  >
                    <ArrowLeft size={16} />
                    <span>Tủ sách</span>
                  </button>
                  <h2>{currentSession.title}</h2>
                </div>
                {currentSession.sessionType === 'BOOK_CHAT' && currentSession.bookIds?.length > 0 && (
                  <div className="book-chat-active-books">
                    <span className="book-chat-active-label">Sách đang thảo luận:</span>
                    <div className="book-chat-active-tags">
                      {currentSession.bookIds.map((bid) => {
                        const book = purchasedBooks.find((pb) => pb.bookId === bid);
                        return (
                          <div key={bid} className="book-chat-book-tag">
                            <BookOpen size={12} />
                            <span>{book ? book.title : `Sách #${bid}`}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Message Bubble History Container */}
              <div ref={chatHistoryRef} className="book-chat-messages-container">
                {currentSession.messages && currentSession.messages.length > 0 ? (
                  currentSession.messages.map((msg) => {
                    const isUser = msg.role === 'user';
                    return (
                      <div
                        key={msg.id}
                        className={`book-chat-message-row${isUser ? ' is-user' : ' is-assistant'}`}
                      >
                        <div className="book-chat-avatar">
                          {isUser ? <UserIcon size={16} /> : <Bot size={16} />}
                        </div>
                        <div className="book-chat-bubble-content">
                          <div className="book-chat-author-name">
                            {isUser ? 'Bạn' : 'Trợ lý đọc sách BookVerse'}
                          </div>
                          <div className="book-chat-markdown">
                            <ReactMarkdown>{msg.content}</ReactMarkdown>
                          </div>

                          {/* Sources citation block */}
                          {msg.sources && msg.sources.length > 0 && (
                            <details className="book-chat-sources">
                              <summary>
                                <Info size={13} />
                                <span>Trích dẫn nguồn từ sách ({msg.sources.length})</span>
                              </summary>
                              <div className="book-chat-sources-list">
                                {msg.sources.map((src, idx) => (
                                  <div key={idx} className="book-chat-source-item">
                                    <div className="book-chat-source-meta">
                                      <span>[{idx + 1}] {src.bookTitle} {src.page ? `(trang ${src.page})` : ''}</span>
                                      <span className="book-chat-source-score">Độ khớp: {Math.round(src.score * 100)}%</span>
                                    </div>
                                    <p className="book-chat-source-quote">{src.text}</p>
                                  </div>
                                ))}
                              </div>
                            </details>
                          )}
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className="book-chat-empty-messages">
                    <Sparkles size={36} className="book-chat-empty-icon" />
                    <h3>Hãy đặt câu hỏi đầu tiên!</h3>
                    <p>Hỏi về nội dung, bài học chính, hoặc nhờ tóm tắt về cuốn sách bạn đã chọn.</p>
                  </div>
                )}

                {sending && (
                  <div className="book-chat-message-row is-assistant is-loading">
                    <div className="book-chat-avatar">
                      <Bot size={16} />
                    </div>
                    <div className="book-chat-bubble-content">
                      <div className="book-chat-author-name">Trợ lý đọc sách BookVerse</div>
                      <div className="book-chat-loading-dots">
                        <span />
                        <span />
                        <span />
                        <span className="loading-text">Đang phân tích sách...</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Chat Input Form */}
              <form onSubmit={handleSendMessage} className="book-chat-input-form">
                <input
                  type="text"
                  placeholder="Đặt câu hỏi về nội dung cuốn sách..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={sending}
                  required
                />
                <button type="submit" className="btn book-chat-send-btn" disabled={sending || !messageText.trim()}>
                  <span>Gửi</span>
                  <Send size={16} />
                </button>
              </form>
            </div>
          ) : (
            /* Streamlined Ultra Compact Library View without Category Tags */
            <div className="book-chat-welcome-container">
              {booksLoading ? (
                <LoadingState text="Đang tải tủ sách của bạn..." />
              ) : purchasedBooks.length > 0 ? (
                <div className="book-chat-books-grid-section">
                  {/* Single Line Header Toolbar */}
                  <div className="book-chat-library-toolbar">
                    <div className="book-chat-toolbar-title">
                      <BookOpen size={20} className="book-chat-title-icon" />
                      <h2>Tủ sách của bạn ({purchasedBooks.length} cuốn)</h2>
                    </div>

                    <div className="book-chat-toolbar-actions">
                      <div className="book-chat-library-search">
                        <Search size={14} />
                        <input
                          type="text"
                          placeholder="Tìm tên sách..."
                          value={librarySearchTerm}
                          onChange={(e) => setLibrarySearchTerm(e.target.value)}
                        />
                      </div>

                      <button
                        type="button"
                        className={`book-chat-multi-mode-btn${isMultiSelectMode ? ' is-active' : ''}`}
                        onClick={() => {
                          setIsMultiSelectMode(!isMultiSelectMode);
                          setSelectedBookIds([]);
                        }}
                      >
                        {isMultiSelectMode ? <CheckSquare size={15} /> : <Square size={15} />}
                        <span>Chọn nhiều</span>
                      </button>
                    </div>
                  </div>

                  {/* Multi-select Header CTA when active */}
                  {isMultiSelectMode && (
                    <div className="book-chat-multi-bar">
                      <span>Đã chọn <strong>{selectedBookIds.length}</strong> cuốn sách</span>
                      <button
                        type="button"
                        className="btn btn-sm book-chat-start-multi-btn"
                        disabled={selectedBookIds.length === 0}
                        onClick={handleStartMultiBookChat}
                      >
                        <MessageSquare size={14} />
                        Thảo luận ({selectedBookIds.length} sách)
                      </button>
                    </div>
                  )}

                  {/* Book Cards Grid */}
                  {displayedBooks.length > 0 ? (
                    <div className="book-chat-books-grid">
                      {displayedBooks.map((book) => {
                        const isSelected = selectedBookIds.includes(book.bookId);
                        return (
                          <div
                            key={book.bookId}
                            className={`book-chat-grid-card${isSelected ? ' is-selected' : ''}`}
                            onClick={(e) => {
                              if (isMultiSelectMode) {
                                toggleBookSelection(book.bookId, e);
                              } else {
                                handleStartChatWithBook(book);
                              }
                            }}
                          >
                            <div className="book-chat-card-top">
                              {isMultiSelectMode && (
                                <div className={`book-chat-card-checkbox${isSelected ? ' is-checked' : ''}`}>
                                  {isSelected && <CheckCircle2 size={16} />}
                                </div>
                              )}
                              <div className="book-chat-card-cover">
                                <BookCover src={book.coverUrl} title={book.title} />
                              </div>
                              <div className="book-chat-card-info">
                                <h4 className="book-chat-card-title">{book.title}</h4>
                                <span className="book-chat-card-author">{book.author}</span>
                                <span className="book-chat-card-cat-badge">{book.category}</span>
                              </div>
                            </div>

                            {!isMultiSelectMode && (
                              <button type="button" className="btn book-chat-card-start-btn">
                                <MessageSquare size={14} />
                                Hỏi AI về sách này
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <EmptyState
                      title="Không tìm thấy sách phù hợp"
                      description="Hãy thử đổi từ khóa tìm kiếm."
                    />
                  )}
                </div>
              ) : (
                <div className="book-chat-no-books-card">
                  <ShoppingBag size={40} className="book-chat-no-books-icon" />
                  <h3>Bạn chưa có sách đã mua trong tủ sách</h3>
                  <p>
                    Vui lòng chọn mua các cuốn sách yêu thích tại BookVerse để mở khóa quyền trợ lý đọc sách AI cá nhân.
                  </p>
                  <Link to="/" className="btn book-chat-browse-btn">
                    Khám phá cửa hàng sách
                  </Link>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
