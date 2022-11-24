import User from "../models/userModel.js";
import { promisify } from "util";
import jwt from "jsonwebtoken";
import AppError from "../utils/appError.js";
import _ from "lodash";
import catchAsync from "../utils/catchAsync.js";
import dotenv from "dotenv";

dotenv.config({ path: "./config.env" });

const protect = catchAsync(async (req, res, next) => {
  let token;
  if (
    !_.isEmpty(req.headers.authorization) &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  }

  if (_.isEmpty(token)) {
    return next(
      new AppError("You are not logged in! Please login to get acesss.", 401)
    );
  }

  const decode = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const user = await User.findById(decode._id);

  if (_.isEmpty(user)) {
    return next(
      new AppError(
        "The user belonging to this token does no longer exist!",
        401
      )
    );
  }

  if (await user.changedPasswordAfter(decode.iat)) {
    return next(
      new AppError("User recently changed password! Please login again.", 401)
    );
  }

  req.user = user;

  next();
});

const restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      next(
        new AppError("You do not have permission to perform this action!", 403)
      );
    }
    next();
  };
};

export default {
  protect,
  restrictTo
};
