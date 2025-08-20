const express = require('express');
const cors = require('cors');
const mysql = require('mysql2');
require('dotenv').config();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const app = express();
const PORT = process.env.PORT || 3001;

// Environment variable validation
const requiredEnvVars = [
  'DB_HOST',
  'DB_USER', 
  'DB_PASSWORD',
  'DB_NAME',
  'JWT_SECRET'
];

requiredEnvVars.forEach(varName => {
  if (!process.env[varName]) {
    console.error(`❌ Missing required environment variable: ${varName}`);
    console.error('Please check your .env file and ensure all required variables are set.');
    process.exit(1);
  }
});

console.log('✅ All required environment variables are set');

// Email configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Email verification and password reset tokens storage
const emailVerificationTokens = new Map();
const passwordResetTokens = new Map();

// Middleware
const cors = require("cors");

app.use(cors({
  origin: "https://task-manager-nine-blue.vercel.app", // ✅ Your actual deployed frontend URL
  credentials: true // ✅ This allows cookies / tokens to be sent
}));


// JWT Token Verification Middleware
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token provided.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ message: 'Invalid token.' });
  }
};

// Input validation middleware
const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Mysql connection
const db = mysql.createConnection({
    host: process.env.DB_HOST,   
    user: process.env.DB_USER,  
    password: process.env.DB_PASSWORD, 
    database: process.env.DB_NAME,
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
  res.json({ message: 'We up and running' });
});

// GET /me - Get current user info
app.get('/me', verifyToken, (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      email: req.user.email
    }
  });
});

// POST /register - User registration endpoint
app.post('/register', (req, res) => {
  const { username, email, password } = req.body;

  // Input validation
  if (!username || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  if (username.length < 3) {
    return res.status(400).json({ message: 'Username must be at least 3 characters long' });
  }

  if (!validateEmail(email)) {
    return res.status(400).json({ message: 'Please provide a valid email address' });
  }

  if (password.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long' });
  }

  // Check if user already exists
  const checkUser = 'SELECT * FROM users WHERE email = ? OR username = ?';
  db.query(checkUser, [email, username], (err, results) => {
    if (err) {
      console.error('Database error:', err);
      return res.status(500).json({ message: 'Database error' });
    }

    if (results.length > 0) {
      return res.status(400).json({ message: 'User with this email or username already exists' });
    }

    // Hash password
    bcrypt.hash(password, 10, (err, hashedPassword) => {
      if (err) {
        console.error('Error hashing password:', err);
        return res.status(500).json({ message: 'Server error' });
      }

      // Insert new user (no email verification required)
      const insertUser = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';
      db.query(insertUser, [username, email, hashedPassword], (err, result) => {
        if (err) {
          console.error('Database error:', err);
          return res.status(500).json({ message: 'Database error' });
        }

        res.status(201).json({
          message: 'User registered successfully! You can now login.',
          user: {
            id: result.insertId,
            username,
            email
          }
        });
      });
    });
  });
});

// Email verification endpoints removed - users can login immediately after registration

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
        expiresIn: '1h'
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

// POST /forgot-password - Request password reset
app.post('/forgot-password', (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: 'Email is required' });
  }

  // Check if password reset columns exist
  const checkColumns = 'SHOW COLUMNS FROM users LIKE "reset_token"';
  db.query(checkColumns, (checkErr, checkResults) => {
    if (checkErr || checkResults.length === 0) {
      return res.status(500).json({ 
        message: 'Password reset functionality is not available. Please contact support.' 
      });
    }

    const findUser = 'SELECT * FROM users WHERE email = ?';
    db.query(findUser, [email], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Database error' });
      }

      if (results.length === 0) {
        // Don't reveal if email exists or not for security
        return res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
      }

      const user = results[0];
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetExpires = new Date(Date.now() + 3600000); // 1 hour from now

      const updateResetToken = 'UPDATE users SET reset_token = ?, reset_token_expires = ? WHERE id = ?';
      db.query(updateResetToken, [resetToken, resetExpires, user.id], (updateErr) => {
        if (updateErr) {
          console.error('Database error:', updateErr);
          return res.status(500).json({ message: 'Database error' });
        }

        const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;
        const mailOptions = {
          from: process.env.EMAIL_USER,
          to: email,
          subject: 'Reset Your Password - Task Manager',
          html: `
            <h2>Password Reset Request</h2>
            <p>You requested a password reset for your Task Manager account.</p>
            <p>Click the link below to reset your password:</p>
            <a href="${resetUrl}" style="background-color: #dc3545; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block; margin: 10px 0;">
              Reset Password
            </a>
            <p>If the button doesn't work, copy and paste this link:</p>
            <p>${resetUrl}</p>
            <p>This link will expire in 1 hour.</p>
            <p>If you didn't request this reset, please ignore this email.</p>
          `
        };

        transporter.sendMail(mailOptions, (emailErr) => {
          if (emailErr) {
            console.error('Email sending error:', emailErr);
            return res.status(500).json({ message: 'Failed to send password reset email' });
          }

          res.json({ message: 'If an account with that email exists, a password reset link has been sent.' });
        });
      });
    });
  });
});

// POST /reset-password - Reset password with token
app.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: 'Token and new password are required' });
  }

  if (newPassword.length < 8) {
    return res.status(400).json({ message: 'Password must be at least 8 characters long' });
  }

  // Check if password reset columns exist
  const checkColumns = 'SHOW COLUMNS FROM users LIKE "password_reset_token"';
  db.query(checkColumns, (checkErr, checkResults) => {
    if (checkErr || checkResults.length === 0) {
      return res.status(500).json({ 
        message: 'Password reset functionality is not available. Please contact support.' 
      });
    }

    const findUser = 'SELECT * FROM users WHERE reset_token = ? AND reset_token_expires > NOW()';
    db.query(findUser, [token], (err, results) => {
      if (err) {
        console.error('Database error:', err);
        return res.status(500).json({ message: 'Database error' });
      }

      if (results.length === 0) {
        return res.status(400).json({ message: 'Invalid or expired reset token' });
      }

      const user = results[0];

      // Hash the new password
      bcrypt.hash(newPassword, 10, (hashErr, hashedPassword) => {
        if (hashErr) {
          console.error('Error hashing password:', hashErr);
          return res.status(500).json({ message: 'Server error' });
        }

        // Update password and clear reset token
        const updatePassword = 'UPDATE users SET password = ?, reset_token = NULL, reset_token_expires = NULL WHERE id = ?';
        db.query(updatePassword, [hashedPassword, user.id], (updateErr) => {
          if (updateErr) {
            console.error('Database error:', updateErr);
            return res.status(500).json({ message: 'Database error' });
          }

          res.json({ message: 'Password reset successfully! You can now login with your new password.' });
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

// timing