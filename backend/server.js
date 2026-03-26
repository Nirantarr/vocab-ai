const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const authRoutes = require('./routes/authRoutes');
const wordRoutes = require('./routes/wordRoutes');
const analyzeRoutes = require('./routes/analyzeRoutes');
const userWordRoutes = require('./routes/userWordRoutes');
const testRoutes = require('./routes/testRoutes');

dotenv.config();

const app = express();

const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI;

app.use(cors());
app.use(express.json());
app.use('/', authRoutes);
app.use('/api/word', wordRoutes);
app.use('/api/analyze', analyzeRoutes);
app.use('/api/user', userWordRoutes);
app.use('/api/test', testRoutes);

app.get('/', (_req, res) => {
  res.status(200).send('API is running');
});

const connectDatabase = async () => {
  if (!MONGODB_URI) {
    throw new Error('Missing MongoDB connection string. Set MONGODB_URI in your environment.');
  }

  await mongoose.connect(MONGODB_URI);
  console.log('MongoDB connected successfully');
};

const startServer = async () => {
  try {
    await connectDatabase();

    app.listen(PORT, () => {
      console.log(`Server is running on port ${PORT}`);
    });
  } catch (error) {
    console.error('Failed to start server:', error.message);
    process.exit(1);
  }
};

startServer();
