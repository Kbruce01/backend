const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors()); // allow react to call this 
app.use(express.json());


// Mysql connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,     // e.g., 'localhost'
    user: process.env.DB_USER,     // e.g., 'root'
    password: process.env.DB_PASSWORD, // your MySQL password
    database: process.env.DB_NAME 
});

// Testing my connection
db.connect((err) => {
  if (err) {
    console.error('MySQL Connection Failed', err);
    return;
  }
  console.log('Connected to MySQL Database')
})

// Test route
app.get('/', (req, res) => {
  res.json({ message: 'Task Manager API is running!' });
});


// the post/login endpoint
app.post('/login', (req, res) => {
  const {email, password} = req.body;

  if (!email || !password) {
    return res.status(400).json({message: 'All fields are required'});
  }

  const findUser = 'SELECT * FROM users WHERE email = ?';
  db.query(findUser, [email], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({message: 'Database error'});
    }

    // checking if user was found
    if (results.length === 0) {
      return res.status(404).json({message: 'Email not found'});
    }

    // user was found here
    const user = results[0];
    console.log('User Found:', user.username);

    // Comparing the password sent to the hashed password in my database
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error('Error comparing passwords:', err);
        return res.status(500).json({message: 'Server error'});
      }

      if (!isMatch) {
        return res.status(400).json({message: 'Invalid email or password'});
      }

      // If we get here, password is correct!
      console.log('Password correct, login successful!');
      
      // JWT token
      const token = jwt.sign({
        id: user.id, 
        username: user.username, 
        email: user.email
      }, process.env.JWT_SECRET, {
        expiresIn: '2h'
      });

      // successful response
      res.json({
        message: 'Login Successful',
        token: token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    });
  });
});

// GET /tasks Get all tasks for logged-in user
app.get('/tasks', verifyToken, (req, res) => {
  const getTasks = 'SELECT * FROM tasks WHERE user_id = ? ORDER BY created_at DESC';

  db.query(getTasks, [req.user.id], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error' });
    }
    res.json(results);
  });
});

// POST /tasks Create new task
app.post('/tasks', verifyToken, (req, res) => {
  const { title, description } = req.body;
  
  if (!title) {
    return res.status(400).json({ message: 'Title is required' });
  }

  const insertTask = 'INSERT INTO tasks (user_id, title, description) VALUES (?, ?, ?)';
  db.query(insertTask, [req.user.id, title, description], (err, result) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({message: 'Database error'});
    }

    const getCreatedTask = 'SELECT * FROM tasks WHERE id = ?';
    db.query(getCreatedTask, [result.insertId], (err, taskResults) => {
      if (err) {
        console.error('Error retrieving created task:', err);
        return res.status(500).json({ message: 'Error retrieving created task' });
      }
      res.status(201).json({
        message: 'Task Created Successfully',
        task: taskResults[0]
      });
    });
  });
});

// PUT /tasks/:id - Update task
app.put('/tasks/:id', verifyToken, (req, res) => {
  const taskId = req.params.id;
  const { title, description, completed } = req.body;

  // First check if task exists and belongs to user
  const checkTask = 'SELECT * FROM tasks WHERE id = ? AND user_id = ?';
  db.query(checkTask, [taskId, req.user.id], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Task exists and belongs to user - now update it
    const currentTask = results[0];
    const updateTask = 'UPDATE tasks SET title = ?, description = ?, completed = ? WHERE id = ?';
    
    db.query(updateTask, [
      title !== undefined ? title : currentTask.title,
      description !== undefined ? description : currentTask.description,
      completed !== undefined ? completed : currentTask.completed,
      taskId
    ], (err) => {
      if (err) {
        console.error('Error updating task:', err);
        return res.status(500).json({ message: 'Error updating task' });
      }

      // Get the updated task to return
      const getUpdatedTask = 'SELECT * FROM tasks WHERE id = ?';
      db.query(getUpdatedTask, [taskId], (err, results) => {
        if (err) {
          console.error('Error retrieving updated task:', err);
          return res.status(500).json({ message: 'Error retrieving updated task' });
        }

        res.json({
          message: 'Task updated successfully',
          task: results[0]
        });
      });
    });
  });
});

// DELETE /tasks/:id - Delete task
app.delete('/tasks/:id', verifyToken, (req, res) => {
  const taskId = req.params.id;

  // First check if task exists and belongs to user
  const checkTask = 'SELECT * FROM tasks WHERE id = ? AND user_id = ?';
  db.query(checkTask, [taskId, req.user.id], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (results.length === 0) {
      return res.status(404).json({ message: 'Task not found' });
    }

    // Task exists and belongs to user - now delete it
    const deleteTask = 'DELETE FROM tasks WHERE id = ?';
    db.query(deleteTask, [taskId], (err) => {
      if (err) {
        console.error('Error deleting task:', err);
        return res.status(500).json({ message: 'Error deleting task' });
      }

      res.json({ message: 'Task deleted successfully' });
    });
  });
});

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});