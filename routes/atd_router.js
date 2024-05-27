var express = require('express');
var router = express.Router();
const {atdController} = require("../controller/atd_controller");

router.get('/',atdController.getAtdAttendancePage );

module.exports = router;