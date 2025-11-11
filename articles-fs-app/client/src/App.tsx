import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, Navigate, Route, Routes, useNavigate } from 'react-router-dom';
import ArticleList from './components/ArticleList';
import ArticleView from './components/ArticleView';
import ArticleForm from './components/ArticleForm';

type Toast = { id: number; message: string };

export default function App() {
  const nav = useNavigate();
  const [notifications, setNotifications] = useState<Toast[]>([]);
  const timers = useRef<Record<number, number>>({});

  const pushNotification = useCallback((notification: Omit<Toast, 'id'>) => {
    const id = Date.now() + Math.random();
    setNotifications((prev) => {
      const next = [...prev, { ...notification, id }];
      const overflow = next.length - 3;
      if (overflow > 0) {
        const removed = next.slice(0, overflow);
        removed.forEach((toast) => {
          if (timers.current[toast.id]) {
            window.clearTimeout(timers.current[toast.id]);
            delete timers.current[toast.id];
          }
        });
      }
      return next.slice(-3);
    });
    timers.current[id] = window.setTimeout(() => {
      setNotifications((current) => current.filter((toast) => toast.id !== id));
      delete timers.current[id];
    }, 5000);
  }, []);

  useEffect(() => {
    let socket: WebSocket | null = null;
    let retryTimer: number | null = null;
    let attempts = 0;

    const connect = () => {
      const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
      const host = import.meta.env.DEV ? 'localhost:4000' : window.location.host;
      socket = new WebSocket(`${protocol}://${host}/ws`);

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          if (payload.type === 'connected') return;
          if (payload.type === 'articleUpdated') {
            pushNotification({
              message: `Edited “${payload.title}”`,
            });
          } else if (payload.type === 'attachmentAdded') {
            pushNotification({
              message: `Attached file to “${payload.title}”`,
            });
          }
        } catch {
          // ignore malformed payloads
        }
      };

      socket.onopen = () => {
        attempts = 0;
      };

      socket.onclose = () => {
        if (retryTimer) {
          window.clearTimeout(retryTimer);
        }
        if (attempts >= 5) return;
        const delay = Math.min(5000, 500 * 2 ** attempts);
        attempts += 1;
        retryTimer = window.setTimeout(connect, delay);
      };

      socket.onerror = () => {
        socket?.close();
      };
    };

    connect();

    return () => {
      if (retryTimer) {
        window.clearTimeout(retryTimer);
      }
      Object.values(timers.current).forEach((timerId) => window.clearTimeout(timerId));
      socket?.close();
    };
  }, [pushNotification]);

  return (
    <>
      <div className="container">
        <header className="topbar">
          <h1>Articles</h1>
          <nav>
            <Link to="/">List</Link>
            <button className="primary" onClick={() => nav('/articles/new')}>
              New Article
            </button>
          </nav>
        </header>

        <main>
          <Routes>
            <Route path="/" element={<ArticleList />} />
            <Route path="/new" element={<Navigate to="/articles/new" replace />} />
            <Route path="/articles/new" element={<ArticleForm />} />
            <Route path="/articles/:id/edit" element={<ArticleForm />} />
            <Route path="/articles/:id" element={<ArticleView />} />
          </Routes>
        </main>
      </div>

      {!!notifications.length && (
        <div className="notification-stack">
          {notifications.map((note) => (
            <div key={note.id} className="notification">
              {note.message}
            </div>
          ))}
        </div>
      )}
    </>
  );
}
