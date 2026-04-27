import React, { useEffect, useState } from "react";
import axios from "axios";
import ChatWidget from "./components/ChatWidget";
import "./App.css";

const API_URL = "http://localhost:5000/api/items";

function formatDate(dateValue) {
  if (!dateValue) {
    return "Unknown date";
  }

  return new Date(dateValue).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function App() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [formError, setFormError] = useState("");
  const [pageError, setPageError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const fetchItems = async () => {
    try {
      const response = await axios.get(API_URL);
      setItems(response.data);
      setPageError("");
    } catch (error) {
      setPageError("Could not load items right now.");
      console.error("Error fetching items:", error);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const resetForm = () => {
    setName("");
    setCategory("");
    setDescription("");
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setFormError("");

    const payload = {
      name: name.trim(),
      category: category.trim() || "General",
      description: description.trim(),
    };

    try {
      if (editingId) {
        await axios.put(`${API_URL}/${editingId}`, payload);
      } else {
        await axios.post(API_URL, payload);
      }

      resetForm();
      await fetchItems();
    } catch (error) {
      setFormError("Could not save the item. Please check your input and try again.");
      console.error("Error saving item:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleEdit = (item) => {
    setName(item.name);
    setCategory(item.category || "General");
    setDescription(item.description || "");
    setEditingId(item._id);
    setFormError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (id) => {
    try {
      await axios.delete(`${API_URL}/${id}/hard`);
      await fetchItems();

      if (editingId === id) {
        resetForm();
      }
    } catch (error) {
      setPageError("Could not delete the item right now.");
      console.error("Error deleting item:", error);
    }
  };

  const uniqueCategories = [...new Set(items.map((item) => item.category || "General"))];
  const oldestItem = items[0];
  const newestItem = items[items.length - 1];

  return (
    <div className="app-shell">
      <main className="app-layout">
        <section className="hero-panel">
          <p className="hero-panel__eyebrow">CMSC 129 Laboratory 3</p>
          <div className="hero-panel__content">
            <div className="hero-panel__copy">
              <h1>Provincial Book Store</h1>
              <p>
                Manage store records on the page, then ask the floating chatbot
                to summarize, count, compare, or search them using natural language.
              </p>
              <div className="hero-stats">
                <article>
                  <span>Total items</span>
                  <strong>{items.length}</strong>
                </article>
                <article>
                  <span>Categories</span>
                  <strong>{uniqueCategories.length}</strong>
                </article>
                <article>
                  <span>Oldest entry</span>
                  <strong>{oldestItem ? oldestItem.name : "None yet"}</strong>
                </article>
              </div>
            </div>
          </div>
        </section>

        <section className="dashboard-grid">
          <article className="panel">
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">Item Form</p>
                <h2>{editingId ? "Update item" : "Add a new item"}</h2>
              </div>
              {editingId ? (
                <button type="button" className="ghost-button" onClick={resetForm}>
                  Cancel edit
                </button>
              ) : null}
            </div>

            <form className="item-form" onSubmit={handleSubmit}>
              <label>
                <span>Item name</span>
                <input
                  type="text"
                  value={name}
                  onChange={(event) => setName(event.target.value)}
                  placeholder="Example: Graph notebook"
                  required
                />
              </label>

              <label>
                <span>Category</span>
                <input
                  type="text"
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                  placeholder="Example: School"
                />
              </label>

              <label>
                <span>Description</span>
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Add a short description for your item."
                  rows={4}
                />
              </label>

              {formError ? <p className="form-error">{formError}</p> : null}

              <button type="submit" className="primary-button" disabled={isSaving}>
                {isSaving
                  ? "Saving..."
                  : editingId
                    ? "Save changes"
                    : "Create item"}
              </button>
            </form>
          </article>

          <article className="panel panel--highlight">
            <div className="panel__header">
              <div>
                <p className="panel__eyebrow">Chat Ideas</p>
                <h2>Questions you can demo</h2>
              </div>
            </div>

            <div className="query-list">
              <p>Try at least five inquiry styles with the chatbot:</p>
              <ul>
                <li>What items do I have right now?</li>
                <li>How many categories are represented?</li>
                <li>What is the oldest item in the list?</li>
                <li>Show me the items in the General category.</li>
                <li>Which items mention school, office, or study work?</li>
              </ul>
            </div>

            <div className="insight-card">
              <span>Newest entry</span>
              <strong>{newestItem ? newestItem.name : "Nothing yet"}</strong>
              <p>
                {newestItem
                  ? `Added on ${formatDate(newestItem.createdAt)}`
                  : "Create a few records or run the seed script to populate the chatbot."}
              </p>
            </div>
          </article>
        </section>

        <section className="panel">
          <div className="panel__header">
            <div>
              <p className="panel__eyebrow">Item Library</p>
              <h2>Current records</h2>
            </div>
            <button type="button" className="ghost-button" onClick={fetchItems}>
              Refresh
            </button>
          </div>

          {pageError ? <p className="form-error">{pageError}</p> : null}

          {items.length === 0 ? (
            <div className="empty-state">
              <h3>No items yet</h3>
              <p>
                Add records manually or run the seed script so the Gemini
                chatbot has data to discuss.
              </p>
            </div>
          ) : (
            <div className="item-list">
              {items.map((item) => (
                <article key={item._id} className="item-row">
                  <div className="item-row__main">
                    <div className="item-row__title">
                      <h3>{item.name}</h3>
                      <span className="item-row__category">{item.category || "General"}</span>
                    </div>
                    <p>{item.description || "No description provided."}</p>
                  </div>

                  <div className="item-row__meta">
                    <span>{formatDate(item.createdAt)}</span>
                  </div>

                  <div className="item-row__actions">
                    <button
                      type="button"
                      className="ghost-button"
                      onClick={() => handleEdit(item)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => handleDelete(item._id)}
                    >
                      Delete
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </main>

      <ChatWidget onItemsChanged={fetchItems} />
    </div>
  );
}

export default App;
