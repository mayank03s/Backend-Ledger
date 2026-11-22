const userModel = require("../models/user.model");
const jwt = require("jsonwebtoken");
const tokenBlackListModel = require("../models/blackList.model")

async function authMiddleware(req, res, next) {
  const token = req.cookies.token || req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({
      message: "Unauthorized access, token is missing",
    });
  }

  const isBlackListed = await tokenBlackListModel.findOne({ token })

  if (isBlackListed) {
    return res.status(401).json({
        message: "Unauthorized access, token is invalid"
    })
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    // console.log("Decoded JWT:", decoded);

    // console.log("JWT userId:", decoded.userId);
    const user = await userModel.findById(decoded.userId);


    // console.log("User found:", user);

    if (!user) {
      return res.status(401).json({
        message: "User associated with this token not found",
      });
    }

    req.user = user;

    next();
  } catch (err) {
    return res.status(401).json({
      message: "Unauthorized access, token is invalid",
    });
  }
}


async function authSystemUserMiddleware(req, res, next) {
  try {
    const token =
      req.cookies?.token ||
      req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({
        message: "Unauthorized access, token is missing",
      });
    }

    // Check blacklist
    const isBlackListed = await tokenBlackListModel.findOne({ token });

    if (isBlackListed) {
      return res.status(401).json({
        message: "Unauthorized access, token is invalid",
      });
    }

    // Verify JWT
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Find system user
    const user = await userModel
      .findById(decoded.id)
      .select("+systemUser");

    if (!user) {
      return res.status(401).json({
        message: "Unauthorized access, user not found",
      });
    }

    // Verify system user privileges
    if (!user.systemUser) {
      return res.status(403).json({
        message: "Forbidden access, not a system user",
      });
    }

    req.user = user;

    next();

  } catch (err) {
    console.error("System User Authentication Error:", err);

    return res.status(401).json({
      message: "Unauthorized access, token is invalid",
    });
  }
}


module.exports = { authMiddleware, authSystemUserMiddleware };
