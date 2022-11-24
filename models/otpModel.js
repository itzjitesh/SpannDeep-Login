import mongoose from "mongoose"

const otpSchema = mongoose.Schema({
    otp: {
        type: Number,
        required: true,
        min: 6
    },
    expirationTime: {
        type: Date,
        required: true
    },
    userId: mongoose.Types.ObjectId
}, { timestamps: true } )

const Otp = mongoose.model("otp", otpSchema)

export default Otp