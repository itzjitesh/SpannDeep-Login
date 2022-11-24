import AppError from "../utils/appError.js"

const handleCastErrorDB = err => {
    const message = `Invalid ${err.path}: ${err.value}`
    return new AppError(message, 400)
}

const handleDuplicateErrorDB = err => {
    let message
    if(err.keyValue.username) message = "Username is taken!"

    if(err.keyValue.email) message = "Email address already in use!"

    return new AppError(message, 400)
}

const handleValidationError = err => {
    const errors = Object.values(err.errors).map(el => el.message)
    console.log(errors)
    const message = `Invalid input data: ${errors.join(". ")}`
    return new AppError(message, 400)
}

const handleJwtError = () => {
    return new AppError("Invalid token! Please log in again.", 401)
}

const handleJwtExpireError = () => {
    return new AppError("Your token has expired! Please log in again.", 401)
}

const sendErrorDev = (err, res) => {
    console.log(err)
    res.status(err.statusCode).json({
        status: err.status,
        message: err.message,
        error: err,
        stack: err.stack
    })
}

const sendErrorProd = (err, res) => {
    if(err.isOperational) {
        res.status(err.statusCode).json({
            status: err.status,
            message: err.message
        })
    } else {
        console.log("ERROR 💥", err)
        res.status(500).json({
            status: "error",
            message: "something went very worng!"
        })
    }
}

const globalErrorHandler = (err, req, res, next) => {
    // console.log(err.stack)
    err.statusCode = err.statusCode || 500
    err.status = err.status || "error"

    if (process.env.NODE_ENV === "development") {
        sendErrorDev(err, res)
    } else if (process.env.NODE_ENV === "production") {
        let error = {...err}
        error.message = err.message

        if(err.name === "CastError") error = handleCastErrorDB(error)

        if(err.code === 11000 ) error = handleDuplicateErrorDB(error)

        if(err.name === "ValidationError") error = handleValidationError(error)

        if(err.name === "JsonWebTokenError") error = handleJwtError()

        if(err.name === "TokenExpiredError") error = handleJwtExpireError()
    
        sendErrorProd(error, res)
    }
}

export default globalErrorHandler