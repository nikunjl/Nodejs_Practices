import { Router } from "express";
import { loginUser, logOut, getrefreshAccessToken, registerUser } from "../controllers/user.controller.js";
import { upload } from "../middleares/multer.middleare.js"
import { verifyJWT } from "../middleares/auth.middleare.js";

const router = Router();

router.route("/register").post(
    upload.fields([
        {
            name: 'avtar',
            maxCount: 1
        },
        {
            name: "coverImage",
            maxCount: 1
        }
    ]),
    registerUser)
router.route("/login").post(loginUser)

// Secured routes
router.route("/logout").post(verifyJWT, logOut)
router.route("/refresh-token").post(getrefreshAccessToken)

export default router