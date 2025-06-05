import { Router } from "express";
import { loginUser, logOut, getrefreshAccessToken, registerUser, getUserChannel, updateDetails, getCurrentUser, updateUserAvtar, updateUserCover, changeCurrentUserPassword, getWatchHistroy } from "../controllers/user.controller.js";
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
router.route("/change-current-user-password").post(verifyJWT, changeCurrentUserPassword)
router.route("/get-current-user").get(verifyJWT, getCurrentUser)
router.route("/update-detail").patch(verifyJWT, updateDetails)
router.route("/update-user-avtar").patch(verifyJWT, upload.single("avatar"), updateUserAvtar)
router.route("/update-user-cover").patch(verifyJWT, upload.single("coverImage"), updateUserCover)
router.route("/getuser-channel/:username").get(verifyJWT, getUserChannel)
router.route("/get-watch-histroy").get(verifyJWT, getWatchHistroy)

export default router