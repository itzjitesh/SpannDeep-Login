import express from "express"
import userController from "../controlllers/userController.js"
import authController from "../controlllers/authController.js"

const router = express.Router()

router.post("/signup", userController.signup) //read
router.post("/signin", userController.signin)
router.post('/signout', userController.signout)

router.post("/verifyEmail", userController.verifyEmail)

router.get("/myProfile", authController.protect, authController.restrictTo("user", "admin"), userController.getMe) // read
router.patch("/updateProfile", authController.protect, authController.restrictTo("user", "admin"), userController.updateMe) // update
router.delete("/deleteProfile", authController.protect, authController.restrictTo("user", "admin"), userController.deleteMe) // delete

router.post("/updatePasword", authController.protect, authController.restrictTo("user", "admin"), userController.updatePassword)

router.post("/forgotPassword", userController.forgotPassword)
router.post("/resetPassword/:resetToken", userController.resetPassword)

export default router