import { asyncHandler } from "../utils/asyncHandler.js"
import { ApiError } from "../utils/AppError.js"
import { User } from "../models/user.model.js"
import { uploadFile } from "../utils/cloudnary.js"
import { ApiResponse } from "../utils/ApiResponse.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose"


const generateAccessRereshToken = async (userId) => {
    try {
        const user = await User.findById(userId)
        const genreateToken = user.generateAccessToken()
        const rereshToken = user.generateRefreshToken()

        user.refreshToken = rereshToken;
        await user.save({ validateBeforeSave: false })

        return {
            genreateToken,
            rereshToken
        }

    } catch (error) {
        throw new ApiError(500, "something went wrong while generate token");
    }
}

const registerUser = asyncHandler(
    async (req, res) => {
        const { fullname, email, username, password } = req.body;

        // For one by one check
        // if (fullname === "") {
        //     throw new ApiError(
        //         400, "Full name is required"
        //     )
        // }

        // For check multiple
        if (
            [fullname, email, username, password].some((field) => field?.trim() === "")
        ) {
            throw new ApiError(400, "All filed are required")
        }

        // For check from database
        const existed = await User.findOne({
            $or: [{ username }, { email }]
        })
        if (existed) {
            throw new ApiError(409, "Username or email already exists!")
        }

        const avtalocalpath = req.files?.avtar[0]?.path;
        let coverlocalpath;
        if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
            coverlocalpath = req.files?.coverImage[0]?.path;
        }

        if (!avtalocalpath) {
            throw new ApiError(400, "avatar is require")
        }

        const avtar = await uploadFile(avtalocalpath)
        const coverimg = await uploadFile(coverlocalpath)

        if (!avtar) {
            throw new ApiError(400, "avatar is require")
        }

        const user = await User.create({
            fullname,
            avtar: avtar.url,
            coverImage: coverimg?.url || "",
            email,
            password,
            username: username.toLowerCase()
        })

        // - sign is use for not select filed while select query
        const createuser = await User.findById(user._id).select("-password -refreshToken")
        if (!createuser) {
            throw new ApiError(500, "something went wrong while create user")
        }

        return res.status(201).json(
            new ApiResponse(200, createuser, "User registerd Successfully")
        )

    }
)

const loginUser = asyncHandler(
    async (req, res) => {
        const { email, username, password } = req.body

        if (!email && !password) {
            throw new ApiError(400, "Username or email is required")
        }

        const userData = await User.findOne({
            $or: [{ username }, { email }]
        });

        if (!userData) {
            throw new ApiError(404, "User not found!")
        }

        const isVaildPassword = await userData.isPasswordCorrect(password)
        if (!isVaildPassword) {
            throw new ApiError(401, "password does not match")
        }

        const { genreateToken, rereshToken } = await generateAccessRereshToken(userData._id)

        const logginedUser = await User.findById(userData._id).select("-password -refreshToken")

        const options = {
            httpOnly: true,
            secure: true
        }
        return res
            .status(200)
            .cookie("genreateToken", genreateToken, options)
            .cookie("rereshToken", rereshToken, options)
            .json(
                new ApiResponse(200,
                    {
                        user: logginedUser, genreateToken, rereshToken
                    },
                    "User login successfully"
                )
            )

    }
)

const logOut = asyncHandler(
    async (req, res) => {
        await User.findByIdAndUpdate(
            req.user._id,
            {
                $set: {
                    refreshToken: undefined
                }
            },
            {
                new: true
            }
        );

        const options = {
            httpOnly: true,
            secure: true
        }

        return res
            .status(200)
            .clearCookie("genreateToken", options)
            .clearCookie("rereshToken", options)
            .json(
                new ApiResponse(200,
                    {
                    },
                    "User logout successfully"
                )
            )
    }

)

const getrefreshAccessToken = asyncHandler(async (req, res) => {
    const incomeingRefreshToekn = req.body.rereshToken;
    if (!incomeingRefreshToekn) {
        throw new ApiError(401, "unthorised token");
    }

    try {
        const decodeToken = await jwt.verify(
            incomeingRefreshToekn,
            process.env.REFRESH_TOKEN_SECRET
        )
        const user = await User.findById(decodeToken?._id).select("-password")

        if (!user) {
            throw new ApiError(401, 'Invlid access refesh token')
        }

        if (incomeingRefreshToekn !== user?.refreshToken) {
            throw new ApiError(401, 'Refresh token does not match')
        }

        var options = {
            httpOnly: true,
            secure: true
        }
        const { genreateToken, rereshToken } = await generateAccessRereshToken(user?._id);

        return res.status(200)
            .cookie("genreateToken", genreateToken, options)
            .cookie("rereshToken", rereshToken, options)
            .json(
                new ApiResponse(200,
                    {
                        genreateToken, rereshToken
                    },
                    "Access token refreshd"
                )
            )
    } catch (error) {
        throw new ApiError(401, 'something went wrong!', error)
    }

});

const changeCurrentUserPassword = asyncHandler(
    async (req, res) => {
        const { oldpassword, newpassword } = req.body

        if (!oldpassword) {
            throw new ApiError(400, "password is required")
        }
        if (!newpassword) {
            throw new ApiError(400, "new password is required")
        }

        const user = await User.findById(req.user?._id)

        const ispasswordiscorrect = await user.isPasswordCorrect(oldpassword)

        if (!ispasswordiscorrect) {
            throw new ApiError(400, "invild Password")
        }

        user.password = newpassword
        await user.save({ validateBeforeSave: false });

        return res.status(200)
            .json(
                new ApiResponse(200, {}, "Password change successfully.")
            )
    }
)

const getCurrentUser = asyncHandler(async (req, res) => {
    return res.status(200).json(
        new ApiResponse(200, req.user, "User fetch successfully")
    )
})

const updateDetails = asyncHandler(
    async (req, res) => {
        const { fullname, email } = req.body
        if (!fullname || !email) {
            throw new ApiError(400, "All field is reqiored!")
        }

        // For update user 
        const user = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    fullname,
                    email
                }
            },
            {
                new: true
            }  //this is for if you need to return update information
        ).select("-password")

        return res.status(200).json(
            new ApiResponse(200, user, "Account details updated successfully")
        )
    }
)

const updateUserAvtar = asyncHandler(
    async (req, res) => {
        const avtarLocal = req.file?.path

        if (!avtarLocal) {
            throw new ApiError(400, "Avatar is missing")
        }

        const avatar = await uploadFile(avtarLocal);
        if (!avatar.url) {
            throw new ApiError(400, "Error while uploading on avatar")
        }

        const images = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    avtar: avatar.url
                }
            },
            { new: true }
        ).select("-password");

        return res.status(200).json(
            new ApiResponse(200, images, "Avatar updated successfully")
        )
    })

const updateUserCover = asyncHandler(
    async (req, res) => {
        const coverLocal = req.file?.path

        if (!coverLocal) {
            throw new ApiError(400, "Cover is missing")
        }

        const coverimage = await uploadFile(coverLocal);
        if (!coverimage.url) {
            throw new ApiError(400, "Error while uploading on avatar")
        }

        const users = await User.findByIdAndUpdate(
            req.user?._id,
            {
                $set: {
                    coverImage: coverimage.url
                }
            },
            { new: true }
        ).select("-password");

        return res.status(200).json(
            new ApiResponse(200, users, "Cover updated successfully")
        )
    })

const getUserChannel = asyncHandler(
    async (req, res) => {
        const { username } = req.params
        if (!username?.trim()) {
            throw new ApiError(400, "Username is required")
        }

        // For join and get count
        const channel = await User.aggregate([
            {
                $match: {
                    username: username?.toLowerCase()
                },
            },
            {
                // Get Only how many subscriber of user
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: 'subscriptions'
                },
            },
            {
                // Get Only how many subscribed current user
                $lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "subscriber",
                    as: 'subscriptionTo'
                },
            },
            {
                // Additional field purpose
                $addFields: {
                    // Get count of subscriptions
                    subscriptionCount: {
                        $size: "$subscriptions"
                    },
                    // Get count for subscriptionTo
                    subscriptionToCount: {
                        $size: "$subscriptionTo"
                    },
                    isSubScribedTo: {
                        $cond: {
                            // If condition statement
                            // with in statement if user is already subscribed then true truen other wise false.
                            if: { $in: [req.user?._id, "$subscriptions.subscriber"] },
                            then: true,
                            else: false
                        }
                    }
                },
            },
            // Only selected filed is return using $project
            {
                $project: {
                    fullname: 1,
                    username: 1,
                    subscriptionCount: 1,
                    subscriptionToCount: 1,
                    isSubScribedTo: 1,
                    avatar: 1,
                    coverImage: 1,
                    email: 1
                }
            }
        ])

        if (!channel?.length) {
            throw new ApiError(400, "Something went wrong while fetch getuserchannel")
        }

        return res.status(200).json(
            new ApiResponse(200, channel[0], "Fetch date Successfully!")
        )

    }
)

const getWatchHistroy = asyncHandler(
    async (req, res) => {

        const user = await User.aggregate([
            {
                $match: {
                    _id: new mongoose.Types.ObjectId(req.user?._id)
                }
            },
            {
                $lookup: {
                    from: "Video",
                    localField: "watchHistory",
                    foreignField: "_id",
                    as: "watchHistory",
                    pipeline: [
                        {
                            $lookup: {
                                from: "User",
                                localField: "ower",
                                foreignField: "_id",
                                as: "ower",
                                pipeline: [
                                    {
                                        $project: {
                                            fullname: 1,
                                            username: 1,
                                            avatar: 1
                                        }
                                    }
                                ]
                            }
                        },
                        {
                            $addFields: {
                                ower: {
                                    $first: "$ower"
                                }
                            }
                        }
                    ]
                }
            }
        ])

        res.status(200)
            .json(
                new ApiResponse(200, user[0].watchHistory, "Watch history fetch successfully!")
            )
    }
)

export {
    registerUser,
    loginUser,
    logOut,
    getrefreshAccessToken,
    changeCurrentUserPassword,
    getCurrentUser,
    updateDetails,
    updateUserAvtar,
    updateUserCover,
    getUserChannel,
    getWatchHistroy
}