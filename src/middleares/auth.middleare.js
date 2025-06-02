import { User } from "../models/user.model.js";
import { ApiError } from "../utils/AppError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";

export const verifyJWT = asyncHandler(
    // if res not use then use _
    async (req, _, next) => {
        try {
            const token = req.cookies?.genreateToken || req.header("Authorization")?.replace("Bearer", "")

            if (!token) {
                throw new ApiError(401, 'Unthorized request')
            }

            const decodeToken = await jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)

            const user = await User.findById(decodeToken?._id).select("-password -refreshToken")

            if (!user) {
                throw new ApiError(401, 'Invlid access token')
            }

            req.user = user
            next()
        } catch (error) {
            throw new ApiError(401, "Invild token")
        }
    }
)