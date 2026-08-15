import { useEffect, useState } from "react";
import { Link, Route, Routes, useNavigate, useParams } from "react-router-dom";
import api from "./api";

function getUser() {
  try { return JSON.parse(localStorage.getItem("blog_user")) || null; }
  catch { return null; }
}

function Layout({ children }) {
  const [user, setUser] = useState(getUser());
  const navigate = useNavigate();

  function logout() {
    localStorage.removeItem("blog_token");
    localStorage.removeItem("blog_user");
    setUser(null);
    navigate("/");
  }

  return (
    <>
      <header className="navbar">
        <Link className="brand" to="/">InkSpace</Link>
        <nav>
          <Link to="/">Home</Link>
          {user ? (
            <>
              <Link to="/create">Write</Link>
              <span className="welcome">Hi, {user.name}</span>
              <button className="ghost-btn" onClick={logout}>Logout</button>
            </>
          ) : (
            <>
              <Link to="/login">Login</Link>
              <Link className="nav-cta" to="/register">Get Started</Link>
            </>
          )}
        </nav>
      </header>
      <main>{children}</main>
      <footer>© 2026 InkSpace · A full-stack blog platform</footer>
    </>
  );
}

function Home() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/posts").then(r => setPosts(r.data)).finally(() => setLoading(false));
  }, []);

  return (
    <section className="container">
      <div className="hero">
        <p className="eyebrow">WRITE · SHARE · DISCUSS</p>
        <h1>Ideas deserve a place<br />to be heard.</h1>
        <p className="hero-copy">Publish your thoughts, discover new perspectives, and join the conversation.</p>
        <Link className="primary-btn" to="/create">Start writing →</Link>
      </div>

      <div className="section-head">
        <div>
          <p className="eyebrow">LATEST STORIES</p>
          <h2>From the community</h2>
        </div>
      </div>

      {loading ? <p>Loading posts...</p> : posts.length === 0 ? (
        <div className="empty"><h3>No posts yet</h3><p>Be the first person to publish a story.</p></div>
      ) : (
        <div className="post-grid">
          {posts.map(post => (
            <Link className="post-card" to={`/posts/${post.id}`} key={post.id}>
              <div className="card-meta">BY {post.author_name.toUpperCase()}</div>
              <h3>{post.title}</h3>
              <p>{post.content.length > 150 ? post.content.slice(0, 150) + "…" : post.content}</p>
              <div className="card-bottom">
                <span>{new Date(post.created_at).toLocaleDateString()}</span>
                <span>💬 {post.comment_count}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

function Auth({ mode }) {
  const isLogin = mode === "login";
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");

  async function submit(e) {
    e.preventDefault();
    setError("");
    try {
      const endpoint = isLogin ? "/auth/login" : "/auth/register";
      const { data } = await api.post(endpoint, form);
      localStorage.setItem("blog_token", data.token);
      localStorage.setItem("blog_user", JSON.stringify(data.user));
      navigate("/");
      window.location.reload();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong");
    }
  }

  return (
    <section className="auth-page">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">{isLogin ? "WELCOME BACK" : "JOIN INKSPACE"}</p>
        <h1>{isLogin ? "Sign in" : "Create your account"}</h1>
        <p className="muted">{isLogin ? "Continue sharing your ideas." : "Start publishing your stories today."}</p>
        {!isLogin && <input placeholder="Full name" value={form.name} onChange={e => setForm({...form, name:e.target.value})} required />}
        <input type="email" placeholder="Email address" value={form.email} onChange={e => setForm({...form, email:e.target.value})} required />
        <input type="password" placeholder="Password (6+ characters)" value={form.password} onChange={e => setForm({...form, password:e.target.value})} required minLength="6" />
        {error && <div className="error">{error}</div>}
        <button className="primary-btn wide">{isLogin ? "Sign in" : "Create account"}</button>
        <p className="switch">{isLogin ? "New here?" : "Already have an account?"} <Link to={isLogin ? "/register" : "/login"}>{isLogin ? "Create an account" : "Sign in"}</Link></p>
      </form>
    </section>
  );
}

function Editor() {
  const [form, setForm] = useState({ title: "", content: "" });
  const [error, setError] = useState("");
  const navigate = useNavigate();

  async function submit(e) {
    e.preventDefault();
    try {
      const { data } = await api.post("/posts", form);
      navigate(`/posts/${data.id}`);
    } catch (err) {
      setError(err.response?.data?.message || "Please log in to create a post.");
    }
  }

  if (!getUser()) return <section className="container narrow"><div className="empty"><h2>Please log in</h2><Link className="primary-btn" to="/login">Login</Link></div></section>;

  return (
    <section className="container narrow">
      <div className="editor-head"><p className="eyebrow">NEW STORY</p><h1>Write something worth reading.</h1></div>
      <form className="editor" onSubmit={submit}>
        <input className="title-input" placeholder="Your title..." value={form.title} onChange={e => setForm({...form,title:e.target.value})} required />
        <textarea placeholder="Tell your story..." rows="15" value={form.content} onChange={e => setForm({...form,content:e.target.value})} required />
        {error && <div className="error">{error}</div>}
        <button className="primary-btn">Publish story →</button>
      </form>
    </section>
  );
}

function PostDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comment, setComment] = useState("");
  const [error, setError] = useState("");

  async function load() {
    const { data } = await api.get(`/posts/${id}`);
    setPost(data);
  }

  useEffect(() => { load().catch(() => setError("Post not found")); }, [id]);

  async function addComment(e) {
    e.preventDefault();
    if (!getUser()) return navigate("/login");
    try {
      await api.post(`/posts/${id}/comments`, { content: comment });
      setComment("");
      load();
    } catch (err) { setError(err.response?.data?.message || "Could not add comment"); }
  }

  async function deletePost() {
    if (!confirm("Delete this post?")) return;
    await api.delete(`/posts/${id}`);
    navigate("/");
  }

  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ title: "", content: "" });

  function startEdit() {
    setEditForm({ title: post.title, content: post.content });
    setEditing(true);
  }

  function cancelEdit() {
    setEditing(false);
    setEditForm({ title: "", content: "" });
  }

  async function saveEdit(e) {
    e.preventDefault();
    try {
      await api.put(`/posts/${id}`, editForm);
      await load();
      setEditing(false);
    } catch (err) {
      setError(err.response?.data?.message || "Could not save changes");
    }
  }

  async function deleteComment(commentId) {
    await api.delete(`/comments/${commentId}`);
    load();
  }

  if (error && !post) return <section className="container"><div className="empty"><h2>{error}</h2><Link to="/">Back home</Link></div></section>;
  if (!post) return <section className="container"><p>Loading...</p></section>;

  const user = getUser();

  return (
    <section className="container article-layout">
      <article className="article">
        <Link className="back" to="/">← All stories</Link>
        <p className="eyebrow">BY {post.author_name.toUpperCase()}</p>
        {!editing ? (
          <>
            <h1>{post.title}</h1>
            <p className="article-date">{new Date(post.created_at).toLocaleString()}</p>
            <div className="article-content">{post.content.split("\n").map((p,i) => <p key={i}>{p}</p>)}</div>
            {user?.id === post.author_id && (
              <div className="article-actions">
                <button className="ghost-btn" onClick={startEdit}>Edit post</button>
                <button className="danger-btn" onClick={deletePost}>Delete post</button>
              </div>
            )}
          </>
        ) : (
          <form className="editor" onSubmit={saveEdit}>
            <input className="title-input" placeholder="Your title..." value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} required />
            <textarea placeholder="Tell your story..." rows="12" value={editForm.content} onChange={e => setEditForm({...editForm, content: e.target.value})} required />
            {error && <div className="error">{error}</div>}
            <div style={{display: 'flex', gap: '10px', marginTop: 12}}>
              <button className="primary-btn" type="submit">Save changes</button>
              <button type="button" className="ghost-btn" onClick={cancelEdit}>Cancel</button>
            </div>
          </form>
        )}
      </article>

      <section className="comments">
        <div className="section-head"><div><p className="eyebrow">JOIN THE DISCUSSION</p><h2>Comments ({post.comments.length})</h2></div></div>
        <form className="comment-form" onSubmit={addComment}>
          <textarea rows="4" placeholder={user ? "Share your thoughts..." : "Log in to leave a comment"} value={comment} onChange={e => setComment(e.target.value)} disabled={!user} required />
          <button className="primary-btn" disabled={!user}>Post comment</button>
        </form>
        {error && <div className="error">{error}</div>}
        <div className="comment-list">
          {post.comments.map(c => (
            <div className="comment" key={c.id}>
              <div className="comment-top"><strong>{c.author_name}</strong><span>{new Date(c.created_at).toLocaleDateString()}</span></div>
              <p>{c.content}</p>
              {user?.id === c.author_id && <button className="small-delete" onClick={() => deleteComment(c.id)}>Delete</button>}
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Auth mode="login" />} />
        <Route path="/register" element={<Auth mode="register" />} />
        <Route path="/create" element={<Editor />} />
        <Route path="/posts/:id" element={<PostDetail />} />
      </Routes>
    </Layout>
  );
}
