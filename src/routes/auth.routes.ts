import { Router } from "express"
import {
  getMyDetails,
  handleRefreshToken,
  login,
  register,
  registerAdmin
} from "../controllers/auth.controller"
import { authenticate, isAdmin } from "../middleware/auth"

const router = Router()

router.post("/register", register)
router.post("/login", login)

// api/v1/auth/refresh (public)
router.post("/refresh", handleRefreshToken)

// protected (USER, AUTHOR, ADMIN)
router.get("/me", authenticate, getMyDetails)

// protected
// ADMIN only
// need create middleware for check req is from ADMIN

router.post(
  "/admin/register",
  authenticate,
  isAdmin,
  registerAdmin
)

export default router
