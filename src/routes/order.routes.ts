import { Router } from "express"
import { generateOrderReportPDF, getAllOrders, getDashboardStats, getMyOrderById, getMyOrders, getOrderById, saveOrder, updateOrderStatus } from "../controllers/order.controller"
import { authenticate, isAdmin } from "../middleware/auth"

const router = Router()

router.post(
  "/create",
  authenticate,
  saveOrder
)
router.get(
  "/my",
  authenticate,
  getMyOrders
)
router.get(
  "/my/:id",
  authenticate,
  getMyOrderById
)
router.get(
  "/dashboard",
  authenticate,
  isAdmin,
  getDashboardStats
)
router.get("/report", generateOrderReportPDF)
// GET /orders?status=PENDING&page=1&limit=5
router.get("/", authenticate, isAdmin, getAllOrders)
// order.routes.ts
router.get(
  "/:id",
  authenticate,
  isAdmin,
  getOrderById
)
router.put("/:orderId/status", authenticate, isAdmin, updateOrderStatus)

export default router