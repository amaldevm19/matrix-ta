const express = require('express');
const router = express.Router();

const clearTemp = require('../middlewares/clear_temp_folder');
const jobsController = require("../controller/jobs_controller");


//Updated Routes
router.get('/', jobsController.getJobsPage );
router.get('/assign-jobs-manually', jobsController.getJobAssignmentPage );
router.get('/assign-jobs-manually-history', jobsController.getJobAssignmentHistoryPage );
router.get('/timesheet-correction',jobsController.getTimesheetCorrectionApplicationPage);
router.get('/attendance-correction',jobsController.getAttendanceCorrectionPage);
router.get('/attendance-correction-history',jobsController.getAttendanceCorrectionHistoryPage);
router.get('/jobslist', jobsController.JobsListPage );
router.get('/search-jobs', jobsController.getJobWiseUserListPage );


module.exports = router;