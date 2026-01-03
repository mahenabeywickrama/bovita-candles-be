import { Product } from "../models/Product"

export const reduceStock = async (
  productId: string,
  quantity: number
) => {
  const product = await Product.findById(productId)

  if (!product) {
    throw new Error("Product not found")
  }

  if (product.stock < quantity) {
    throw new Error(`Insufficient stock for ${product.title}`)
  }

  product.stock -= quantity
  await product.save()
}

export const restoreStock = async (
  productId: string,
  quantity: number
) => {
  const product = await Product.findById(productId)

  if (!product) return

  product.stock += quantity
  await product.save()
}
