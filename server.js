require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const adminRoutes = require('./routes/adminRoutes');
const path = require('path');
const orderRoutes = require('./routes/orderRoutes');
const webhookRoutes = require('./routes/webhookRoutes');
const paymentRoutes = require('./routes/payments');
const AWS = require('aws-sdk');

const PORT = process.env.PORT || 5000;

AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: process.env.AWS_REGION
});
  
const s3 = new AWS.S3();

const app = express();
connectDB();

// Configure middleware
app.use(cors());

// Important: Configure body parser AFTER webhook route
// This ensures raw body is available for webhook signature verification
app.use('/api/webhook', webhookRoutes);

// Configure body parser for other routes
app.use(bodyParser.json({ limit: '150mb' }));

// Static file serving
app.use('/uploads', (req, res, next) => {
    console.log('Request received for:', req.url);
    next();
});
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API routes
app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});