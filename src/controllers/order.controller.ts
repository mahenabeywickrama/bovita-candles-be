import { Request, Response } from "express"
import { Order, Status } from "../models/Order"
import { AuthRequest } from "../middleware/auth"
import { Product } from "../models/Product";
import { User } from "../models/User";

export const saveOrder = async (req: AuthRequest, res: Response) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" })
    }

    const userId = req.user.sub
    const { items } = req.body

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: "Invalid order items" })
    }

    let total = 0
    const itemsDetailed = []

    for (const it of items) {
      if (it.quantity <= 0) {
        return res.status(400).json({ message: "Invalid quantity" })
      }

      const p = await Product.findById(it.productId)
      if (!p) {
        return res.status(400).json({ message: `Product not found: ${it.productId}` })
      }

      itemsDetailed.push({
        product: p._id,
        title: p.title,
        quantity: it.quantity,
        price: p.price
      })

      total += p.price * it.quantity
    }

    const order = new Order({
      user: userId,
      products: itemsDetailed,
      totalAmount: total,
      status: "PENDING"
    })

    const savedOrder = await order.save()

    res.status(201).json(savedOrder)
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Internal server error" })
  }
}

export const getAllOrders = async (req: Request, res: Response) => {
  try {
    const { status, page = "1", limit = "5" } = req.query

    const filter: any = {}

    if (status && status !== "ALL") {
      filter.status = status
    }

    const pageNumber = parseInt(page as string)
    const pageSize = parseInt(limit as string)
    const skip = (pageNumber - 1) * pageSize

    const totalOrders = await Order.countDocuments(filter)

    const orders = await Order.find(filter)
      .populate("user", "email")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(pageSize)

    res.json({
      orders,
      totalPages: Math.ceil(totalOrders / pageSize),
      currentPage: pageNumber
    })
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch orders" })
  }
}

export const updateOrderStatus = async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params
    const { status } = req.body

    const order = await Order.findById(orderId)

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    order.status = status
    await order.save()

    res.json(order)
  } catch (error) {
    res.status(500).json({ message: "Failed to update status" })
  }
}

// order.controller.ts
export const getOrderById = async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate("user", "name email")
      .populate("products.product", "imageUrls")

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    res.json(order)
  } catch (err) {
    res.status(500).json({ message: "Server error" })
  }
}

export const getDashboardStats = async (_req: Request, res: Response) => {
  try {
    const totalOrders = await Order.countDocuments()
    const pendingOrders = await Order.countDocuments({ status: Status.PENDING })
    const customers = await User.countDocuments({ role: "USER" })

    const revenueAgg = await Order.aggregate([
      { $match: { status: Status.CONFIRMED } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ])

    const revenue = revenueAgg[0]?.total || 0

    const recentOrders = await Order.find()
      .populate("user", "email")
      .sort({ createdAt: -1 })
      .limit(5)

    const last7Days = new Date()
    last7Days.setDate(last7Days.getDate() - 6)
    last7Days.setHours(0, 0, 0, 0)

    // Orders per day
    const ordersPerDay = await Order.aggregate([
      {
        $match: { createdAt: { $gte: last7Days } }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { _id: 1 } }
    ])

    // Revenue per day
    const revenuePerDay = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: last7Days },
          status: Status.CONFIRMED
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          },
          total: { $sum: "$totalAmount" }
        }
      },
      { $sort: { _id: 1 } }
    ])

    // Status breakdown
    const statusBreakdown = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ])

    res.json({
      totalOrders,
      pendingOrders,
      customers,
      revenue,
      recentOrders,
      ordersPerDay,
      revenuePerDay,
      statusBreakdown
    })

  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Dashboard fetch failed" })
  }
}