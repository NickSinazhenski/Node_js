import { Link, Route, Routes, useNavigate } from 'react-router-dom';
import ArticleList from './components/ArticleList';
import ArticleView from './components/ArticleView';
import ArticleForm from './components/ArticleForm';

export default function App() {
  const nav = useNavigate();

  return (
    <div className="container">
      <header className="topbar">
        <h1>Articles</h1>
        <nav>
          <Link to="/">List</Link>
          <button className="primary" onClick={() => nav('/new')}>
            New Article
          </button>
        </nav>
      </header>

      <main>
        <Routes>
          <Route path="/" element={<ArticleList />} />
          <Route path="/articles/:id" element={<ArticleView />} />
          <Route path="/new" element={<ArticleForm />} />
        </Routes>
      </main>
    </div>
  );
}