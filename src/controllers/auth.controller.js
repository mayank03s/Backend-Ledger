const userModel = require("../models/user.model");

const jwt = require("jsonwebtoken");

const emailService = require("../services/email.service")

const tokenBlackListModel = require("../models/blackList.model")

/** 
* - user register contoller
* - POST /api/auth/register
*/

async function registerUserController(req, res) {

    const { email, name, password } = req.body; 

    const isUserExists = await userModel.findOne({
        email: email
    });

    if (isUserExists) {
        return res.status(422).json({
            message: "User already exists with this email",
            status: "failed" 
        })
    }

    const user = await userModel.create({
        email, password, name
    })

    const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, {expiresIn: "3d"});

    res.cookie("token", token);

    res.status(201).json({
        user: {
            id: user._id,
            email: user.email,
            name: user.name
        },
        token 
    })

    await emailService.sendRegistrationEmail(user.email, user.name)
}

/**
 * - user login controller
 * - POST /api/auth/login
 */

async function loginUserController(req, res) {
    const { email, password } = req.body;

    const user = await userModel.findOne({ email }).select("+password");  

    if (!user) {
        return res.status(401).json({
            message: "Invalid email or password",
            status: "failed"
        })
    }

    const isPasswordValid = await user.comparePassword(password);

    if (!isPasswordValid) {
        return res.status(401).json({
            message: "Invalid email or password",
        })
    }

    const token = jwt.sign({userId: user._id}, process.env.JWT_SECRET, {expiresIn: "3d"});

    res.cookie("token", token);

    res.status(201).json({
        user: {
            id: user._id,
            email: user.email,
            name: user.name
        },
        token 
    })
}

/**
 * - user Logout controller
 * - POST /api/auth/logout
 */

async function userLogoutController(req, res) {
    const token = req.cookies.token || req.headers.authorization ?.split(" ")[ 1 ]

    if (!token) {
        return res.stauts(200).json({
            message: "User logged out successfully"
        })
    }


    await tokenBlackListModel.create({
        token: token 
    })

    res.clearCookie("token")

    res.status(200).json({
        message: "User logged out successfully"
    })
}

module.exports = { registerUserController, loginUserController, userLogoutController }; 