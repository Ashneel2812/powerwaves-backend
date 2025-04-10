const express = require('express');
const { getMarketProducts, addMarketPlaceProduct, getUserProducts, deleteUserProduct, adminProductList, getProductById, getProductsByCategory,createReview, getReviewById, likeProduct,updateQuantities,updatePrice } = require('../controllers/productController');
const router = express.Router();

router.get('/marketplace', getMarketProducts);
router.post('/addmarketplace', addMarketPlaceProduct); // New route for adding a product
router.get('/getuserproducts', getUserProducts); //done
router.post('/deleteuserproducts',deleteUserProduct); //done
router.get('/adminproducts', adminProductList);
router.get('/product/:id', getProductById);
router.get('/category/:product_category', getProductsByCategory);
router.post('/reviews', createReview);
router.get('/reviews/:product_id', getReviewById);
router.post('/like/:productId', likeProduct);
router.post('/update-quantities', updateQuantities);
router.put('/update-price',updatePrice);
module.exports = router;