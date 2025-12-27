import crypto from "crypto"
import { Request, Response } from "express"
import { Order } from "../models/Order"

export const initiatePayHere = async (req: Request, res: Response) => {
  try {
    const order = await Order.findById(req.params.orderId)
      .populate("user", "email")
      .lean()

    if (!order) {
      return res.status(404).json({ message: "Order not found" })
    }

    const merchantId = process.env.PAYHERE_MERCHANT_ID!
    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET!

    const amount = Number(order.totalAmount).toFixed(2)
    const currency = "LKR"

    const hash = crypto
      .createHash("md5")
      .update(
        merchantId +
          order._id +
          amount +
          currency +
          crypto.createHash("md5").update(merchantSecret).digest("hex")
      )
      .digest("hex")
      .toUpperCase()

    const email =
      typeof order.user === "object" && order.user !== null
        ? (order.user as any).email
        : "customer@example.com"

    res.json({
      merchant_id: merchantId,
      return_url: `${process.env.FRONTEND_URL}/payment-success`,
      cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
      notify_url: `${process.env.API_URL}/api/v1/payments/payhere/notify`,
      order_id: order._id,
      items: "Bovita Candles Order",
      currency,
      amount,
      first_name: "Customer",
      last_name: "",
      email,
      phone: "0000000000",
      address: "N/A",
      city: "N/A",
      country: "Sri Lanka",
      hash
    })
  } catch (err) {
    console.error("PayHere init error:", err)
    res.status(500).json({ message: "Payment init failed" })
  }
}

export const payHereNotify = async (req: Request, res: Response) => {
  try {
    const {
      merchant_id,
      order_id,
      payhere_amount,
      payhere_currency,
      status_code,
      md5sig
    } = req.body

    const merchantSecret = process.env.PAYHERE_MERCHANT_SECRET!

    const localMd5 = crypto
      .createHash("md5")
      .update(
        merchant_id +
          order_id +
          payhere_amount +
          payhere_currency +
          status_code +
          crypto.createHash("md5").update(merchantSecret).digest("hex")
      )
      .digest("hex")
      .toUpperCase()

    if (localMd5 !== md5sig) {
      return res.status(400).send("Invalid signature")
    }

    // Status 2 = SUCCESS
    if (status_code === "2") {
      await Order.findByIdAndUpdate(order_id, {
        status: "CONFIRMED",
        paymentStatus: "PAID"
      })
    }

    res.send("OK")
  } catch (error) {
    console.error("PayHere notify error:", error)
    res.status(500).send("ERROR")
  }
}
