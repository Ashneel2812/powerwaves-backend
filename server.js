const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const connectDB = require('./config/db');
const userRoutes = require('./routes/userRoutes');
const productRoutes = require('./routes/productRoutes');
const adminRoutes = require('./routes/adminRoutes');
const path = require('path'); // Add this line to import the path module
const orderRoutes = require('./routes/orderRoutes'); // Import the order routes


const app = express();
connectDB();

app.use(cors());
app.use(bodyParser.json({ limit: '10mb' }));


app.use('/uploads', (req, res, next) => {
    console.log('Request received for:', req.url);
    next();  // Proceed to static file handler
});

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));app.use('/api/users', userRoutes);
app.use('/api/products', productRoutes);
app.use('/api/admin',adminRoutes );
app.use('/api/orders', orderRoutes);
// In app.js or server.js
const paymentRoutes = require('./routes/payments');
app.use('/api/payments', paymentRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});