const express = require('express');
const router = express.Router();
const {atdTimesheetController} = require("../../controller/api/atd_timesheet_api_controller")

router.get("/", atdTimesheetController.getAtdTimesheetHomePageData)
// router.get("/update-timesheet", bioTimesheetController.updateTimesheetData)
// router.get("/download-timesheet", atdTimesheetController.downloadTimesheetData)



module.exports = router;