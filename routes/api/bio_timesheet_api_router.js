const express = require('express');
const router = express.Router();
const {bioTimesheetController} = require("../../controller/api/bio_timesheet_api_controller")

router.get("/", bioTimesheetController.getBioTimesheetHomePageData)
router.get("/update-timesheet", bioTimesheetController.updateTimesheetData)
router.get("/download-timesheet", bioTimesheetController.downloadTimesheetData)



module.exports = router;