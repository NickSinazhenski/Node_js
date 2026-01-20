import { useState, useEffect, type FormEvent } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createArticle, getArticle, updateArticle } from "../api";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";
import { useWorkspace } from "../workspace-context";
import { useAuth } from "../auth-context";
export default function ArticleForm() {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workspaceId, setWorkspaceId] = useState<string | null>(null);
  const [canEdit, setCanEdit] = useState(true);
  const nav = useNavigate();
  const { id } = useParams();
  const isEditMode = Boolean(id);
  const { currentWorkspaceId, workspaces, loading: wsLoading } = useWorkspace();
  const { user } = useAuth();

  useEffect(() => {
    if (!isEditMode || !id) {
      setWorkspaceId(currentWorkspaceId ?? null);
      return;
    }
    getArticle(id)
      .then((data) => {
        setTitle(data.title);
        setContent(data.content);
        setWorkspaceId(data.workspaceId);
        const allowed = user?.role === "admin" || (data.createdBy && user?.id === data.createdBy);
        setCanEdit(Boolean(allowed));
      })
      .catch((err) => setError(err.message));
  }, [id, isEditMode, currentWorkspaceId, user?.id, user?.role]);

  const onSubmit = async (e: FormEvent) => {
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
    const targetWorkspaceId = workspaceId ?? currentWorkspaceId;
    if (!targetWorkspaceId) {
      setError("Select a workspace first");
      return;
    }
    setSubmitting(true);
    try {
      if (isEditMode && id) {
        if (!canEdit) {
          setError("You do not have permission to edit this article");
          return;
        }
        const updated = await updateArticle(id, { title, content, workspaceId: targetWorkspaceId });
        nav(`/articles/${updated.id}`);
        return;
      }
      const created = await createArticle({ title, content, workspaceId: targetWorkspaceId });
      nav(`/articles/${created.id}`);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isEditMode && wsLoading) {
    return <p>Loading workspaces…</p>;
  }

  if (!isEditMode && !currentWorkspaceId) {
    return <p>Please create or select a workspace before adding an article.</p>;
  }

  if (isEditMode && !canEdit) {
    return <p className="error">You do not have permission to edit this article.</p>;
  }
  return (
    <form className="form" onSubmit={onSubmit}>
      <label>
        Workspace
        <input
          value={workspaces.find((w) => w.id === (workspaceId ?? currentWorkspaceId))?.name ?? "Select a workspace in the header"}
          disabled
        />
      </label>
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
