
const fs = require("node:fs");
let base64 = require('base-64');
const parse = require('csv-parse').parse
const getOrSetFromTna = require("../helpers/15_get_or_set_from_tna");
const {controllerLogger} = require("../helpers/19_middleware_history_logger");

const jobsController = {
   
    PageForUploadJobsTermination: async(req, res)=>{
        await controllerLogger(req);
        return res.render('jobs/UploadJobsTerminationPage',{page_header:"Upload CSV Job list for Termination"} )
    },
    getJobsPage: async (req, res) => {
        try {
            await controllerLogger(req);
            return res.render('jobs',{page_header:"Boimetric Project's Home Page"});
        } catch (error) {
            console.log("Error in getJobsPage function : ", error);
            await controllerLogger(req, error);
            return res.redirect("/")
        }
    },
    getJobAssignmentPage:async (req,res)=>{
        try {
            await controllerLogger(req);
            return res.render('jobs/jobAssignmentPage',{page_header:"Assign Jobs To Employees Using CSV file"})
        } catch (error) {
            console.log("Error in getJobsPage function : ", error);
            await controllerLogger(req, error);
            return res.redirect("/");
        }
    },
    getJobAssignmentHistoryPage:async(req,res)=>{
        try {
            let db = req.app.locals.db;
            let Department = await db.query(`
                SELECT DPTID, Name
                FROM [COSEC].[dbo].[Mx_DepartmentMst]
                `);
            await controllerLogger(req);
            return res.render('jobs/jobAssignmentHistoryPage',{page_header:"View Job Assignment History",Department:Department.recordset})
        } catch (error) {
            console.log("Error in getJobAssignmentHistoryPage function : ", error);
            await controllerLogger(req, error);
            return res.redirect("/");
        }
    },
    getAttendanceCorrectionPage:async(req, res)=>{
        try {
            await controllerLogger(req);
            return res.render('jobs/attendanceCorrectionPage',{page_header:"Attendance Correction Using CSV file"})
        } catch (error) {
            console.log("Error in getJobsPage function : ", error);
            await controllerLogger(req, error);
            return res.redirect("/");
        }
    },
    getAttendanceCorrectionHistoryPage:async(req, res)=>{
        try {
            let db = req.app.locals.db;
            let Department = await db.query(`
                SELECT DPTID, Name
                FROM [COSEC].[dbo].[Mx_DepartmentMst]
                `);
            await controllerLogger(req);
            return res.render('jobs/attendanceCorrectionHistoryPage',{page_header:"View Attendance Correction History",Department:Department.recordset})
        } catch (error) {
            console.log("Error in getJobsPage function : ", error);
            await controllerLogger(req, error);
            return res.redirect("/");
        }
    },
    JobsListPage:async(req, res)=>{
        try {
            let db = req.app.locals.db;
            let Department = await db.query(`
                SELECT DPTID, Name
                FROM [COSEC].[dbo].[Mx_DepartmentMst]
            `);
            await controllerLogger(req);
            return res.render('jobs/jobsListPage',{page_header:"Edit Maximum Allowed Job Hours Per Day",Department:Department.recordset})
        } catch (error) {
            console.log("Error in JobsListPage function : ", error);
            await controllerLogger(req, error);
            return res.redirect("/");
        }
        
    },
    getJobWiseUserListPage: async(req, res)=>{
        try {
            await controllerLogger(req);
            return res.render('jobs/jobWiseUserListPage',{page_header:"Search all users assigned with a given job number"} )
        } catch (error) {
            console.log("Error in getJobWiseUserListPage function : ", error);
            await controllerLogger(req, error);
            return res.redirect("/");
        }
        
    },
    getTimesheetCorrectionApplicationPage:async (req,res)=>{
        try {
            const {status, data, error} = await getOrSetFromTna(`Section?action=get;format=json;`)
            if(status == "ok"){
                await controllerLogger(req);
                return res.render('jobs/timesheetCorrectionPage',{section:data.section,page_header:"Exisiting Timesheet Correction Application"})
            }
            throw error
        } catch (error) {
            console.log("Error in getTimesheetCorrectionApplicationPage function : ", error);
            await controllerLogger(req, error);
            return res.redirect("/");
        }
    },

}

module.exports = jobsController