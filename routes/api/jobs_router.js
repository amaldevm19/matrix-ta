const express = require('express');
const router = express.Router();
const jobsController = require("../../controller/api/jobs_controller")
const {csvupload} = require("../../helpers/14_file_upload_helper");


//Updated Routes
router.post('/register-to-user',jobsController.registerToUser);
router.get('/assignment/history',jobsController.getJobAssignmentHistoryPageData);
router.get('/assignment/history/download',jobsController.downloadJobAssignmentHistory);
router.post('/timesheet-correction',jobsController.getTimesheetCorrectionApplications );
router.post('/approve-timesheet-correction',jobsController.approveTimesheetCorrectionApplications );
router.post('/attendance-correction', jobsController.addAttendanceCorrection);
router.get('/attendance-correction-history-data', jobsController.attendanceCorrectionHistoryPageData);
router.get('/attendance-correction-history-data/download', jobsController.downloadAttendanceCorrectionHistory);
router.get('/joblist', jobsController.getJobList);
router.post('/joblist', jobsController.updateMaxJobHourPerDay);
router.post('/max-jobhr-csv',jobsController.maxJobHrCSV)
router.post('/search-jobs', jobsController.searchJobs);

/* GET Download existing Job Hours assignment*/
router.get('/get-existing-jobhrs', jobsController.downloadExistingJobList);

/* GET Assigned jobs CSV from tna.  */
router.get('/get-assigned-jobs',  jobsController.getAssignedJobs );

//Manually upload jobs from old Jobs Home Page
router.get('/import',jobsController.importJobs );
router.post('/upload',csvupload.single('file'),jobsController.jobsUpload);

//Call this enpoint from Postman to trigger the jobsUploadCSV -- This will update the jobs from CSV file stored in csv folder
router.get('/jobs-upload-via-CSV', jobsController.jobsUploadViaCSV);

/* GET all Jobs JSON from SQL Server */
router.get('/',jobsController.getJobs );

/* [POST] http://{Tna_Proxy_Server_IP:3000}/project */ 
router.post("/",jobsController.addNewJob);

/* [PATCH] http://{Tna_Proxy_Server_IP:3000}/project/[project_id] */
router.put("/", jobsController.updateJob);



module.exports = router;