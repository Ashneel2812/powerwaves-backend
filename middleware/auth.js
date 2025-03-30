require('dotenv').config();

const jwt = require('jsonwebtoken');

const authAdmin = (req, res, next) => {
    // Retrieve the token from the Authorization header
    const token = req.headers.authorization?.split(' ')[1]; // Assuming the token is sent as "Bearer <token>"
    
    if (!token) {
        return res.status(401).json({ message: 'No token provided, please log in.' });
    }

    try {
        // Verify and decode the token
        const decoded = jwt.verify(token, process.env.JWT_SECRET); // Use your actual secret
        // Check if the user role is 'admin'
        if (decoded.buyerSeller !== 'Admin') {
            return res.status(403).json({ message: 'Access denied. Admins only.' });
        }
        // If valid, attach the decoded user info to the request object
        req.user = decoded;
        next(); // Proceed to the next middleware or route handler
    } catch (error) {
        console.error('Token verification error:', error);
        return res.status(401).json({ message: 'Invalid token, please log in again.' });
    }
};

module.exports = authAdmin;