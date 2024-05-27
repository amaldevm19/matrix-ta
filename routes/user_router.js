const express = require('express');
const router = express.Router();

const {isAdmin} = require("../middlewares/isAuthenticated")
const userController = require("../controller/user_controller")


router.get('/login',userController.getLoginPage );
router.get('/logout',userController.getLogoutFunction );
router.get('/signup',userController.getSignupPage );
router.get('/admin',isAdmin,userController.getAdminPge);
router.get('/passwordreset',userController.getResetPasswordPage);


module.exports = router;