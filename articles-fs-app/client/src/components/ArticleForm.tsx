import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createArticle } from "../api";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
export default function ArticleForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nav = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);

  useEffect(() => {
    if (isEditMode) {
      fetch(`/api/articles/${id}`)
        .then((res) => {
          if (!res.ok) {
            throw new Error("Failed to fetch article");
          }
          return res.json();
        })
        .then((data) => {
          setTitle(data.title);
          setContent(data.content);
        })
        .catch((err) => {
          setError(err.message);
        });
    }
  }, [id, isEditMode]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (title.trim().length < 3) {
      setError("Title must be at least 3 characters");
      return;
    }
    if (!content || content.replace(/<[^>]*>/g, "").trim().length === 0) {
      setError("Content is required");
      return;
    }
    setSubmitting(true);
    try {
      if (isEditMode) {
        const res = await fetch(`/api/articles/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ title, content }),
        });
        if (!res.ok) {
          throw new Error("Failed to update article");
        }
        const updated = await res.json();
        nav(`/articles/${updated.id}`);
      } else {
        const created = await createArticle({ title, content });
        nav(`/articles/${created.id}`);
      }
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
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Article title"
        />
      </label>
      <label>
        Content
        <ReactQuill theme="snow" value={content} onChange={setContent} />
      </label>
      {error && <p className="error">{error}</p>}
      <div className="actions">
        <button
          type="submit"
          disabled={submitting}
          className="primary"
          style={{ marginTop: "50px" }}
        >
          {submitting ? "Saving…" : isEditMode ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
}
