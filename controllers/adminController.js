const MarketPlace = require('../models/MarketPlace'); // Import the MarketPlace model
const User = require('../models/User'); // Import the MarketPlace model
const Order = require('../models/Order'); // Import the Order model
const Pricing = require('../models/Pricing');
const Subscribers = require('../models/Subscribers');

exports.getPendingProducts = async (req, res) => {
    try {
        // Fetch products where workflow_state is "Pending"
        const pendingProducts = await MarketPlace.find({ workflow_state: "Pending" });

        // Check if any products were found
        if (pendingProducts.length === 0) {
            return res.status(404).json({ message: "No pending products found" });
        }

        // Return the found products
        return res.status(200).json({ data: pendingProducts });
    } catch (error) {
        console.error(`Error fetching pending products: ${error.message}`);
        return res.status(500).json({ message: "Error fetching pending products", error: error.message });
    }
};


exports.approveProduct = async (req, res) => {
    const { productId } = req.params; // Get the product ID from the request parameters

    try {
        // Find the product by ID and update the workflow_state to "Accepted"
        const updatedProduct = await MarketPlace.findByIdAndUpdate(
            productId,
            { workflow_state: "Approved" },
            { new: true, runValidators: true } // Return the updated document and run validators
        );

        // Check if the product was found and updated
        if (!updatedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        return res.status(200).json({ message: "Product approved successfully", product: updatedProduct });
    } catch (error) {
        console.error(`Error approving product: ${error.message}`);
        return res.status(500).json({ message: "Error approving product", error: error.message });
    }
};

// Function to reject a product
exports.rejectProduct = async (req, res) => {
    const { productId } = req.params; // Get the product ID from the request parameters

    try {
        // Find the product by ID
        const product = await MarketPlace.findById(productId);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Find the user associated with the product
        const userId = product.user; // Assuming userId is stored in the product document

        // Increment the productLimit of the user by 1
        await User.findByIdAndUpdate(
            userId,
            { $inc: { productLimit: 1 } }, // Increment productLimit by 1
            { new: true } // Return the updated document
        );

        // Find the product by ID and update the workflow_state to "Rejected"
        const updatedProduct = await MarketPlace.findByIdAndUpdate(
            productId,
            { 
                workflow_state: "Rejected", 
                purpose: "Deletion" // Adding the purpose field
            },
            { new: true, runValidators: true } // Return the updated document and run validators
        );

        // Check if the product was found and updated
        if (!updatedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        return res.status(200).json({ message: "Product rejected successfully", product: updatedProduct });
    } catch (error) {
        console.error(`Error rejecting product: ${error.message}`);
        return res.status(500).json({ message: "Error rejecting product", error: error.message });
    }
};


exports.getDashboardData = async (req, res) => {
    try {
        // Fetch total users
        const totalUsers = await User.countDocuments();

        // Fetch total products
        const totalProducts = await MarketPlace.countDocuments();
        const totalSubscribers = await Subscribers.countDocuments();

        // Fetch total inventory
        const products = await MarketPlace.find({});
        const totalInventory = products.reduce((sum, product) => sum + (product.quantity || 0), 0);

        // Fetch all orders
        const orders = await Order.find({}); 
        const totalOrders = orders.length;

        // Fetch total sales
        const totalSales = orders.reduce((sum, order) => sum + (order.orderSummary?.total || 0), 0);

        // Fetch count of pending products
        const pendingProductsCount = await MarketPlace.countDocuments({ workflow_state: "Pending" });

        // Fetch count of products added by Admin
        const adminProductsCount = await MarketPlace.countDocuments({ addedBy: "Admin" });

        // Fetch count of products not added by Admin
        const userProductsCount = await MarketPlace.countDocuments({ workflow_state: 'Approved',purpose:"Addition", addedBy: { $ne: 'Admin' } });

        const totalPendingOrders = await Order.countDocuments({status : "processing"}); 

        // Return all the data in a single response
        return res.status(200).json({
            totalUsers,
            totalProducts,
            totalInventory,
            totalSales,
            totalOrders,
            pendingProductsCount,
            adminProductsCount,
            userProductsCount,
            totalPendingOrders,
            totalSubscribers
        });
    } catch (error) {
        console.error(`Error fetching dashboard data: ${error.message}`);
        return res.status(500).json({ message: "Error fetching dashboard data", error: error.message });
    }
};

// Function to get all orders and their count
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({ 
            "payment.status": "completed" 
          }); // Fetch all orders
        const totalCount = orders.length; // Get the total count of orders
        return res.status(200).json({ totalCount, orders }); // Return count and orders
    } catch (error) {
        console.error(`Error fetching all orders: ${error.message}`);
        return res.status(500).json({ message: "Error fetching all orders", error: error.message });
    }
};

exports.getAllUsers = async (req, res) => {
    try {
        // Fetch all users from the User collection
        const users = await User.find({}, {
            password: 0 // Exclude password field from the response
        });

        // Return the users data
        return res.status(200).json({
            totalUsers: users.length,
            users: users
        });
    } catch (error) {
        console.error(`Error fetching all users: ${error.message}`);
        return res.status(500).json({ 
            message: "Error fetching all users", 
            error: error.message 
        });
    }
};

exports.getAllSellers = async (req, res) => {
    try {
        // Fetch all users from the User collection
        const users = await User.find(
            { buyerSeller: { $in: ["Seller", "Manufacturer"] } },
            { password: 0 } // Exclude the password field from the response
          );

        // Return the users data
        return res.status(200).json({
            totalUsers: users.length,
            users: users
        });
    } catch (error) {
        console.error(`Error fetching all users: ${error.message}`);
        return res.status(500).json({ 
            message: "Error fetching all users", 
            error: error.message 
        });
    }
};

exports.getMarketplaceProducts = async (req, res) => {
    try {
        // Fetch products where addedBy is not "Admin" and workflow_state is "Approved"
        const marketplaceProducts = await MarketPlace.find({ 
            addedBy: { $ne: "Admin" },
            workflow_state: "Approved",
            purpose:"Addition"
        }).populate({
            path: 'user',
            select: 'firstName lastName' // Only select the firstName and lastName fields
        });

        // Transform the response to include user information in a more accessible format
        const productsWithUserInfo = marketplaceProducts.map(product => {
            const productObj = product.toObject();
            
            // Add user's full name if user information is available
            if (productObj.user) {
                productObj.userName = `${productObj.user.firstName} ${productObj.user.lastName}`;
            } else {
                productObj.userName = 'Unknown User';
            }
            
            return productObj;
        });

        // Return the found products with user information
        return res.status(200).json({ 
            totalCount: productsWithUserInfo.length,
            products: productsWithUserInfo 
        });
    } catch (error) {
        console.error(`Error fetching marketplace products: ${error.message}`);
        return res.status(500).json({ 
            message: "Error fetching marketplace products", 
            error: error.message 
        });
    }
};

// Function to get all store products added by Admin
exports.getStoreProducts = async (req, res) => {
    try {
        // Fetch products where addedBy is "Admin" and workflow_state is "Approved"
        const storeProducts = await MarketPlace.find({ 
            addedBy: "Admin",
            workflow_state: "Approved" 
        });

        // Return the found products
        return res.status(200).json({ 
            totalCount: storeProducts.length,
            products: storeProducts 
        });
    } catch (error) {
        console.error(`Error fetching store products: ${error.message}`);
        return res.status(500).json({ 
            message: "Error fetching store products", 
            error: error.message 
        });
    }
};

exports.completeOrder = async (req, res) => {
    const { orderId } = req.params; // Get the order ID from the URL parameters

    try {
        // Find the order by ID and update its status to "completed"
        const updatedOrder = await Order.findByIdAndUpdate(
            orderId,
            { status: "completed" },
            { new: true, runValidators: true } // Return the updated document and run validators
        );

        // Check if the order was found and updated
        if (!updatedOrder) {
            return res.status(404).json({ message: "Order not found" });
        }

        return res.status(200).json({ 
            message: "Order completed successfully", 
            order: updatedOrder 
        });
    } catch (error) {
        console.error(`Error completing order: ${error.message}`);
        return res.status(500).json({ 
            message: "Error completing order", 
            error: error.message 
        });
    }
};

exports.viewDetails = async (req, res) => {
    const { orderId } = req.params;

    try {
        // Find the order by ID
        const order = await Order.findById(orderId);

        // Check if the order exists
        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Process each product in the order
        const productsWithCommission = await Promise.all(order.products.map(async (product) => {
            // Extract only the needed product fields
            const cleanProduct = {
                _id: product._id,
                productId: product.productId,
                title: product.title,
                quantity: product.quantity,
                price: product.price,
                subtotal: product.subtotal
            };

            // Find the product in marketplace and get seller info in one go
            const [marketplaceProduct, seller] = await Promise.all([
                MarketPlace.findById(product.productId),
                MarketPlace.findById(product.productId).then(mp => 
                    mp ? User.findById(mp.user) : null
                )
            ]);

            // Early return if product not found
            if (!marketplaceProduct) {
                return {
                    ...cleanProduct,
                    commission: 0,
                    error: "Product not found in marketplace"
                };
            }

            // Early return if seller not found
            if (!seller) {
                return {
                    ...cleanProduct,
                    commission: 0,
                    error: "Seller not found"
                };
            }

            // Early return for admin users
            if (seller.addedBy === "Admin") {
                return {
                    ...cleanProduct,
                    commission: 0,
                    sellerPlan: seller.plan,
                    sellerName: `${seller.firstName} ${seller.lastName}`,
                    sellerEmail: seller.email,
                    isAdminUser: true
                };
            }

            // Only calculate commission for non-admin sellers
            let commissionPercentage;
            switch (seller.plan) {
                case 'Basic':
                    commissionPercentage = 95;
                    break;
                case 'Popular':
                    commissionPercentage = 97;
                    break;
                case 'Business':
                    commissionPercentage = 100;
                    break;
                default:
                    commissionPercentage = 95; // Default to Basic plan
            }

            const totalAmount = cleanProduct.price * cleanProduct.quantity;
            const commission = (totalAmount * commissionPercentage / 100);
            
            return {
                ...cleanProduct,
                commission,
                sellerPlan: seller.plan,
                sellerName: `${seller.firstName} ${seller.lastName}`,
                sellerEmail: seller.email,
                isAdminUser: false
            };
        }));

        // Calculate total commission
        const totalCommission = productsWithCommission.reduce((sum, product) => sum + (product.commission || 0), 0);

        // Create a clean order object with only the needed fields
        const cleanOrder = {
            _id: order._id,
            userId: order.userId,
            billing: order.billing,
            orderSummary: order.orderSummary,
            payment: order.payment,
            status: order.status,
            createdAt: order.createdAt,
            products: productsWithCommission,
            totalCommission
        };

        // Return the clean order details
        return res.status(200).json({
            success: true,
            order: cleanOrder
        });
    } catch (error) {
        console.error(`Error calculating commission details: ${error.message}`);
        return res.status(500).json({ 
            message: "Error calculating commission details", 
            error: error.message 
        });
    }
};



exports.updatePlan = async (req, res) => {
const {  monthlyPrice,plan, yearlyPrice } = req.body;
  // Validate the received data
  if (!plan || !monthlyPrice || !yearlyPrice) {
    return res.status(400).json({ message: 'Missing required fields' });
  }

  // Check if the plan already exists in the database
  const existingPlan = await Pricing.findOne({ plan });
  if (!existingPlan) {
    return res.status(404).json({ message: `${plan} Plan not found. Please add the plan first.` });
  }

  try {
    // Update the existing plan
    existingPlan.monthlyPrice = monthlyPrice;
    existingPlan.yearlyPrice = yearlyPrice;

    // Save the updated pricing
    await existingPlan.save();

    res.status(200).json({ message: 'Pricing updated successfully!' });
  } catch (err) {
    console.error('Error updating pricing:', err);
    res.status(500).json({ message: 'Error updating pricing. Please try again later.' });
  }

};


exports.completeTransaction = async (req, res) => {
try {
    // Get user ID from the URL parameters
    const userId = req.params.userId;

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const lastPaymentDate = new Date(user.lastPaymentDate);
    const currentDate = new Date();
    const lastPaymentDateUTC = new Date(lastPaymentDate.toUTCString());
    const currentDateUTC = new Date(currentDate.toUTCString());
    
    const timeDifferenceInMs = currentDateUTC - lastPaymentDateUTC;
    const diffInDays = timeDifferenceInMs / (1000 * 60 * 60 * 24);

    // Show Snackbar message if last payment date is before 15 days
    if (diffInDays < 15) {
      return res.status(200).json({ message:"Commission paid within 15 days"});
    }
    else{
            // Reset commission to 0 and set the last payment date to the current date
        user.commission = 0;
        user.totalAmount = 0;
        user.lastPaymentDate = new Date(); // Current date and time

        // Save the updated user
        await user.save();

        // Send the last payment date back to the client

        return res.status(200).json({ message:"Commission payment confirmed"});
    }

  } catch (error) {
    console.error('Error completing transaction:', error);
    res.status(500).json({ message: 'Server error, please try again later' });
  }
}

exports.deleteUser = async (req, res) => {
    try {
        const { userId }= req.params;
        const user = await User.findById(userId);
        if (!user) {
          return res.status(404).json({ message: 'User not found' });
        }
    
        await User.findByIdAndDelete(userId);
    
        res.status(200).json({ message: 'User deleted successfully' });
      } catch (err) {
        console.error('Error deleting user:', err);
        res.status(500).json({ message: 'Server error while deleting user' });
      }
};

exports.getSubscribers = async (req, res) => {
    try {
        const subscribers = await Subscribers.find().sort({ submittedAt: -1 });
        res.status(200).json({ subscribers });
      } catch (err) {
        console.error("Error fetching subscribers:", err);
        res.status(500).json({ message: "Internal server error" });
      }
};