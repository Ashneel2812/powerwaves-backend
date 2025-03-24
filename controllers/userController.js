const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken'); // Import the jsonwebtoken package
const Form = require('../models/formModel');
const razorpay = require("razorpay");
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');
const Pricing = require('../models/Pricing');
const Order = require('../models/Order');
const MarketPlace = require('../models/MarketPlace');



exports.signinUser = async (req, res) => {
    const { firstname, lastname, email, password, address, option, plan, price,productLimit } = req.body;
    try {
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = new User({ firstName: firstname, lastName: lastname, email, password: hashedPassword, address, buyerSeller: option, plan, price,productLimit });
        
        // if (option === "Seller") {
        //     if ((plan === "Popular" && (price === 35000 || price === 2625)) || (plan === "Basic" && (price === 2000 || price === 1500))) {
        //         user.productLimit = 1;
        //     }
        // }
        
        await user.save();
        res.status(200).json({ status: "success", message: "User created successfully" });
    } catch (error) {
        res.status(500).json({ status: "error", message: error.message });
    }
};

exports.loginUser = async (req, res) => {
    const { username, password } = req.body;
    const user = await User.findOne({ email: username });
    if (!user) {
        return res.status(404).json({ status: 'error', message: "User not found. Please Signup" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
        return res.status(401).json({ status: "error", message: "Invalid password. Please try again." });
    }

    // Generate a JWT token
    const token = jwt.sign({ id: user._id, buyerSeller: user.buyerSeller,email:user.email }, '45193980012041902ab3b0fd832459d6383d8be7408e6c2ff1ed7a1d60e44e3745b193ff4b8d2c35d97ae793d214841342f34e14beaa8b792806e82354e09e46', { expiresIn: '1h' }); 

    res.json({
        status: 'success',
        message: {
            username: user.email,
            full_name: `${user.firstName} ${user.lastName}`,
            email: user.email,
            buyerSeller: user.buyerSeller,
            token
        }
    });
};

exports.sendDetails = async (req, res) => {
    const { name, email, phonenumber, message } = req.body;
  
    try {
      // 1. Save the form data into MongoDB
      const newForm = new Form({
        name,
        email,
        phonenumber,
        message
      });
  
      await newForm.save();
  
      // Return success message
      return res.status(200).json({ message: 'Details submitted and email sent successfully!' });
  
    } catch (error) {
      console.error(error);
      res.status(500).json({ message: 'Failed to submit details'});
    }
  };

//   exports.updateUserPlanAndPrice = async (req, res) => {
//     const { plan, price } = req.body; // Get the plan and price from the request body
//     let productLimit;
//     const timestamp = new Date(); // Get the current timestamp
    
//     try {
//         // Check for the token in the Authorization header
//         const token = req.headers.authorization?.split(' ')[1]; // Assuming the token is sent as "Bearer <token>"
//         if (!token) {
//             return res.status(401).json({ message: { error: "No token provided" } });
//         }

//         // Verify and decode the token to get the user ID
//         const decoded = jwt.verify(token, '45193980012041902ab3b0fd832459d6383d8be7408e6c2ff1ed7a1d60e44e3745b193ff4b8d2c35d97ae793d214841342f34e14beaa8b792806e82354e09e46'); // Replace with your actual secret
//         const userId = decoded.id; // Extract the user ID from the decoded token
        
//         // Find the user by ID
//         const user = await User.findById(userId);
//         if (!user) {
//             return res.status(404).json({ message: "User not found" });
//         }

//         // Check if the user already has a plan
//         if (user.plan) {
//             return res.status(400).json({ message: `User has already purchased a plan: ${user.plan}` });
//         }

//         // Logic to set productLimit based on plan and price
//         if (plan === 'Basic') {
//             if (price === "2000" || price === "1500") {
//                 productLimit = 30;
//             } else {
//                 return res.status(400).json({ message: "Invalid price for basic plan" });
//             }
//         } else if (plan === 'Popular') {
//             if (price === "35000" || price === "2625") {
//                 productLimit = 50;
//             } else {
//                 return res.status(400).json({ message: "Invalid price for popular plan" });
//             }
//         } else if (plan === 'Business') {
//             if (price === "8000" || price === "6000") {
//                 productLimit = 9999; // Set to 'unlimited' for business plan
//             } else {
//                 return res.status(400).json({ message: "Invalid price for business plan" });
//             }
//         } else {
//             return res.status(400).json({ message: "Invalid plan provided" });
//         }

//         // Find the user by ID and update the plan, price, productLimit, and timestamp
//         const updatedUser = await User.findByIdAndUpdate(
//             userId,
//             { plan, price, productLimit, planPurchaseTimestamp: timestamp }, // Add the updatedAt field with the current timestamp
//             { new: true, runValidators: true } // Return the updated document and run validators
//         );

//         // Check if the user was found and updated
//         if (!updatedUser) {
//             return res.status(404).json({ message: "User not found" });
//         }

//         // Return the updated user data
//         return res.status(200).json({ message: "User updated successfully", user: updatedUser });
//     } catch (error) {
//         console.error(`Error updating user: ${error.message}`);
//         return res.status(500).json({ message: { error: error.message } });
//     }
// };  

const instance = new razorpay({
    key_id: 'rzp_test_CEcuqpm7JMLl6e', // Replace with your Razorpay key ID
    key_secret: '4EouTATC8SsWDJjigoHAfGpy' // Replace with your Razorpay key secret
  });
  
  exports.updateUserPlanAndPrice = async (req, res) => {
      const { plan, price } = req.body; // Get the plan and price from the request body
      let productLimit;
      const timestamp = new Date(); // Get the current timestamp
      
      try {
          const token = req.headers.authorization?.split(' ')[1];
          if (!token) {
              return res.status(401).json({ message: { error: "No token provided" } });
          }
  
          const decoded = jwt.verify(token, '45193980012041902ab3b0fd832459d6383d8be7408e6c2ff1ed7a1d60e44e3745b193ff4b8d2c35d97ae793d214841342f34e14beaa8b792806e82354e09e46');
          const userId = decoded.id;
          
          const user = await User.findById(userId);
          if (!user) {
              return res.status(404).json({ message: "User not found" });
          }
  
          // Check if the user already has a plan
          if (user.plan) {
              return res.status(400).json({ message: `Already purchased a plan: ${user.plan}` });
          }
  
          // Setting productLimit based on the plan and price
          if (plan === 'Basic') {
              if (price === "2000" || price === "1500") {
                  productLimit = 30;
              } else {
                  return res.status(400).json({ message: "Invalid price for basic plan" });
              }
          } else if (plan === 'Popular') {
              if (price === "35000" || price === "2625") {
                  productLimit = 50;
              } else {
                  return res.status(400).json({ message: "Invalid price for popular plan" });
              }
          } else if (plan === 'Business') {
              if (price === "8000" || price === "6000") {
                  productLimit = 9999;
              } else {
                  return res.status(400).json({ message: "Invalid price for business plan" });
              }
          } else {
              return res.status(400).json({ message: "Invalid plan provided" });
          }
  
          // Create a Razorpay order
          const orderOptions = {
              amount: price * 100, // Amount in paise (1 INR = 100 paise)
              currency: 'INR',
              receipt: `order_rcptid_${Math.floor(Math.random() * 1000)}`,
          };
  
          const order = await instance.orders.create(orderOptions);
  
          // Handle order creation failure
          if (!order) {
              return res.status(500).json({ message: "Error creating Razorpay order" });
          }
  
          // Save the order id in the user's plan info
          const updatedUser = await User.findByIdAndUpdate(
              userId,
              { 
                  plan, 
                  price, 
                  productLimit, 
                  planPurchaseTimestamp: timestamp,
                  razorpayOrderId: order.id
              },
              { new: true, runValidators: true }
          );
  
          if (!updatedUser) {
              return res.status(404).json({ message: "User not found" });
          }
  
          return res.status(200).json({
              message: "User updated successfully, please complete payment",
              razorpayOrder: order
          });
      } catch (error) {
          console.error("Error updating user:", error.message);
          return res.status(500).json({ message: { error: error.message } });
      }
  };
  
  exports.updateFreeUserPlan = async (req, res) => {
    let { plan, price } = req.body; // Get the plan and price from the request body
    let productLimit;
    const timestamp = new Date(); // Get the current timestamp
    
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: { error: "No token provided" } });
        }

        const decoded = jwt.verify(token, '45193980012041902ab3b0fd832459d6383d8be7408e6c2ff1ed7a1d60e44e3745b193ff4b8d2c35d97ae793d214841342f34e14beaa8b792806e82354e09e46');
        const userId = decoded.id;
        
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        // Check if the user already has a plan
        if (user.plan) {
            return res.status(400).json({ message: `Already purchased a plan: ${user.plan}` });
        }

        // Setting productLimit based on the plan and price
        if (plan === 'Free' && user.usedFree == "No") {
                productLimit = 10;
                price = 0;
                
        } 
        else if (plan === 'Free' && user.usedFree == "Yes") {
            return res.status(400).json({ message: `Already purchased the free plan once`});
        }  else {
            return res.status(400).json({ message: "Invalid plan provided" });
        }

        
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { 
                plan, 
                price, 
                productLimit,
                usedFree:"Yes",
                planPurchaseTimestamp: timestamp,
            },
            { new: true, runValidators: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({
            message: "Free plan purchased",
        });
    } catch (error) {
        console.error("Error updating user:", error.message);
        return res.status(500).json({ message: { error: error.message } });
    }
};


exports.checkProductLimit = async (req, res) => {
    const { email } = req.params; // Get the email from the request parameters
    try {
        // Find the user by email
        const user = await User.findOne({ email: email });
        
        // Check if the user exists
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }

        // Get the product limit, defaulting to 0 if not set
        const productLimit = user.productLimit || 0;
        let userPlan = user.plan || "";

        // Get the plan purchase timestamp
        const planPurchaseTimestamp = new Date(user.planPurchaseTimestamp);

        // Get the current timestamp
        const currentTimestamp = new Date();

        // Calculate one month ago and one year ago
        const oneMonthAgo = new Date();
        oneMonthAgo.setMonth(currentTimestamp.getMonth() - 1);

        const oneYearAgo = new Date();
        oneYearAgo.setFullYear(currentTimestamp.getFullYear() - 1);

        // Fetch the pricing data from the database
        const pricingData = await Pricing.find(); // Assuming you have a Pricing model

        // Check if pricing data for each plan exists
        const basicPlanPricing = pricingData.find(plan => plan.plan === "Basic");
        const popularPlanPricing = pricingData.find(plan => plan.plan === "Popular");
        const businessPlanPricing = pricingData.find(plan => plan.plan === "Business");

        // Check if the pricing data exists for all required plans
        if (!basicPlanPricing || !popularPlanPricing || !businessPlanPricing) {
            return res.status(500).json({ error: "Pricing data is missing for some plans" });
        }

        // Define the prices that require a plan upgrade (based on pricing data from the database)
        const upgradePricesOneMonth = [
            basicPlanPricing.monthlyPrice, 
            popularPlanPricing.monthlyPrice, 
            businessPlanPricing.monthlyPrice
        ];

        const upgradePricesOneYear = [
            basicPlanPricing.yearlyPrice, 
            popularPlanPricing.yearlyPrice, 
            businessPlanPricing.yearlyPrice
        ];

        // Check for upgrade plan conditions based on price and timestamp
        if (user.plan === "Free" && planPurchaseTimestamp < oneMonthAgo) {
            return res.status(200).json({ message: "Upgrade plan" });
        }

        if (upgradePricesOneMonth.includes(user.price) && planPurchaseTimestamp < oneMonthAgo) {
            return res.status(200).json({ message: "Upgrade plan" });
        }

        if (upgradePricesOneYear.includes(user.price) && planPurchaseTimestamp < oneYearAgo) {
            return res.status(200).json({ message: "Upgrade plan" });
        }

        // Return product limit if no upgrade is required
        return res.status(200).json({ limit: productLimit, plan: userPlan });
    } catch (error) {
        console.error(`Error checking product limit: ${error.message}`);
        return res.status(500).json({ error: error.message });
    }
};

exports.createRazorpayOrder = async (req, res) => {
    let { plan, price } = req.body;
    let productLimit;
    const timestamp = new Date(); // Get the current timestamp

    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: { error: "No token provided" } });
        }

        const decoded = jwt.verify(token, '45193980012041902ab3b0fd832459d6383d8be7408e6c2ff1ed7a1d60e44e3745b193ff4b8d2c35d97ae793d214841342f34e14beaa8b792806e82354e09e46');
        const userId = decoded.id;

        const user = await User.findById(userId);
        const planPurchaseTimestamp = new Date(user.planPurchaseTimestamp);

        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }
        if (user.plan) {
            return res.status(400).json({ message: `Already purchased a plan: ${user.plan}` });
        }
        const pricingPlans = await Pricing.find();

        // Find the correct pricing plan based on the `plan` provided in the request
        const pricing = pricingPlans.find(planItem => planItem.plan === plan);

        if (!pricing) {
        return res.status(400).json({ message: "Invalid plan provided" });
        }

        // Ensure price is treated as a number
        price = parseInt(price, 10);

        // Setting productLimit based on the plan and price
        if (plan === 'Basic') {
            // Check if the price matches either monthly or yearly price for Basic plan
            if (price === pricing.monthlyPrice || price === pricing.yearlyPrice) {
                productLimit = 30;
            } else {
                return res.status(400).json({ message: "Invalid price for Basic plan" });
            }
        } else if (plan === 'Popular') {
            // Check if the price matches Popular plan prices
            if (price === pricing.monthlyPrice || price === pricing.yearlyPrice) {
                productLimit = 50;
            } else {
                return res.status(400).json({ message: "Invalid price for Popular plan" });
            }
        } else if (plan === 'Business') {
            // Check if the price matches Business plan prices
            if (price === pricing.monthlyPrice || price === pricing.yearlyPrice) {
                productLimit = 99999;
            } else {
                return res.status(400).json({ message: "Invalid price for Business plan" });
            }
        } else {
            return res.status(400).json({ message: "Invalid plan provided" });
        }

        // Create a Razorpay order
        const orderOptions = {
            amount: price * 100, // Amount in paise (1 INR = 100 paise)
            currency: 'INR',
            receipt: `order_rcptid_${Math.floor(Math.random() * 1000)}`,
        };

        const order = await instance.orders.create(orderOptions);

        // Handle order creation failure
        if (!order) {
            return res.status(500).json({ message: "Error creating Razorpay order" });
        }

        // Save the order id in the user's plan info temporarily (without updating plan or price)
        await User.findByIdAndUpdate(
            userId,
            { razorpayOrderId: order.id },
            { new: true }
        );

        return res.status(200).json({
            message: "Order created successfully, please complete payment",
            razorpayOrder: order
        });

    } catch (error) {
        console.error("Error creating Razorpay order:", error.message);
        return res.status(500).json({ message: { error: error.message } });
    }
};

exports.verifyPaymentAndUpdateUser = async (req, res) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature,plan,price } = req.body;
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: { error: "No token provided" } });
        }

        const decoded = jwt.verify(token, '45193980012041902ab3b0fd832459d6383d8be7408e6c2ff1ed7a1d60e44e3745b193ff4b8d2c35d97ae793d214841342f34e14beaa8b792806e82354e09e46');
        const userId = decoded.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.razorpayOrderId !== razorpay_order_id) {
            return res.status(400).json({ message: "Invalid order ID" });
        }
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', "4EouTATC8SsWDJjigoHAfGpy")
            .update(body.toString())
            .digest('hex');
        
        const isValidSignature = expectedSignature === razorpay_signature;
        if (!isValidSignature) {
            return res.status(400).json({ message: "Payment verification failed" });
        }

        // After successful payment, update the user
        let productLimit;
        if (plan == 'Basic') {
            productLimit = 30;
        } else if (plan === 'Popular') {
            productLimit = 50;
        } else if (plan === 'Business') {
            productLimit = 9999;
        } else {
            return res.status(400).json({ message: "Invalid plan provided" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                plan,
                price,
                productLimit,
                planPurchaseTimestamp: new Date(),
                razorpayPaymentId: razorpay_payment_id,
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({
            message: "Payment successful and plan updated"
        });

    } catch (error) {
        console.error("Error verifying payment and updating user:", error.message);
        return res.status(500).json({ message: { error: error.message } });
    }
};


exports.upgradePaymentAndUpdateUser = async (req, res) => {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature,plan,price } = req.body;
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: { error: "No token provided" } });
        }

        const decoded = jwt.verify(token, '45193980012041902ab3b0fd832459d6383d8be7408e6c2ff1ed7a1d60e44e3745b193ff4b8d2c35d97ae793d214841342f34e14beaa8b792806e82354e09e46');
        const userId = decoded.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: "User not found" });
        }

        if (user.razorpayOrderId !== razorpay_order_id) {
            return res.status(400).json({ message: "Invalid order ID" });
        }
        const body = razorpay_order_id + '|' + razorpay_payment_id;
        const expectedSignature = crypto
            .createHmac('sha256', "4EouTATC8SsWDJjigoHAfGpy")
            .update(body.toString())
            .digest('hex');
        
        const isValidSignature = expectedSignature === razorpay_signature;
        if (!isValidSignature) {
            return res.status(400).json({ message: "Payment verification failed" });
        }

        // After successful payment, update the user
        let productLimit;
        if (plan == 'Basic') {
            productLimit = user.productLimit+30;
        } else if (plan === 'Popular') {
            productLimit = user.productLimit+50;
        } else if (plan === 'Business') {
            productLimit = user.productLimit+9999;
        } else {
            return res.status(400).json({ message: "Invalid plan provided" });
        }

        const updatedUser = await User.findByIdAndUpdate(
            userId,
            {
                plan,
                price,
                productLimit,
                planPurchaseTimestamp: new Date(),
                razorpayPaymentId: razorpay_payment_id,
            },
            { new: true }
        );

        if (!updatedUser) {
            return res.status(404).json({ message: "User not found" });
        }

        return res.status(200).json({
            message: "Payment successful and plan updated"
        });

    } catch (error) {
        console.error("Error verifying payment and updating user:", error.message);
        return res.status(500).json({ message: { error: error.message } });
    }
};


exports.getUserDetails= async(req,res) => {
    try {
        const token = req.headers.authorization?.split(' ')[1];
        if (!token) {
            return res.status(401).json({ message: { error: "No token provided" } });
        }

        const decoded = jwt.verify(token, '45193980012041902ab3b0fd832459d6383d8be7408e6c2ff1ed7a1d60e44e3745b193ff4b8d2c35d97ae793d214841342f34e14beaa8b792806e82354e09e46');
        const userId = decoded.id;
        const user = await User.findById(userId);
        
        if (!user) return res.status(404).send('User not found');
        
        res.json(user);
      } catch (error) {
        res.status(500).send('Server error');
      }
}

exports.updateUserDetails= async(req,res) => {
    const {
        firstName,
        lastName,
        email,
        phone,
        address,
        ifscCode,
        accountNumber,
        branch,
        bankName,
        image1,
        image2,
        image3,
        googleMapLocation,
    } = req.body;
    try {
        // Retrieve the token from the Authorization header
        const token = req.headers.authorization?.split(' ')[1];  // Assuming the token is sent as "Bearer <token>"
        if (!token) {
            return res.status(401).json({ message: { error: "No token provided" } });
        }

        // Verify and decode the token to get the user ID
        const decoded = jwt.verify(token, '45193980012041902ab3b0fd832459d6383d8be7408e6c2ff1ed7a1d60e44e3745b193ff4b8d2c35d97ae793d214841342f34e14beaa8b792806e82354e09e46');  // Use the same secret as before
        const userId = decoded.id;  // Extract the user ID from the decoded token

        // Find the user by ID to update their profile
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: { error: "User not found" } });
        }

        // Update the user fields based on the request body
        
        let imageUrls = []
        // Save images if provided
        const saveImage = async (imageData, folder) => {
            if (!imageData) {
                throw new Error("Image data is required");
            }
            const fileExtension = imageData.split(";")[0].split("/")[1];
            const fileName = `product_image_${Date.now()}.${fileExtension}`; // Unique file name
            const imageDataBase64 = imageData.split(",")[1];
            return await save_image(fileName, imageDataBase64, folder, fileExtension);
        };

        const save_image= async (fileName, imageData, folder, fileExtension) => {
            // Define the directory where images will be saved
            const dir = path.join(__dirname, '..', 'uploads', folder); // Adjust the path as needed
        
            // Create the directory if it doesn't exist
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
        
            // Create the full path for the file
            const filePath = path.join(dir, fileName);
        
            // Decode the base64 image data
            const buffer = Buffer.from(imageData, 'base64');
        
            // Write the image file to the filesystem
            await fs.promises.writeFile(filePath, buffer);
        
            // Return the URL of the saved image
            return `http://localhost:5000/uploads/${folder}/${fileName}`; // Adjust the URL as needed
        }
        
        if (image1 || image2 || image3) {
            // Create an array to store the image upload promises
            const imagesToUpload = [];
        
            // Check if each image has a value and add the corresponding image upload promise
            if (image1) {
                imagesToUpload.push(saveImage(image1, 'Market Place'));
            }
            if (image2) {
                imagesToUpload.push(saveImage(image2, 'Market Place'));
            }
            if (image3) {
                imagesToUpload.push(saveImage(image3, 'Market Place'));
            }
        
            // Wait for all images to be uploaded
            imageUrls = await Promise.all(imagesToUpload);
        }
        user.phone = phone;
        user.address = address;
        user.ifscCode = ifscCode;
        user.accountNumber = accountNumber;
        user.branch = branch;
        user.bankName = bankName;
        user.images = imageUrls
        user.googleMapLocation = googleMapLocation;
        await user.save();

        res.status(200).json({ message: { success: "Profile updated successfully" } });
    } catch (error) {
        console.error('Error updating user profile:', error);
        res.status(500).json({ message: { error: error.message } });
    }
}



exports.getSellerDetails= async(req,res) => {
    const { sellerId } = req.params;

  try {
    // Query the database for the seller based on the sellerId
    const user = await User.findOne({ _id:sellerId });

    if (!user) {
      return res.status(404).json({ message: 'Seller not found' });
    }

    res.status(200).json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
}


exports.getPlan = async (req, res) => {
    try {
        const pricingData = await Pricing.find(); // Fetch all pricing records
        const pricing = {};
    
        // Structure pricing by plan
        pricingData.forEach((plan) => {
          pricing[plan.plan] = {
            monthlyPrice: plan.monthlyPrice,
            yearlyPrice: plan.yearlyPrice,
          };
        });
    
        res.json(pricing); // Return pricing for all plans
      } catch (error) {
        console.error('Error fetching pricing data:', error);
        res.status(500).json({ message: 'Error fetching pricing data.' });
      }
    };


exports.updateCommissionDetails = async (req, res) => {
    const { paymentId } = req.body; // We expect paymentId instead of orderId in the URL
    try {
        // Find the order by the paymentId
        const paymentDetails = await Order.findOne({ 'payment.orderId': paymentId });
        // Check if the payment details and order exist
        if (!paymentDetails) {
            return res.status(404).json({ message: "Order not found" });
        }

        // Process each product in the order
        const productsWithCommission = await Promise.all(paymentDetails.products.map(async (product) => {
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

            let totalAmount = cleanProduct.price * cleanProduct.quantity;
            let commission = (totalAmount * commissionPercentage / 100);
            totalAmount = parseFloat(totalAmount.toFixed(2));
            commission = parseFloat(commission.toFixed(2));
            // Update the seller's commission in the User collection
            await User.findByIdAndUpdate(seller._id, {
                $inc: {
                    commission: commission,  // Increment the user's commission field
                    totalPayment: totalAmount // Increment the totalPayment field
                }
            });

            return {
                ...cleanProduct,
                commission,
                sellerPlan: seller.plan,
                sellerName: `${seller.firstName} ${seller.lastName}`,
                sellerEmail: seller.email,
                isAdminUser: false
            };
        }));

        // Calculate total commission for the order
        const totalCommission = productsWithCommission.reduce((sum, product) => sum + (product.commission || 0), 0);

        // Create a clean order object with only the needed fields
        const cleanOrder = {
            _id: paymentDetails._id,
            userId: paymentDetails.userId,
            billing: paymentDetails.billing,
            orderSummary: paymentDetails.orderSummary,
            payment: paymentDetails.payment,
            status: paymentDetails.status,
            createdAt: paymentDetails.createdAt,
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