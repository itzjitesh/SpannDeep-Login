import User from "../models/userModel.js";
import Otp from "../models/otpModel.js"
import { promisify } from "util";
import jwt from "jsonwebtoken";
import dotenv from "dotenv"
import AppError from "../utils/appError.js";
import _ from "lodash";
import catchAsync from "../utils/catchAsync.js";
import crypto from "crypto";
import Email from "../utils/email.js";

dotenv.config({path: './config.env'})

const signToken = (id) => {
  return jwt.sign({ _id: id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = (user, statusCode, res) => {
  const token = signToken(user._id);

  const cookieOptions = {
    expiresIn: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  res.status(statusCode).json({
    status: "success",
    token,
    data: {
      user,
    },
  });
};

const signup = catchAsync(async (req, res, next) => {
  const user = await User.create(req.body);

  // create opt instance on DB
  const otpObject = {
    otp: Math.floor(100000 + Math.random() * 900000),
    expirationTime: new Date().getTime() + 10 * 60000,
    userId: user._id
  }

  const otp = await Otp.create(otpObject);

  const token = signToken(user._id);

  const cookieOptions = {
    expiresIn: new Date(
      Date.now() + process.env.JWT_COOKIE_EXPIRES_IN * 24 * 60 * 60 * 1000
    ),
    httpOnly: true,
  };

  if (process.env.NODE_ENV === "production") cookieOptions.secure = true;

  res.cookie("jwt", token, cookieOptions);

  try {
    await new Email(req.body.email, otp.otp).sendEmailVerificationOtp();

    res.status(201).json({
      status: "success",
      user: {
        email: user.email,
        verified: false,
        message: "OTP has been sent to your email which is valid for 10min from now! Please check your inbox and verify the otp on route /verifyEmail."
      } 
    });

  } catch (err) {
    console.log(err);
    await Otp.findByIdAndDelete(otp._id)

    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }
});

const verifyEmail = catchAsync(async (req, res, next) => {

  if(!req.body.otp) {
   return next(new AppError("Please provide the OTP that has been sent to you on your email!", 404))
  }

  const decode = await promisify(jwt.verify)(req.cookies.jwt, process.env.JWT_SECRET);

  const otp = await Otp.findOne({ userId: decode._id, otp: req.body.otp });

  if (_.isEmpty(otp) || otp.expirationTime.getTime() < new Date().getTime()) {
    return next(
      new AppError(
        "Incorrect OTP or OTP has been expired!",
        406
      )
    );
  }

  const user = await User.findByIdAndUpdate(decode._id, {
    verified: true
  }, { new: true, runValidators: true })

  await Otp.findOneAndDelete({ userId: user._id })

  res.status(200).json({
    status: "success",
    user: {
      email: user.email,
      verified: true
    },
    message: "User email has been verified successfully!"
  })
});

const signin = catchAsync(async (req, res, next) => {
  const { email, password } = req.body;

  if (_.isEmpty(email) || _.isEmpty(password)) {
    return next(new AppError("Please provide username and password!", 400));
  }

  const user = await User.findOne({ email }).select("+password");

  if( user.verified === false ) {
    return next(new AppError("User email have not been verified yet! Please verify it first."))
  }

  if (
    _.isEmpty(user) ||
    !(await user.correctPassword(password, user.password))
  ) {
    return next(new AppError("Incorrect email or password!", 401));
  }

  createSendToken(user, 200, res);
});

const getMe = catchAsync(async (req, res, next) => {
  res.status(200).json({
    status: "success",
    data: {
      user: req.user,
    },
  });
});

const updateMe = catchAsync(async (req, res, next) => {
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        "This route is not for password updates! Please use /updateMyPassword.",
        400
      )
    );
  }
  const updates = Object.keys(req.body);
  const allowedUpdates = ["name", "email", "username"];
  updates.forEach((el) => {
    if (!allowedUpdates.includes(el)) delete req.body[el];
  });

  const user = await User.findByIdAndUpdate(req.user.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    status: "success",
    data: {
      user,
    },
  });
});

const deleteMe = catchAsync(async (req, res, next) => {
  await User.findByIdAndDelete(req.user.id);

  res.status(204).json({
    status: "success",
    data: null,
  });
});

const updatePassword = catchAsync(async (req, res, next) => {
  if (_.isEmpty(req.body.currentPassword)) {
    return next(new AppError("Please provide your current password", 404));
  }

  const user = await User.findById(req.user.id).select("+password");

  if (
    !(await req.user.correctPassword(req.body.currentPassword, user.password))
  ) {
    return next(new AppError("Your current password is wrong!", 401));
  }

  user.password = req.body.password;
  user.passwordConfirm = req.body.passwordConfirm;
  await user.save();

  createSendToken(user, 200, res);
});

const signout = (req, res) => {
  res.cookie("jwt", "loggedout", {
    expires: new Date(Date.now() + 10 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

const forgotPassword = catchAsync(async (req, res, next) => {
  const username = req.body.username;
  if (_.isEmpty(username)) {
    return next(new AppError("Please provide username!", 404));
  }

  const user = await User.findOne({ username });
  if (_.isEmpty(user)) {
    return next(new AppError("There is no user with this username!", 404));
  }

  const resetToken = await user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  try {
    await new Email(user, resetToken).sendPasswordReset();

    res.status(200).json({
      status: "success",
      message: "Token sent to email!",
    });
  } catch (err) {
    console.log(err);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return next(
      new AppError("There was an error sending the email. Try again later!"),
      500
    );
  }

  res.status(200).json({
    status: "success",
    resetToken,
  });
});

const resetPassword = catchAsync(async (req, res, next) => {
  const resetToken = req.params.resetToken;

  const { password, passwordConfirm } = req.body;
  console.log(resetToken);

  if (_.isEmpty(resetToken)) {
    return next(new AppError("Please provide passsword reset token!", 404));
  }

  const hashedToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (_.isEmpty(user)) {
    return next(new AppError("Token is invalid or has expired!", 400));
  }

  user.passwordResetToken = undefined;
  user.passwordResetExpires = undefined;
  user.password = password;
  user.passwordConfirm = passwordConfirm;

  await user.save();

  createSendToken(user, 200, res);
});

export default {
  signup,
  signin,
  getMe,
  updateMe,
  deleteMe,
  updatePassword,
  signout,
  forgotPassword,
  resetPassword,
  verifyEmail
};
