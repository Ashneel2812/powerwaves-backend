const fs = require('fs');
const path = require('path');
const Product = require('../models/Product');
const MarketPlace = require('../models/MarketPlace');
const jwt = require('jsonwebtoken'); // Import the jsonwebtoken package
const User = require('../models/User');
const Review = require('../models/Review');

exports.getMarketProducts = async (req, res) => {
    try {

        // Log the incoming request query parameters

        // Define the filter for the query
        const filter = { workflow_state: 'Approved', addedBy: { $ne: 'Admin' }}; // You can modify this based on req.query if needed

        // Execute the query to get approved products
        const approvedProducts = await MarketPlace.find(filter)
            .select('title category price images quantity product_description user');
        

        // Map to add image URL if needed
        // const productsWithImageUrl = approvedProducts.map(product => {
        //     if (product.image) {
        //         product.image_url = get_url(product.image);
        //     }
        //     return product;
        // });

        res.status(200).json({ data: approvedProducts });
    } catch (error) {
        console.error('Error fetching market products:', error); // Log the error
        res.status(500).json({ message: { error: error.message } });
    }
};

async function save_image(fileName, imageData, folder, fileExtension) {
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
    return `https://powerwaves-backend.onrender.com/uploads/${folder}/${fileName}`; // Adjust the URL as needed
}

exports.addMarketPlaceProduct = async (req, res) => {
    const { title, price, productdescription, completedescription, category, qty, weight, brand, color, capacity, totalpoweroutlets, amperage, image1, image2, image3, image4 } = req.body;

    try {
        // Retrieve the token from the Authorization header
        const token = req.headers.authorization?.split(' ')[1]; // Assuming the token is sent as "Bearer <token>"
        if (!token) {
            return res.status(401).json({ message: { error: "No token provided" } });
        }

        // Verify and decode the token to get the user ID
        const decoded = jwt.verify(token, '45193980012041902ab3b0fd832459d6383d8be7408e6c2ff1ed7a1d60e44e3745b193ff4b8d2c35d97ae793d214841342f34e14beaa8b792806e82354e09e46'); // Use the same secret as before
        const userId = decoded.id; // Extract the user ID from the decoded token
        const isAdmin = decoded.buyerSeller;
        var workflow_state = "Pending";

        if (isAdmin === "Admin") {
            workflow_state = "Approved";
        }

        // Function to save images
        const saveImage = async (imageData, folder) => {
            if (!imageData) {
                throw new Error("Image data is required");
            }
            const fileExtension = imageData.split(";")[0].split("/")[1];
            const fileName = `product_image_${Date.now()}_${Math.random().toString(36).substring(2, 15)}.${fileExtension}`;
            const imageDataBase64 = imageData.split(",")[1];
            return await save_image(fileName, imageDataBase64, folder, fileExtension);
        };
        
        console.log(image1); // Log image1 data
        console.log(image2); // Log image2 data
        console.log(image3); // Log image3 data
        console.log(image4); // Log image4 data

        // Save all images
        const imageUrls = await Promise.all([
            saveImage(image1, 'Market Place'),
            saveImage(image2, 'Market Place'),
            saveImage(image3, 'Market Place'),
            saveImage(image4, 'Market Place')
        ]);

        const product = new MarketPlace({
            title,
            price,
            product_description: productdescription,
            complete_description: completedescription,
            category,
            quantity: qty,
            images: imageUrls, // Store all image URLs in an array
            weight,
            brand,
            color,
            capacity,
            total_power_outlets: totalpoweroutlets,
            amperage,
            user: userId,
            addedBy: isAdmin,
            likes: 0,
            workflow_state: workflow_state
        });

        await product.save();
        const user = await User.findById(userId); // Find the user by ID
        if (user) {
            user.productLimit = (user.productLimit || 0) - 1; // Decrement product limit by 1
            await user.save(); // Save the updated user
        }
        res.status(201).json({ message: { success: "Product Added Successfully" } });
    } catch (error) {
        console.error('Error creating Market Place record:', error);
        res.status(500).json({ message: { error: error.message } });
    }
};

exports.getUserProducts = async (req, res) => {
    try {
        // Check for the token in the Authorization header
        const token = req.headers.authorization?.split(' ')[1]; // Assuming the token is sent as "Bearer <token>"
        if (!token) {
            return res.status(401).json ({ message: "No token provided" });
        }

        // Verify the token
        const decoded = jwt.verify(token, '45193980012041902ab3b0fd832459d6383d8be7408e6c2ff1ed7a1d60e44e3745b193ff4b8d2c35d97ae793d214841342f34e14beaa8b792806e82354e09e46'); // Replace 'your_jwt_secret' with your actual secret
        const userId = decoded.id; // Extract the user ID from the decoded token


        // Log the incoming request query parameters

        // Define the filter for the query
        const filter = { user: userId,workflow_state:'Approved' }; // Filter products by the logged-in user

        // Execute the query to get approved products for the logged-in user
        const approvedProducts = await MarketPlace.find(filter)
            .select('title category price images quantity product_description user workflow_state');
        

        // Map to add image URL if needed
        const productsWithImageUrl = approvedProducts.map(product => {
            if (product.images) {
                product.image_url = product.images[0];
            }
            return product;
        });

        res.status(200).json({ data: productsWithImageUrl });
    } catch (error) {
        console.error('Error fetching market products:', error); // Log the error
        res.status(500).json({ message: { error: error.message } });
    }
};

exports.deleteUserProduct = async (req, res) => {
    try {
        // Check for the token in the Authorization header
        const token = req.headers.authorization?.split(' ')[1]; // Assuming the token is sent as "Bearer <token>"
        if (!token) {
            return res.status(401).json({ message: { error: "No token provided" } });
        }

        // Verify and decode the token to get the user ID
        const decoded = jwt.verify(token, '45193980012041902ab3b0fd832459d6383d8be7408e6c2ff1ed7a1d60e44e3745b193ff4b8d2c35d97ae793d214841342f34e14beaa8b792806e82354e09e46'); // Use the same secret as before
        const userId = decoded.id; // Extract the user ID from the decoded token

        // Check if the product ID is provided in the request body
        const { id } = req.body; // Get the product ID from the request body
        if (!id) {
            return res.status(400).json({ message: { error: "Product ID is required" } });
        }

        // Check if the Market Place record exists
        const product = await MarketPlace.findById(id); // Use the product ID instead of userId
        if (!product) {
            return res.status(404).json({ message: "Market Place record not found" });
        }

        // Optionally, you can check if the product belongs to the user
        // if (product.user.toString() !== userId) {
        //     return res.status(403).json({ message: "You are not authorized to delete this product" });
        // }

        // Update the workflow_state and purpose
        product.workflow_state = "Pending"; // Set workflow_state to Pending
        product.purpose = "Deletion"; // Set purpose to Deletion

        // Save the updated product
        await product.save();

        // Retrieve the user and increment the product limit
        const user = await User.findById(userId); // Find the user by ID
        if (user) {
            user.productLimit = (user.productLimit || 0) + 1; // Increment product limit by 1
            await user.save(); // Save the updated user
        }

        return res.status(200).json({ message: "notification_sent", product });
    } catch (error) {
        console.error(`Error in deleteUserProduct: ${error.message}`);
        return res.status(500).json({ message: "Error", error: error.message });
    }
};


exports.adminProductList = async (req, res) => {
    try {
        // Fetch all products from the MarketPlace collection
        const adminProducts = await MarketPlace.find({addedBy:"Admin"}, 'title category price images product_description');

        // Map through the products to add image URLs
        const productsWithImageUrl = adminProducts.map(product => {
            const productData = product.toObject(); // Convert mongoose document to plain object
            if (productData.image) {
                productData.image_url = productData.image; // Generate the image URL
            }
            return productData;
        });

        return res.status(200).json({ data: productsWithImageUrl });
    } catch (error) {
        console.error(`Error fetching products: ${error.message}`);
        // Log the error (you can implement a logging mechanism here)
        return res.status(500).json({ message: `Failed to fetch products: ${error.message}` });
    }
};

exports.getProductById = async (req, res) => {
    const { id } = req.params;
    try {
        // Find the product by ID
        const product = await MarketPlace.findById(id);
        // Check if the product exists
        if (!id) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Retrieve all products listed by the user, excluding those added by "Admin"
        const userProducts = await MarketPlace.find({
            user: id,
            addedBy: { $ne: "Admin" }
        });

        // Extract the IDs of the user's products

        // Convert the product to a plain object and return it along with user products
        return res.status(200).json({ 
            data: product,
            userProducts: userProducts, // Include the user's products in the response
        });
    } catch (error) {
        console.error(`Error fetching product: ${error.message}`);
        return res.status(500).json({ message: "Error fetching product", error: error.message });
    }
};

exports.getProductsByCategory = async (req, res) => {
    const { product_category } = req.params; // Get the product ID from the request parameters
    try {
        // Find the product by ID
        const products = await MarketPlace.find({ category: product_category });
        
        // Check if the product exists
        if (!products) {
            return res.status(404).json({ message: "Product not found" });
        }

        // Convert the product to a plain object and return it
        return res.status(200).json({ data: products });
    } catch (error) {
        console.error(`Error fetching product: ${error.message}`);
        return res.status(500).json({ message: "Error fetching product", error: error.message });
    }
};

exports.createReview = async (req, res) => {
    try {
      const { rating, name, email, message, productId} = req.body;
  
      // Ensure required fields are provided
      if (!rating || !message || !name) {
        return res.status(400).json({ success: false, message: 'Missing required fields' });
      }
  
      // Create new review
      const newReview = new Review({
        rating,
        message,
        name,
        email,
        productId
      });
  
      await newReview.save();
  
      return res.status(201).json({ success: true, message: 'Review submitted successfully' });
    } catch (error) {
      console.error('Error saving review:', error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  };
  

  exports.getReviewById = async (req, res) => {
    try {
        const { product_id } = req.params; // Get productId from the request parameters (URL)
        // Ensure the productId is provided
        if (!product_id) {
            return res.status(400).json({ success: false, message: 'Product ID is required' });
        }

        // Find all reviews for the given productId
        const filter = { workflow_state: 'Approved' };
        const reviews = await Review.find({ productId:product_id }).limit(5);
        // If no reviews are found
        if (reviews.length === 0) {
            return res.status(404).json({ success: false, reviews });
        }

        // Return reviews as the response
        return res.status(200).json({ success: true, reviews });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.likeProduct = async (req, res) => {
    try {
      const { productId } = req.params;
      const { liked } = req.body; // Boolean to indicate whether the product is liked or unliked
  
      if (!productId) {
        return res.status(400).json({ success: false, message: 'Product ID is required' });
      }
  
      // Find the product by ID
      const product = await MarketPlace.findById(productId);
      if (!product) {
        return res.status(404).json({ success: false, message: 'Product not found' });
      }
  
      // Handle like/unlike logic
      if (liked) {
        product.likes += 1; // Increment like count
      } else {
        product.likes -= 1; // Decrement like count
      }
      // Save the updated product
      await product.save();
  
      return res.status(200).json({ success: true, likes: product.likes });
    } catch (error) {
      console.error(error);
      return res.status(500).json({ success: false, message: 'Server error' });
    }
  };

  exports.updateQuantities = async (req, res) => {
    const { products } = req.body; // Products contains productId and quantity
    try {
      // Loop through the products in the order and update their quantities
      for (const product of products) {
        const { productId, quantity } = product;
        const productInDb = await MarketPlace.findById(productId);
  
        if (productInDb) {
          productInDb.quantity -= quantity; // Decrease stock by the purchased quantity
          if (productInDb.stock < 0) productInDb.stock = 0; // Prevent negative stock
  
          await productInDb.save();
        }
      }
  
      res.status(200).json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: "Failed to update product quantities." });
    }
  };  