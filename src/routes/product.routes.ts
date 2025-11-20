import { Router } from "express"
import { getAllProducts, saveProduct } from "../controllers/product.controller"
import { authenticate, isAdmin } from "../middleware/auth"
import { upload } from "../middleware/upload"

const router = Router()

router.post(
  "/create",
  authenticate,
  isAdmin,
  upload.array("images", 5),
  saveProduct
)

router.get("/", getAllProducts)

export default router