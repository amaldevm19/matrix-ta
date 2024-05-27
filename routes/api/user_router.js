const express = require('express');
const router = express.Router();

const userApiController = require("../../controller/api/user_controller")
const {isAdmin} = require("../../middlewares/isAuthenticated")



router.post('/login',userApiController.loginFunction );
router.post('/signup',userApiController.signupFunction );
router.post('/resetpassword',userApiController.resetPasswordFunction );
router.get('/admin/get-new-users',isAdmin,userApiController.getAdminPgeData );
router.post('/admin/change-user-status',isAdmin,userApiController.changeUserStatus );
router.post('/admin/passwordreset',isAdmin,userApiController.passwordReset );


module.exports = router;