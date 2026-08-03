const express = require('express');
const cors = require('cors');

const userRoutes = require('./routes/users');
const taskRoutes = require('./routes/tasks');
const eventRoutes = require('./routes/events');
const webhookRoutes = require('./routes/webhooks');
const choreRoutes = require('./routes/chores');
const academicRoutes = require('./routes/academic');
const sleepRoutes = require('./routes/sleep');
const notificationRoutes = require('./routes/notifications');

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/webhooks', webhookRoutes);
app.use('/api/chores', choreRoutes);
app.use('/api/academic', academicRoutes);
app.use('/api/sleep', sleepRoutes);
app.use('/api/notifications', notificationRoutes);

// Global 404 handler
app.use((req, res, next) => {
  res.status(404).json({ error: 'Route not found' });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: err.message || 'Internal Server Error' });
});

module.exports = app;
