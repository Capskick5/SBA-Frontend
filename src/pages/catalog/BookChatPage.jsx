import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { aiChatService } from '../../services/aiChatService';
import { orderService } from '../../services/orderService';
import { bookService } from '../../services/bookService';
import Button from '../../components/ui/Button';

export default function BookChatPage() {
  const [chatType, setChatType] = useState('BOOK_CHAT');
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

  useEffect(() => {
    loadSessions();
    loadPurchasedBooks();
  }, [chatType]);

  const loadSessions = async () => {
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
      setError('Failed to load chat history.');
    } finally {
      setLoading(false);
    }
  };

  const loadPurchasedBooks = async () => {
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
  };

  const loadSessionDetails = async (id) => {
    try {
      const details = await aiChatService.getSessionById(id);
      setCurrentSession(details);
    } catch (err) {
      console.error(err);
      setError('Failed to load chat conversation details.');
    }
  };

  const handleCreateSession = async (e) => {
    e.preventDefault();
    if (chatType === 'BOOK_CHAT' && selectedBookIds.length === 0) {
      alert('Please select at least one book to chat about.');
      return;
    }

    const title = newChatTitle.trim() || (chatType === 'BOOK_CHAT' ? 'Book Q&A Chat' : 'Catalog Assistant Chat');

    try {
      const newSession = await aiChatService.createSession(chatType, title, selectedBookIds);
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
      alert('Failed to start a new chat session.');
    }
  };

  const handleDeleteSession = async (id, e) => {
    e.stopPropagation();
    if (!window.confirm('Are you sure you want to delete this chat history?')) return;

    try {
      await aiChatService.deleteSession(id);
      setSessions((prev) => prev.filter((s) => s.id !== id));
      if (currentSession?.id === id) {
        setCurrentSession(null);
      }
    } catch (err) {
      console.error(err);
      alert('Failed to delete chat session.');
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
      alert(err.message || 'Failed to get answer from AI assistant.');
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
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>AI Assistant</h1>
          <p className="muted">Chat with AI about your books or ask for new recommendations.</p>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <Button
            onClick={() => {
              setChatType('BOOK_CHAT');
              setCurrentSession(null);
            }}
            style={{
              background: chatType === 'BOOK_CHAT' ? '#111' : '#fff',
              color: chatType === 'BOOK_CHAT' ? '#fff' : '#111',
            }}
          >
            Book Q&A
          </Button>
          <Button
            onClick={() => {
              setChatType('BOOK_RECOMMEND');
              setCurrentSession(null);
            }}
            style={{
              background: chatType === 'BOOK_RECOMMEND' ? '#111' : '#fff',
              color: chatType === 'BOOK_RECOMMEND' ? '#fff' : '#111',
            }}
          >
            Catalog Recommend
          </Button>
        </div>
      </div>

      {error && <div className="panel" style={{ borderLeft: '4px solid #ef4444', color: '#ef4444' }}>{error}</div>}

      <div className="chat-layout">
        <aside className="chat-sidebar panel">
          <Button
            onClick={() => setIsModalOpen(true)}
            style={{ width: '100%', marginBottom: '16px', background: '#111', color: '#fff' }}
          >
            + Start New Chat
          </Button>

          {loading ? (
            <p className="muted" style={{ textAlign: 'center' }}>Loading history...</p>
          ) : sessions.length === 0 ? (
            <p className="muted" style={{ textAlign: 'center', fontSize: '14px', marginTop: '20px' }}>No chat history found.</p>
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
                      {new Date(session.updatedAt || session.createdAt).toLocaleDateString()}
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
                    <span className="muted" style={{ fontSize: '12px' }}>Querying books: </span>
                    {currentSession.bookIds.map((bid) => {
                      const book = purchasedBooks.find((pb) => pb.bookId === bid);
                      return (
                        <span key={bid} className="chat-book-tag">
                          {book ? book.title : `Book #${bid}`}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="chat-history-container">
                {currentSession.messages && currentSession.messages.length > 0 ? (
                  currentSession.messages.map((msg) => (
                    <div key={msg.id} className={`chat-message-bubble ${msg.role === 'user' ? 'user' : 'assistant'}`}>
                      <div className="bubble-role">{msg.role === 'user' ? 'You' : 'AI'}</div>
                      <div className="bubble-content"><ReactMarkdown>{msg.content}</ReactMarkdown></div>
                      {msg.sources && msg.sources.length > 0 && (
                        <details className="sources-details">
                          <summary>References &amp; Sources ({msg.sources.length})</summary>
                          <div className="sources-list">
                            {msg.sources.map((src, idx) => (
                              <div key={idx} className="source-item-box">
                                <div style={{ fontWeight: 'bold', fontSize: '12px' }}>
                                  [{idx + 1}] {src.bookTitle} {src.page ? `(page ${src.page})` : ''} - match score: {Math.round(src.score * 100)}%
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
                    Ask your first question to start the conversation.
                  </div>
                )}
                {sending && (
                  <div className="chat-message-bubble assistant loading">
                    <div className="bubble-role">AI</div>
                    <div className="bubble-content" style={{ fontStyle: 'italic' }}>AI is thinking...</div>
                  </div>
                )}
              </div>

              <form onSubmit={handleSendMessage} className="chat-input-form-bar">
                <input
                  type="text"
                  placeholder="Ask a question..."
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  disabled={sending}
                  required
                />
                <Button type="submit" disabled={sending}>
                  Send
                </Button>
              </form>
            </div>
          ) : (
            <div style={{ display: 'grid', placeItems: 'center', height: '100%', minHeight: '300px' }} className="muted">
              <div>
                <p style={{ textAlign: 'center', fontSize: '18px' }}>Select or start a new conversation to begin.</p>
                {chatType === 'BOOK_CHAT' && purchasedBooks.length === 0 && (
                  <p style={{ color: '#ef4444', fontSize: '14px', textAlign: 'center', marginTop: '10px' }}>
                    Warning: You do not have any purchased books to query.
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
              <h3>Start New AI Chat</h3>
              <button type="button" onClick={() => setIsModalOpen(false)} style={{ border: 0, background: 'transparent', fontSize: '20px', cursor: 'pointer' }}>×</button>
            </div>
            <form onSubmit={handleCreateSession} className="form" style={{ marginTop: '16px' }}>
              <div className="field">
                <label>Chat Title</label>
                <input
                  type="text"
                  placeholder="Enter custom chat title (optional)"
                  value={newChatTitle}
                  onChange={(e) => setNewChatTitle(e.target.value)}
                />
              </div>

              {chatType === 'BOOK_CHAT' && (
                <div className="field">
                  <label>Select Books to Include in Chat Context (Multi-select)</label>
                  {purchasedBooks.length === 0 ? (
                    <p style={{ color: '#ef4444', fontSize: '14px' }}>
                      You have no purchased books. Purchase books first to query them.
                    </p>
                  ) : (
                    <div style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #ddd', padding: '10px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {purchasedBooks.map((book) => (
                        <label key={book.bookId} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer', fontSize: '14px', padding: '4px', borderBottom: '1px solid #eee' }}>
                          <input
                            type="checkbox"
                            checked={selectedBookIds.includes(book.bookId)}
                            onChange={() => toggleBookSelection(book.bookId)}
                            style={{ width: 'auto' }}
                          />
                          {book.coverUrl ? (
                            <img src={book.coverUrl} alt={book.title} style={{ width: '30px', height: '42px', objectFit: 'cover', border: '1px solid #ddd' }} />
                          ) : (
                            <div style={{ width: '30px', height: '42px', background: '#eee', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '8px', color: '#999' }}>No Cover</div>
                          )}
                          <span style={{ flex: 1 }}>{book.title}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '16px' }}>
                <Button type="button" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" disabled={chatType === 'BOOK_CHAT' && purchasedBooks.length === 0}>Create Chat</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
