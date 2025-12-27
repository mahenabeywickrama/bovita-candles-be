import { Router } from "express"
import { initiatePayHere, payHereNotify } from "../controllers/payment.controller"

const router = Router()

router.post("/payhere/:orderId", initiatePayHere)
router.post("/payhere/notify", payHereNotify)

export default router