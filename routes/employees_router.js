const express = require('express');
const router = express.Router();

const employeesController = require("../controller/employees_controller")


router.get('/hour-deduction',employeesController.getHourDeductionPage);
router.get('/max-workhour-settings',employeesController.getMaxWorkHourSettingPage);


module.exports = router;