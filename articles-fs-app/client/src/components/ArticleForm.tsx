import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createArticle } from '../api';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
export default function ArticleForm() {
const [title, setTitle] = useState('');
const [content, setContent] = useState('');
const [submitting, setSubmitting] = useState(false);
const [error, setError] = useState<string | null>(null);
const nav = useNavigate();
const onSubmit = async (e: React.FormEvent) => {
e.preventDefault();
setError(null);
if (title.trim().length < 3) {
setError('Title must be at least 3 characters');
return;
}
if (!content || content.replace(/<[^>]*>/g, '').trim().length === 0) {
  setError('Content is required');
  return;
}
setSubmitting(true);
try {
const created = await createArticle({ title, content });
nav(`/articles/${created.id}`);
} catch (e: any) {
setError(e.message);
} finally {
setSubmitting(false);
}
};
return (
<form className="form" onSubmit={onSubmit}>
    <label>
Title
<input value={title} onChange={(e) => setTitle(e.target.value)}
placeholder="Article title" />
</label>
<label>
Content
<ReactQuill theme="snow" value={content} onChange={setContent} />
</label>
{error && <p className="error">{error}</p>}
<div className="actions">
<button type="submit" disabled={submitting} className="primary" style={{ marginTop: '50px' }}>
{submitting ? 'Saving…' : 'Create'}
</button>
</div>
</form>
);
}