import { Router } from "express"
import { payHereNotify } from "../controllers/payment.controller"

const router = Router()

router.post("/payhere/notify", payHereNotify)

export default router