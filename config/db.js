const mongoose = require('mongoose');

const connectDB = async () => {
    try {
        const db = await mongoose.connect('mongodb+srv://iashneel:vikVD7Pb4dsXNKiE@powerwaves.xro9f.mongodb.net/powerwaves?retryWrites=true&w=majority&appName=powerwaves', {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useFindAndModify: false
        });
        console.log('MongoDB connected to database:', db.connection.name);
    } catch (error) {
        console.error('MongoDB connection error:', error);
        process.exit(1);
    }
};

module.exports = connectDB;