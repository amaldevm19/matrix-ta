const express = require('express');
const router = express.Router();

const employeesApiController = require("../../controller/api/employees_controller")

router.get('/hour-deduction',employeesApiController.hourDeductionPageData )
router.post('/hour-deduction',employeesApiController.updateHourDeductionData )
router.post('/upload/hour-deduction-csv',employeesApiController.updateHourDeductionViaCSVUpload )

router.get('/max-work-hour',employeesApiController.maxWorkHourPageData )
router.post('/max-work-hour',employeesApiController.updateMaxWorkHourData )
router.post('/upload/max-work-hour-csv',employeesApiController.updateMaxWorkHourViaCSVUpload )

module.exports = router;