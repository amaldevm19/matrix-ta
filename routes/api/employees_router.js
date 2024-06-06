const express = require('express');
const router = express.Router();

const employeesApiController = require("../../controller/api/employees_controller")

router.get('/hour-deduction',employeesApiController.hourDeductionPageData )
router.post('/hour-deduction',employeesApiController.updateHourDeductionData )

module.exports = router;