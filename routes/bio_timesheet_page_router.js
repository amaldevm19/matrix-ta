const express = require('express');
const router = express.Router();

const {bioTimesheetPageController} = require("../controller/bio_timesheet_page_controller");



router.get("/",bioTimesheetPageController.bioTimesheetHomePage)
router.get("/horizontal-report/pending-data",bioTimesheetPageController.bioTimesheetReportHorizontalPage)
router.get("/compare-data",bioTimesheetPageController.bioTimesheetComparePage)

module.exports = router;