const express = require('express');
const { signinUser, loginUser, sendDetails, updateUserPlanAndPrice, checkProductLimit,updateFreeUserPlan, createRazorpayOrder, verifyPaymentAndUpdateUser,upgradePaymentAndUpdateUser,getUserDetails, updateUserDetails,getSellerDetails,getPlan, updateCommissionDetails, subscribers } = require('../controllers/userController');
const router = express.Router();

router.post('/signin', signinUser);
router.post('/login', loginUser);
router.post('/send-details',sendDetails);
router.put('/update-plan-price', updateUserPlanAndPrice);
router.put('/update-free-plan', updateFreeUserPlan);
router.get('/check-product-limit/:email', checkProductLimit);
router.post('/verify-payment',verifyPaymentAndUpdateUser );
router.post('/verify-upgrade-payment',upgradePaymentAndUpdateUser );
router.post('/create-plan', createRazorpayOrder);
router.get('/profile',getUserDetails);
router.put('/profile',updateUserDetails);
router.get('/seller/:sellerId',getSellerDetails);
router.get('/pricing', getPlan);
router.put('/orders/:orderId/commision-details', updateCommissionDetails);
router.post('/subscribers', subscribers);

module.exports = router;