const express = require('express');
const router = express.Router();

const {designationPageController} = require("../controller/designation_page_controller");
const {isAdmin} = require("../middlewares/isAuthenticated")

router.get("/",isAdmin,designationPageController.designationHomePage)

module.exports = router;