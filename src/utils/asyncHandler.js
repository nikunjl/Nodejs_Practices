const asyncHandler = (requestHandeler) => {
    return (req, res, next) => {
        Promise.resolve(requestHandeler(req, res, next))
            .catch((err) => next(err))
    }
}


export { asyncHandler }

// Try catch type example

// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         fn(req, res, next)
//     } catch (error) {
//         res.status(error.code || 500).json({
//             success: false,
//             message: error.message
//         })
//     }
// }