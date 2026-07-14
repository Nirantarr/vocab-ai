const express = require('express');
const mongoose = require('mongoose');
const config = require('./config/env');
const { corsMiddleware, corsErrorHandler } = require('./middleware/corsMiddleware');
const authRoutes = require('./routes/authRoutes');
const wordRoutes = require('./routes/wordRoutes');
const analyzeRoutes = require('./routes/analyzeRoutes');
const userWordRoutes = require('./routes/userWordRoutes');
const testRoutes = require('./routes/testRoutes');
const translateRoutes = require('./routes/translateRoutes');
const { globalApiRateLimit } = require('./middleware/rateLimitMiddleware');

const app = express();
app.use(corsMiddleware);
app.use(express.json());
app.use('/api', globalApiRateLimit);
app.use('/api/auth', authRoutes);
app.use('/', authRoutes);
app.use('/api/word', wordRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/user', userWordRoutes);
app.use('/api/test', testRoutes);
app.use('/api/translate', translateRoutes);

app.get('/', (_req, res) => {
  res.status(200).send('API is running');
});

app.use(corsErrorHandler);

const connectDatabase = async () => {
  await mongoose.connect(config.mongoUri);
  console.log('MongoDB connected successfully');
};

const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(config.port, () => {
      console.log(`Server is running on port ${config.port}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
