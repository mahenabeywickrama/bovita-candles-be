import { Request, Response } from "express"
import cloudinary from "../config/cloudinary"
import { Product } from "../models/Product"
import { AuthRequest } from "../middleware/auth"

// CREATE PRODUCT
export const saveProduct = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" })
    }
    
    const { title, description, category, fragrance, size, price, stock } = req.body;

    const files = req.files as Express.Multer.File[];

    if (!files || files.length === 0) {
      return res.status(400).json({ message: "At least one image is required" });
    }

    const imageUrls: string[] = [];

    // Upload each image via upload_stream
    for (const file of files) {
      const result: any = await new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: "bovita-candles" },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        stream.end(file.buffer);  // send buffer data to cloudinary
      });

      imageUrls.push(result.secure_url);
    }

    const newProduct = await Product.create({
      title,
      description,
      category,
      fragrance,
      size,
      price,
      stock: stock ?? 0,
      imageUrls
    });

    return res.status(201).json({
      message: "Product created",
      product: newProduct
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET ALL PRODUCTS
export const getAllProducts = async (req: Request, res: Response) => {
  try {
    const page = parseInt(req.query.page as string) || 1
    const limit = parseInt(req.query.limit as string) || 10
    const skip = (page - 1) * limit

    const products = await Product.find()
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)

    const total = await Product.countDocuments()

    res.status(200).json({
      message: "Products fetched",
      data: products,
      totalPages: Math.ceil(total / limit),
      totalCount: total,
      page
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ message: "Failed to fetch products" })
  }
}
