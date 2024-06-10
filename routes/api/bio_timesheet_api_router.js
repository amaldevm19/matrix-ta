const express = require('express');
const router = express.Router();
const {bioTimesheetController} = require("../../controller/api/bio_timesheet_api_controller")

router.get("/", bioTimesheetController.getBioTimesheetHomePageData)
router.get("/update-timesheet", bioTimesheetController.updateTimesheetData)
router.get("/download-timesheet", bioTimesheetController.downloadTimesheetData)
router.get("/horizontal-report/pending-data",bioTimesheetController.bioTimesheetReportHorizontalPageData)
router.get("/horizontal-report/pending-data/download-timesheet", bioTimesheetController.downloadHorizontalTimesheetData)
router.get("/compare-data", bioTimesheetController.getBioTimesheetComparePageData)
router.get("/compare-data/download", bioTimesheetController.downloadBioTimesheetCompareData)


module.exports = router;