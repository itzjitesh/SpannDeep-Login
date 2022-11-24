import mongoose from "mongoose"
import validator from "validator"
import bcrypt from "bcryptjs"
import _ from "lodash"

const userSchema = mongoose.Schema({
    email: {
        type: String,
        required: [true, "Please provoide a email."],
        unique: true,
        validate: [validator.isEmail, "Please provide a valid email address."],
        lowercase: true,
        trim: true
    },
    role: {
        type: String,
        enum: ["admin", "user"],
        default: "user"
    },
    password: {
        type: String,
        required: [true, "Please provoide a password"],
        minlength: [8, "Password must have more or equal to 8 characters."],
        maxlength: [16, "Password must have less or equal to 16 characters."],
        select: false,
        trim: true
    },
    passwordConfirm: {
        type: String,
        required: [true, "Please confirm your password"],
        select: false,
        validate: {
            validator: function(passwordConfirm) {
                return passwordConfirm === this.password 
            },
            message: "Passwords are not the same."
        }
    },
    verified: {
        type: Boolean,
        default: false
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date
})

userSchema.methods.toJSON = function() {
    const user = this
    const userObject = user.toObject()

    delete userObject.__v;
    delete userObject.password;
    delete userObject.passwordChangedAt;
    delete userObject.passwordResetExpires;
    delete userObject.passwordResetToken;

    return userObject
}

userSchema.pre("save", async function(next) {
    if(!this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password, 12)
    this.passwordConfirm = undefined
    next()
})

userSchema.pre("save", function(next) {
    if(!this.isModified("password") || this.isNew ) return next()
    this.passwordChangedAt = Date.now() - 1000
    next()
})

userSchema.methods.correctPassword = async function(candidatePass, userPass) {
    return await bcrypt.compare(candidatePass, userPass)
}

userSchema.methods.changedPasswordAfter = async function(JWTTimeStamp) {
    if (this.passwordChangedAt) {
        return JWTTimeStamp <  this.passwordChangedAt.getTime() / 1000
    }
    return false
}

const User = mongoose.model("User", userSchema)

export default User