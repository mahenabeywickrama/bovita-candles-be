import { Request, Response } from "express"
import { Order, Status } from "../models/Order"
import { AuthRequest } from "../middleware/auth"
import { Product } from "../models/Product";
import { User } from "../models/User";
import PDFDocument from "pdfkit"

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
    /* ---------------- BASIC STATS ---------------- */

    const totalOrders = await Order.countDocuments()
    const pendingOrders = await Order.countDocuments({ status: Status.PENDING })
    const customers = await User.countDocuments({ role: "USER" })

    const revenueAgg = await Order.aggregate([
      { $match: { status: Status.CONFIRMED } },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ])

    const revenue = revenueAgg[0]?.total || 0

    /* ---------------- RECENT ORDERS ---------------- */

    const recentOrders = await Order.find()
      .populate("user", "email")
      .sort({ createdAt: -1 })
      .limit(5)

    /* ---------------- ORDER STATUS COUNTS ---------------- */

    const statusCounts = await Order.aggregate([
      {
        $group: {
          _id: "$status",
          count: { $sum: 1 }
        }
      }
    ])

    const orderStatusCounts = statusCounts.reduce(
      (acc: Record<string, number>, item) => {
        acc[item._id] = item.count
        return acc
      },
      {
        PENDING: 0,
        CONFIRMED: 0,
        SHIPPED: 0,
        CANCELLED: 0
      }
    )

    /* ---------------- DATE HELPERS ---------------- */

    const todayStart = new Date()
    todayStart.setHours(0, 0, 0, 0)

    const weekStart = new Date()
    weekStart.setDate(weekStart.getDate() - 6)
    weekStart.setHours(0, 0, 0, 0)

    /* ---------------- SNAPSHOTS ---------------- */

    const ordersToday = await Order.countDocuments({
      createdAt: { $gte: todayStart }
    })

    const revenueTodayAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: todayStart },
          status: Status.CONFIRMED
        }
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ])

    const revenueToday = revenueTodayAgg[0]?.total || 0

    const ordersThisWeek = await Order.countDocuments({
      createdAt: { $gte: weekStart }
    })

    const revenueThisWeekAgg = await Order.aggregate([
      {
        $match: {
          createdAt: { $gte: weekStart },
          status: Status.CONFIRMED
        }
      },
      { $group: { _id: null, total: { $sum: "$totalAmount" } } }
    ])

    const revenueThisWeek = revenueThisWeekAgg[0]?.total || 0

    /* ---------------- ALERTS ---------------- */

    const oldPendingOrders = await Order.countDocuments({
      status: Status.PENDING,
      createdAt: { $lt: todayStart }
    })

    const alerts: string[] = []

    if (oldPendingOrders > 0) {
      alerts.push(`${oldPendingOrders} orders pending for more than 24 hours`)
    }

    if (orderStatusCounts.CANCELLED > 10) {
      alerts.push("High cancellation rate detected")
    }

    /* ---------------- ACTIVITY FEED ---------------- */

    const activityFeed = recentOrders.map(order => {
      return `Order #${order._id.toString().slice(-6)} ${order.status.toLowerCase()}`
    })

    /* ---------------- TOP PRODUCTS ---------------- */
    // Assumes Order.items = [{ product, quantity }]

    const topProductsAgg = await Order.aggregate([
      { $unwind: "$items" },
      {
        $group: {
          _id: "$items.product",
          sold: { $sum: "$items.quantity" }
        }
      },
      { $sort: { sold: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: "products",
          localField: "_id",
          foreignField: "_id",
          as: "product"
        }
      },
      { $unwind: "$product" },
      {
        $project: {
          _id: 0,
          name: "$product.name",
          sold: 1
        }
      }
    ])

    /* ---------------- FINAL RESPONSE ---------------- */

    res.json({
      totalOrders,
      pendingOrders,
      customers,
      revenue,

      orderStatusCounts,
      recentOrders,

      alerts,
      activityFeed,
      topProducts: topProductsAgg,

      snapshots: {
        ordersToday,
        revenueToday,
        ordersThisWeek,
        revenueThisWeek
      }
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Dashboard fetch failed" })
  }
}

export const generateOrderReportPDF = async (
  req: Request,
  res: Response
) => {
  try {
    const orders = await Order.find()
      .populate("user", "email")
      .sort({ createdAt: -1 })
      .lean()

    const doc = new PDFDocument({ margin: 40, size: "A4" })

    res.setHeader("Content-Type", "application/pdf")
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=orders-report.pdf"
    )

    doc.pipe(res)

    /* ---------- HEADER ---------- */

    doc
      .fontSize(20)
      .fillColor("#111827")
      .text("Orders Report", { align: "center" })

    doc
      .fontSize(10)
      .fillColor("#6B7280")
      .text(`Generated on ${new Date().toLocaleString()}`, {
        align: "center"
      })

    doc.moveDown(2)

    /* ---------- SUMMARY ---------- */

    doc
      .fontSize(12)
      .fillColor("#374151")
      .text(`Total Orders: ${orders.length}`)
      .moveDown(1)

    /* ---------- TABLE HEADER ---------- */

    const startY = doc.y
    const col = {
      id: 40,
      email: 120,
      status: 320,
      total: 400,
      date: 470
    }

    doc.fontSize(11).fillColor("#1F2937")
    doc.text("Order ID", col.id, startY)
    doc.text("Customer", col.email, startY)
    doc.text("Status", col.status, startY)
    doc.text("Total", col.total, startY)
    doc.text("Date", col.date, startY)

    doc
      .moveTo(40, startY + 15)
      .lineTo(550, startY + 15)
      .stroke()

    /* ---------- TABLE ROWS ---------- */

    let y = startY + 25

    orders.forEach((order, index) => {
      if (y > doc.page.height - 60) {
        doc.addPage()
        y = 50
      }

      if (index % 2 === 0) {
        doc
          .rect(40, y - 5, 510, 20)
          .fill("#F9FAFB")
      }

      // ✅ SAFE EMAIL ACCESS (NO INTERFACE)
      const email =
        typeof order.user === "object" && order.user !== null && "email" in order.user
          ? (order.user as any).email
          : "N/A"

      doc
        .fillColor("#111827")
        .fontSize(10)
        .text(order._id.toString().slice(-6), col.id, y)
        .text(email, col.email, y, { width: 180, ellipsis: true })

      /* Status badge color */
      const statusColor =
        order.status === "CONFIRMED"
          ? "#10B981"
          : order.status === "PENDING"
          ? "#F59E0B"
          : order.status === "SHIPPED"
          ? "#6366F1"
          : "#EF4444"

      doc.fillColor(statusColor).text(order.status, col.status, y)

      doc
        .fillColor("#111827")
        .text(`Rs. ${order.totalAmount.toFixed(2)}`, col.total, y)
        .text(
          new Date(order.createdAt).toLocaleDateString(),
          col.date,
          y
        )

      y += 20
    })

    /* ---------- FOOTER ---------- */

    const addFooter = () => {
      const fy = doc.page.height - doc.page.margins.bottom - 20
      doc
        .fontSize(9)
        .fillColor("#9CA3AF")
        .text("Generated by Admin", 40, fy, {
          align: "center",
          width: doc.page.width - 80
        })
    }

    addFooter()
    doc.on("pageAdded", addFooter)

    doc.end()
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Failed to generate PDF report" })
  }
}
