var express = require('express');
var router = express.Router();
const homeController = require("../controller/home_controller");


router.get('/',homeController.getHome );

module.exports = router;