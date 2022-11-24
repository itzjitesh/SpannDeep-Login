import mongoose from "mongoose";
import validator from "validator";
import bcrypt from "bcrypt";
import _ from "lodash";

const viewerSchema = new mongoose.Schema({
    Email:{
        type: String,
        required:[true, "Please provide a email"],
        unique: true,
        validator: [validator.isEmail, "Please provide a valid email"],
        trim: true
    },
    password:{
        type: String,
        required: [ true, "Please provide password"],
        minlength: [8, "Password must have atleast 8 characters"],
        maxlength: [16, "Password must have atmost 16 characters"],
        select: false,
        trim: true
    },
    passwordConfirm:{
        type: String,
        required: [true, "Confirm your password"],
        validate:{
            validator: function (passwordConfirm){
                return passwordConfirm === this.password
            },
            message: "Please re-enter the same password"
        }

    },
    phone:{
        type: Number,
        required: [true, "Please provide your Contact No."],
    },
    age: {
        type: Number,
        validate:{
            validator: function(value) {
                if (value < 0) {
                    throw new Error("Age must be positive number")
                }
            },
        },        
        required:[true, "Please provide your age."]
    },
    gender:{
        type: String,
        enum: ["male", "female", "other"],
        required: [true, "Please provide your gender"]
    },
    country:{
        type: String,
        required: [true, "Please provide your country's name"],
        minlength: 3,
        maxlength: 50,
        trim: true
    },
    passwordChangedAt: Date,
    passwordResetToken: String,
    passwordResetExpires: Date
});


viewerSchema.methods.toJSON = function() {
    const userObject = this.toObject()

    delete userObject.__v;
    delete userObject.password;
    delete userObject.passwordChangedAt;
    delete userObject.passwordResetExpires;
    delete userObject.passwordResetToken;

    return userObject
}

viewerSchema.pre("save", async function(next) {
    if(!this.isModified("password")) return next()
    this.password = await bcrypt.hash(this.password, 12)
    this.passwordConfirm = undefined
    next()
})

viewerSchema.pre("save", function(next) {
    if(!this.isModified("password") || this.isNew ) return next()
    this.passwordChangedAt = Date.now() - 1000
    next()
})

viewerSchema.methods.correctPassword = async function(candidatePass, userPass) {
    return await bcrypt.compare(candidatePass, userPass)
}

viewerSchema.methods.changedPasswordAfter = async function(JWTTimeStamp) {
    if (this.passwordChangedAt) {
        return JWTTimeStamp <  this.passwordChangedAt.getTime() / 1000
    }
    return false
}

const Viewer = mongoose.model("Viewer", userSchema)

export default Viewer;