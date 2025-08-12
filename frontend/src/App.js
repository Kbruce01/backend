import React, { useState, useEffect } from 'react';
import './App.css';

// API base URL
const API_URL = 'http://localhost:3001';

function App() {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [currentView, setCurrentView] = useState('login');
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [newTask, setNewTask] = useState({ title: '', description: '' });
  const [editingTask, setEditingTask] = useState(null);

  // Auth forms state
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [registerForm, setRegisterForm] = useState({ username: '', email: '', password: '' });

  // Check if user is logged in on app load
  useEffect(() => {
    if (token) {
      fetchTasks();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // Make authenticated API requests
  const makeAuthenticatedRequest = async (url, options = {}) => {
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    return fetch(url, {
      ...options,
      headers,
    });
  };

  // Login function
  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Save token and user data
      localStorage.setItem('token', data.token);
      setToken(data.token);
      setUser(data.user);
      setLoginForm({ email: '', password: '' });
      setCurrentView('tasks');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Register function
  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await fetch(`${API_URL}/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(registerForm),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Registration failed');
      }

      setRegisterForm({ username: '', email: '', password: '' });
      setCurrentView('login');
      setError('Registration successful! Please login.');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Logout function
  const handleLogout = () => {
    localStorage.removeItem('token');
    setToken(null);
    setUser(null);
    setTasks([]);
    setCurrentView('login');
  };

  // Fetch all tasks
  const fetchTasks = async () => {
    setLoading(true);
    setError('');
    try {
      const response = await makeAuthenticatedRequest(`${API_URL}/tasks`);
      
      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          return;
        }
        throw new Error('Failed to fetch tasks');
      }
      
      const data = await response.json();
      setTasks(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Create new task
  const createTask = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    try {
      const response = await makeAuthenticatedRequest(`${API_URL}/tasks`, {
        method: 'POST',
        body: JSON.stringify(newTask),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          return;
        }
        const data = await response.json();
        throw new Error(data.message || 'Failed to create task');
      }

      setNewTask({ title: '', description: '' });
      fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  // Delete task
  const deleteTask = async (id) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await makeAuthenticatedRequest(`${API_URL}/tasks/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          return;
        }
        throw new Error('Failed to delete task');
      }

      fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  // Update task
  const updateTask = async (id, updatedTask) => {
    try {
      const response = await makeAuthenticatedRequest(`${API_URL}/tasks/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedTask),
      });

      if (!response.ok) {
        if (response.status === 401) {
          handleLogout();
          return;
        }
        throw new Error('Failed to update task');
      }

      setEditingTask(null);
      fetchTasks();
    } catch (err) {
      setError(err.message);
    }
  };

  // If user is logged in, show the task manager
  if (token && currentView === 'tasks') {
    return (
      <div className="app">
        <header className="app-header">
          <div className="header-content">
            <div>
              <h1>Task Manager</h1>
              <p>Welcome back, {user?.username || 'User'}!</p>
            </div>
            <button onClick={handleLogout} className="btn btn-logout">
              Logout
            </button>
          </div>
        </header>

        <main className="app-main">
          {/* Add New Task Form */}
          <section className="task-form-section">
            <h2>Add New Task</h2>
            <form onSubmit={createTask} className="task-form">
              <div className="form-group">
                <input
                  type="text"
                  placeholder="Task title"
                  value={newTask.title}
                  onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
                  className="form-input"
                  required
                />
              </div>
              <div className="form-group">
                <textarea
                  placeholder="Task description (optional)"
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="form-textarea"
                  rows="3"
                />
              </div>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Adding...' : 'Add Task'}
              </button>
            </form>
          </section>

          {/* Error Message */}
          {error && (
            <div className="error-message">
              <p>❌ {error}</p>
            </div>
          )}

          {/* Tasks List */}
          <section className="tasks-section">
            <div className="tasks-header">
              <h2>Your Tasks ({tasks.length})</h2>
              <button onClick={fetchTasks} className="btn btn-secondary" disabled={loading}>
                {loading ? 'Loading...' : 'Refresh'}
              </button>
            </div>

            {loading ? (
              <div className="loading">
                <p>Loading tasks...</p>
              </div>
            ) : tasks.length === 0 ? (
              <div className="empty-state">
                <p>No tasks yet. Add your first task above!</p>
              </div>
            ) : (
              <div className="tasks-grid">
                {tasks.map((task) => (
                  <TaskCard
                    key={task.id}
                    task={task}
                    onDelete={deleteTask}
                    onEdit={setEditingTask}
                    onUpdate={updateTask}
                    isEditing={editingTask?.id === task.id}
                  />
                ))}
              </div>
            )}
          </section>
        </main>
      </div>
    );
  }

  // Authentication forms
  return (
    <div className="app auth-app">
      <div className="auth-container">
        <div className="auth-header">
          <h1>Task Manager</h1>
          <p>Manage your tasks securely</p>
        </div>

        {/* Toggle between login and register */}
        <div className="auth-tabs">
          <button
            className={`tab-button ${currentView === 'login' ? 'active' : ''}`}
            onClick={() => setCurrentView('login')}
          >
            Login
          </button>
          <button
            className={`tab-button ${currentView === 'register' ? 'active' : ''}`}
            onClick={() => setCurrentView('register')}
          >
            Register
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {/* Login Form */}
        {currentView === 'login' && (
          <form onSubmit={handleLogin} className="auth-form">
            <div className="form-group">
              <input
                type="email"
                placeholder="Email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                placeholder="Password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                className="form-input"
                required
              />
            </div>

            <div className="forgot-password-link">Forgot Password</div>
            
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Logging in...' : 'Login'}
            </button>
          </form>
        )}

        {/* Register Form */}
        {currentView === 'register' && (
          <form onSubmit={handleRegister} className="auth-form">
            <div className="form-group">
              <input
                type="text"
                placeholder="Username"
                value={registerForm.username}
                onChange={(e) => setRegisterForm({ ...registerForm, username: e.target.value })}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <input
                type="email"
                placeholder="Email"
                value={registerForm.email}
                onChange={(e) => setRegisterForm({ ...registerForm, email: e.target.value })}
                className="form-input"
                required
              />
            </div>
            <div className="form-group">
              <input
                type="password"
                placeholder="Password (min 8 characters)"
                value={registerForm.password}
                onChange={(e) => setRegisterForm({ ...registerForm, password: e.target.value })}
                className="form-input"
                required
                minLength="8"
              />
            </div>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Creating Account...' : 'Register'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}


// Task Card Component (same as before)
function TaskCard({ task, onDelete, onEdit, onUpdate, isEditing }) {
  const [editForm, setEditForm] = useState({
    title: task.title,
    description: task.description || '',
  });

  const handleUpdate = (e) => {
    e.preventDefault();
    if (!editForm.title.trim()) return;
    onUpdate(task.id, editForm);
  };

  const handleCancel = () => {
    setEditForm({ title: task.title, description: task.description || '' });
    onEdit(null);
  };

  if (isEditing) {
    return (
      <div className="task-card editing">
        <form onSubmit={handleUpdate} className="edit-form">
          <input
            type="text"
            value={editForm.title}
            onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
            className="form-input"
            required
          />
          <textarea
            value={editForm.description}
            onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
            className="form-textarea"
            rows="2"
          />
          <div className="edit-actions">
            <button type="submit" className="btn btn-success">
              Save
            </button>
            <button type="button" onClick={handleCancel} className="btn btn-secondary">
              Cancel
            </button>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="task-card">
      <div className="task-content">
        <h3 className="task-title">{task.title}</h3>
        {task.description && (
          <p className="task-description">{task.description}</p>
        )}
        <div className="task-meta">
          <span className="task-id">ID: {task.id}</span>
          {task.created_at && (
            <span className="task-date">
              Created: {new Date(task.created_at).toLocaleDateString()}
            </span>
          )}
        </div>
      </div>
      <div className="task-actions">
        <button
          onClick={() => onEdit(task)}
          className="btn btn-edit"
          title="Edit task"
        >
          ✏️
        </button>
        <button
          onClick={() => onDelete(task.id)}
          className="btn btn-delete"
          title="Delete task"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}

export default App;