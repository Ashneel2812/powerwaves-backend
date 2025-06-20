const express = require('express');
const authAdmin = require('../middleware/auth')
const { getPendingProducts, approveProduct, rejectProduct, getDashboardData,getAllOrders, getAllUsers, getMarketplaceProducts, getStoreProducts, completeOrder, viewDetails,updatePlan, completeTransaction, getAllSellers,deleteUser, getSubscribers } = require('../controllers/adminController'); // Import the new function
const router = express.Router();

// Route to get products with workflow_state "Pending"

router.use(authAdmin);

router.get('/pending', getPendingProducts); // Use GET method to fetch pending products
router.post('/approve/:productId', approveProduct);
router.post('/reject/:productId', rejectProduct);
router.get('/stats',getDashboardData)
router.get('/orders', getAllOrders);
router.get('/users', getAllUsers);
router.get('/sellers', getAllSellers);
router.get('/marketplace-products', getMarketplaceProducts);
router.get('/store-products', getStoreProducts);
router.put('/orders/:orderId/complete', completeOrder);
router.get('/orders/:orderId/details', viewDetails);
router.post('/pricing/update', updatePlan);
router.post('/completeTransaction/:userId', completeTransaction);
router.delete('/users/:userId', deleteUser);
router.get('/get-subscribers', getSubscribers);

module.exports = router;