import { useEffect, useState, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import { aiChatService } from '../../services/aiChatService';
import { orderService } from '../../services/orderService';
import { bookService } from '../../services/bookService';
import Button from '../../components/ui/Button';
import { LoadingState } from '../../components/ui/State';
import { formatDate } from '../../utils/formatters';

export default function BookChatPage() {
  const chatType = 'BOOK_CHAT';
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [purchasedBooks, setPurchasedBooks] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedBookIds, setSelectedBookIds] = useState([]);
  const [newChatTitle, setNewChatTitle] = useState('');
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

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
    try {
      const orders = await orderService.getOrders();
      const validOrders = orders.filter(
        (o) =>
          o.status === 'PAID' ||
          o.status === 'PROCESSING' ||
          o.status === 'SHIPPED' ||
          o.status === 'DELIVERED'
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
            };
          } catch (err) {
            console.error(err);
            return {
              bookId: Number(id),
              title: booksMap[id].title,
              coverUrl: null,
            };
          }
        })
      );

      setPurchasedBooks(bookDetailsList);
    } catch (err) {
      console.error('Failed to load purchased books:', err);
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
    // The chat type is fixed for this page; reload functions intentionally run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (selectedBookIds.length === 0) {
      alert('Vui lòng chọn ít nhất một cuốn sách để trò chuyện.');
      return;
    }

    const firstBook = purchasedBooks.find((b) => b.bookId === selectedBookIds[0]);
    let defaultTitle = 'Hỏi đáp về sách';
    if (firstBook) {
      defaultTitle = firstBook.title.length > 35 ? firstBook.title.substring(0, 35) + '...' : firstBook.title;
    }
    const title = newChatTitle.trim() || defaultTitle;

    try {
      const newSession = await aiChatService.createSession('BOOK_CHAT', title, selectedBookIds);
      setIsModalOpen(false);
      setNewChatTitle('');
      setSelectedBookIds([]);

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

  const toggleBookSelection = (bookId) => {
    setSelectedBookIds((prev) =>
      prev.includes(bookId) ? prev.filter((id) => id !== bookId) : [...prev, bookId]
    );
  };

  return (
    <section className="stack">
      {error && <div className="panel" style={{ borderLeft: '4px solid var(--error)', color: 'var(--error)' }}>{error}</div>}

      <div className="chat-layout">
        <aside className="chat-sidebar panel">
          <Button
            onClick={() => {
              setSelectedBookIds(purchasedBooks.length > 0 ? [purchasedBooks[0].bookId] : []);
              setIsModalOpen(true);
            }}
            style={{ width: '100%', marginBottom: '16px' }}
          >
            + Bắt đầu trò chuyện mới
          </Button>

          {loading ? (
            <LoadingState text="Đang tải lịch sử..." />
          ) : sessions.length === 0 ? (
            <p className="muted" style={{ textAlign: 'center', fontSize: '14px', marginTop: '20px' }}>Chưa có lịch sử trò chuyện.</p>
          ) : (
            <div className="session-list">
              {sessions.map((session) => (
                <div
                  key={session.id}
                  onClick={() => loadSessionDetails(session.id)}
                  className={`session-item ${currentSession?.id === session.id ? 'active' : ''}`}
                >
                  <div className="session-item-info">
                    <span className="session-title">{session.title}</span>
                    <span className="session-date">
                      {formatDate(session.updatedAt || session.createdAt)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="delete-session-btn"
                    onClick={(e) => handleDeleteSession(session.id, e)}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
        </aside>

        <main className="chat-mainpanel panel">
          {currentSession ? (
            <div className="chat-area">
              <div className="chat-area-header">
                <h3>{currentSession.title}</h3>
                {currentSession.sessionType === 'BOOK_CHAT' && currentSession.bookIds?.length > 0 && (
                  <div className="chat-meta-books">
                    <span className="muted" style={{ fontSize: '12px' }}>Đang hỏi về sách: </span>
                    {currentSession.bookIds.map((bid) => {
                      const book = purchasedBooks.find((pb) => pb.bookId === bid);
                      return (
                        <span key={bid} className="chat-book-tag">
                          {book ? book.title : `Sách #${bid}`}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div ref={chatHistoryRef} className="chat-history-container">
                {currentSession.messages && currentSession.messages.length > 0 ? (
                  currentSession.messages.map((msg) => (
                    <div key={msg.id} className={`chat-message-bubble ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                      <div className="bubble-role">{msg.role === 'user' ? 'Bạn' : 'AI'}</div>
                      <div className="bubble-content"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                      {msg.sources && msg.sources.length > 0 && (
                        <details className="sources-details">
                          <summary>Tham khảo &amp; nguồn ({msg.sources.length})</summary>
                          <div className="sources-list">
                            {msg.sources.map((src, idx) => (
                              <div key={idx} className="source-item-box">
                                <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
                                  [{idx + 1}] {src.bookTitle} {src.page ? `(trang ${src.page})` : ''} - độ khớp: {Math.round(src.score * 100)}%
                                </div>
                                <div className="source-item-text">{src.text}</div>
                              </div>
                            ))}
                          </div>
                        </details>
                      )}
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', marginTop: '60px' }} className="muted">
                    Hãy đặt câu hỏi đầu tiên để bắt đầu cuộc trò chuyện.
                  </div>
                )}
                {sending && (
                  <div className="chat-message-bubble assistant loading">
                    <div className="bubble-role">AI</div>
                    <div className="bubble-content" style={{ fontStyle: 'italic' }}>AI đang suy nghĩ...</div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="chat-input-form-bar">
                <input
                  type="text"
                  placeholder="Đặt câu hỏi..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={sending}
                  required
                />
                <Button type="submit" disabled={sending}>
                  Gửi
                </Button>
              </form>
            </div>
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', height: '100%', minHeight: '300px' }} className="muted">
              <div>
                <p style={{ textAlign: 'center', fontSize: '18px' }}>Chọn hoặc bắt đầu cuộc trò chuyện mới.</p>
                {chatType === 'BOOK_CHAT' && purchasedBooks.length === 0 && (
                  <p style={{ color: 'var(--error)', fontSize: '14px', textAlign: 'center', marginTop: '10px' }}>
                    Cảnh báo: Bạn chưa có sách đã mua để hỏi đáp.
                  </p>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {isModalOpen && (
        <div className="modal-backdrop">
          <div className="modal">
            <div className="modal-header">
              <h3>Bắt đầu trò chuyện AI mới</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ border: 0, background: 'transparent', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleCreateSession} className="form" style={{ marginTop: '16px' }}>
              <div className="field">
                <label>Tiêu đề trò chuyện</label>
                <input
                  type="text"
                  placeholder="Nhập tiêu đề tùy chỉnh (không bắt buộc)"
                  value={newChatTitle}
                  onChange={(e) => setNewChatTitle(e.target.value)}
                />
              </div>

              {purchasedBooks.length === 0 ? (
                <div className="field">
                  <p style={{ color: 'var(--error)', fontSize: '14px' }}>
                    Bạn chưa có sách đã mua. Vui lòng mua sách trước khi bắt đầu trò chuyện.
                  </p>
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '8px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '14px', fontWeight: '500', color: 'var(--text)', margin: 0 }}>Chọn sách để hỏi</label>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button
                        type="button"
                        onClick={() => setSelectedBookIds(purchasedBooks.map((b) => b.bookId))}
                        style={{ border: 'none', background: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '12px', padding: 0 }}
                      >
                        Chọn tất cả
                      </button>
                      <span style={{ color: 'var(--muted)', fontSize: '12px' }}>|</span>
                      <button
                        type="button"
                        onClick={() => setSelectedBookIds([])}
                        style={{ border: 'none', background: 'none', color: 'var(--accent)', cursor: 'pointer', fontSize: '12px', padding: 0 }}
                      >
                        Bỏ chọn tất cả
                      </button>
                    </div>
                  </div>
                  <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid var(--border)', borderRadius: 'var(--radius-md)', padding: '8px 12px', background: 'var(--surface-alt)' }}>
                    {purchasedBooks.map((book, index) => (
                      <label
                        key={book.bookId}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          padding: '8px 0',
                          borderBottom: index === purchasedBooks.length - 1 ? 'none' : '1px solid var(--border)',
                          cursor: 'pointer'
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={selectedBookIds.includes(book.bookId)}
                          onChange={() => toggleBookSelection(book.bookId)}
                          style={{
                            width: '18px',
                            height: '18px',
                            accentColor: 'var(--accent)',
                            cursor: 'pointer',
                            flexShrink: 0
                          }}
                        />
                        {book.coverUrl && (
                          <img
                            src={book.coverUrl}
                            alt={book.title}
                            style={{
                              width: '32px',
                              height: '44px',
                              objectFit: 'cover',
                              borderRadius: 'var(--radius-sm)',
                              boxShadow: 'var(--shadow-sm)'
                            }}
                          />
                        )}
                        <span style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text)' }}>
                          {book.title}
                        </span>
                      </label>
                    ))}
                  </div>
                  {selectedBookIds.length === 0 && (
                    <span style={{ color: 'var(--error)', fontSize: '12px', marginTop: '4px', display: 'block' }}>
                      Vui lòng chọn ít nhất một cuốn sách để hỏi.
                    </span>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '24px' }}>
                <Button type="button" onClick={() => setIsModalOpen(false)}>Hủy</Button>
                <Button type="submit" disabled={purchasedBooks.length === 0 || selectedBookIds.length === 0}>Tạo trò chuyện</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
