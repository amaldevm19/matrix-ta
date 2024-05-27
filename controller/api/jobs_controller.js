// External Packages
const {parse } = require('csv-parse');
const fs = require('fs');
const path = require('path');

const sql = require('mssql');
const ObjectsToCsv = require('objects-to-csv');


const getOrSetFromTna = require("../../helpers/15_get_or_set_from_tna");

const {jobsHelper} = require("../../helpers/17_jobs_helper.js");
const {controllerLogger} = require("../../helpers/19_middleware_history_logger");

const jobsController = {

    //Updated functions
    registerToUser:async(req, res)=>{
        let db = req.app.locals.db;
        try {
            let {jsonData,CreatedBy,DepartmentId} = req.body;
            let jobAssignmentResponse = [];
            for (let index = 0; index < jsonData?.length; index++) {
                const {FromDate, ToDate, JobCode, UserID} = jsonData[index];
                let response = await jobsHelper.assignJobsToEmployees({FromDate, ToDate, JobCode, UserID,db});
                jobAssignmentResponse.push(response)
                await db.query(`
                INSERT INTO [TNA_PROXY].[dbo].[Px_JobsAssignHistory]
                (UserID,JobCode,FromDate,ToDate,Status,Message,CreatedBy,DepartmentId)
                VALUES('${UserID}','${JobCode}','${FromDate}','${ToDate}','${response.Status}','${response.Message}','${CreatedBy}','${DepartmentId}');
                `);
            }
            await controllerLogger(req)
            return res.status(200).json({status:"ok", data:jobAssignmentResponse,error:''})
        } catch (error) {
            console.log("Error in registerToUser function : ",error);
            await controllerLogger(req,error)
            return res.status(200).json({status:"not ok", error:error.message,data:""})
        }

    },
    getJobAssignmentHistoryPageData:async(req,res)=>{
        try {
            const{page,size,UserID,CreatedBy,JobCode,FromDate,ToDate,CreatedAt,DepartmentId,Status} = req.query;
            let firstRow = ((page-1) * size)+1
            let lastRow = page * size;
            let whereClause = `WHERE 
            ('${UserID}' IS NULL OR '${UserID}'='' OR UserID = '${UserID}') AND
            ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = '${DepartmentId}') AND
            ('${JobCode}' IS NULL OR '${JobCode}'='' OR JobCode = '${JobCode}') AND
            ('${CreatedBy}' IS NULL OR '${CreatedBy}'='' OR CreatedBy = '${CreatedBy}') AND
            ('${CreatedAt}' IS NULL OR '${CreatedAt}'='' OR  CONVERT(DATE, CreatedAt) = CAST('${CreatedAt}' AS DATE)) AND
            ('${Status}' IS NULL OR '${Status}'='' OR Status = '${Status}') AND
            (('${FromDate}'='' AND '${ToDate}'='') OR (FromDate >= '${FromDate}' AND ToDate <='${ToDate}'))`
           
            const jobsAssignmentHistoryData = await req.app.locals.db.query(`
            SELECT 
                Subquery.*,
                DepartmentMst.Name AS DepartmentName
            FROM(  
                SELECT
                    Id, UserID, JobCode, FromDate, ToDate, Status, Message,CreatedBy,DepartmentId,CreatedAt,
                    ROW_NUMBER() OVER (ORDER BY Id) AS RowNum
                FROM [TNA_PROXY].[dbo].[Px_JobsAssignHistory]
                ${whereClause}
            ) AS Subquery
            JOIN [COSEC].[dbo].[Mx_DepartmentMst] AS DepartmentMst ON CONVERT(numeric(6,0), Subquery.DepartmentId) = DepartmentMst.DPTID
            WHERE RowNum BETWEEN ${firstRow} AND ${lastRow}
            `);
            let totalCount = await req.app.locals.db.query( `SELECT COUNT(*) AS TotalRowCount FROM [TNA_PROXY].[dbo].[Px_JobsAssignHistory] ${whereClause}`)
            let lastPage = Math.ceil(totalCount.recordset[0].TotalRowCount / size)
            await controllerLogger(req)
            return res.status(200).json({status:"ok", last_page:lastPage, data:jobsAssignmentHistoryData.recordset})
        } catch (error) {
            console.log("Error in getJobAssignmentHistoryPageData function : ", error)
            await controllerLogger(req, error)
        }
    },
    downloadJobAssignmentHistory:async(req,res)=>{
        try {
            const{UserID,CreatedBy,JobCode,FromDate,ToDate,CreatedAt,DepartmentId,Status} = req.query;
            let db = req.app.locals.db;
            let whereClause = `WHERE 
            ('${UserID}' IS NULL OR '${UserID}'='' OR UserID = '${UserID}') AND
            ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = '${DepartmentId}') AND
            ('${JobCode}' IS NULL OR '${JobCode}'='' OR JobCode = '${JobCode}') AND
            ('${CreatedBy}' IS NULL OR '${CreatedBy}'='' OR CreatedBy = '${CreatedBy}') AND
            ('${CreatedAt}' IS NULL OR '${CreatedAt}'='' OR  CONVERT(DATE, CreatedAt) = CAST('${CreatedAt}' AS DATE)) AND
            ('${Status}' IS NULL OR '${Status}'='' OR Status = '${Status}') AND
            (('${FromDate}'='' AND '${ToDate}'='') OR (FromDate >= '${FromDate}' AND ToDate <='${ToDate}'))`

            const jobsAssignmentHistoryData = await db.query(`
            SELECT 
                Subquery.*,
                DepartmentMst.Name AS DepartmentName
            FROM(  
                SELECT
                    Id, UserID, JobCode, FromDate, ToDate, Status, Message,CreatedBy,DepartmentId,CreatedAt
                FROM [TNA_PROXY].[dbo].[Px_JobsAssignHistory]
                ${whereClause}
            ) AS Subquery
            JOIN [COSEC].[dbo].[Mx_DepartmentMst] AS DepartmentMst ON CONVERT(numeric(6,0), Subquery.DepartmentId) = DepartmentMst.DPTID
            `);
            await controllerLogger(req)
            return res.status(200).json({status:"ok", data:jobsAssignmentHistoryData.recordset, error:""})
        } catch (error) {
            console.log("Error in downloadJobAssignmentHistory function : ", error)
            await controllerLogger(req, error)
            return res.status(200).json({status:"not ok",error:error, data:""})
        }
    },
    getTimesheetCorrectionApplications:async(req, res)=>{
        try {
            const {dateRange, section, application_status} = req.body;
            const {status, data, error} = await getOrSetFromTna(`timesheet-correction-application?action=get;format=json;date-range=${dateRange};application-status=${application_status};Range=Section;ID=${section};`)
            if(status =="ok"){
                await controllerLogger(req)
                return res.status(200).json({status:status, data:data})
            }else{
                await controllerLogger(req)
                return res.status(200).json({status:"failed", message:error,data:""})
            }
        } catch (error) {
            console.log("Error in getTimesheetCorrectionApplications function : ",error);
            await controllerLogger(req,error)
            return res.status(200).json({status:"failed", message:error,data:""})
        }
    },
    approveTimesheetCorrectionApplications:async(req,res)=>{
        try {
            let applicationData = req.body;
            let responsestatus = []
            for(let index=0; index < applicationData.length; index++){
                let element = applicationData[index];
                const {error} = await getOrSetFromTna(`timesheet-correction-authorization?action=set;userid=${element.userId};application-id=${element.applicationId};verdict=1`)
                if(error){
                    responsestatus.push({userId:element.userId,applicationId:element.applicationId,responsestatus:"failed" })
                }else{
                    responsestatus.push({userId:element.userId,applicationId:element.applicationId,status:"Approved" })
                }
            }
            if(responsestatus){
                await controllerLogger(req)
                return res.status(200).json({status:"ok", data:responsestatus})
            }
        } catch (error) {
            console.log("Error in approveTimesheetCorrectionApplications function : ",error);
            await controllerLogger(req,error)
            return res.status(200).json({status:"failed", message:error,data:""})
        }
        
    },
    addAttendanceCorrection:async(req,res)=>{
        try {
            let db = req.app.locals.db;
            let {jsonData,CreatedBy, DepartmentId} = req.body;
            let attendanceResponse =[];
            let attendanceError = false;
            for(let i=0;i<jsonData.length;i++){
                let userID = jsonData[i].UserID;
                let inTime = `${jsonData[i].AttendanceDate.replaceAll("/","")}${jsonData[i].InTime.replaceAll(":","")}00`;
                let outTime = null;
                let inHour = parseInt(jsonData[i].InTime.substr(0, 2))
                let outHour = parseInt(jsonData[i].OutTime.substr(0, 2))
                if(inHour > outHour){
                    let dateString = jsonData[i].AttendanceDate.replaceAll("/","");
                    let day = parseInt(dateString.substr(0, 2));
                    let month = parseInt(dateString.substr(2, 2));
                    let year = parseInt(dateString.substr(4, 4));
                    let initialDate = new Date(year, month - 1, day);
                    initialDate.setDate(initialDate.getDate() + 1);
                    let updatedDay = initialDate.getDate();
                    let updatedMonth = initialDate.getMonth() + 1; // Month is 0-based
                    let updatedYear = initialDate.getFullYear();
                    let updatedDateString = (updatedDay < 10 ? "0" : "") + updatedDay + (updatedMonth < 10 ? "0" : "") + updatedMonth + updatedYear;
                    outTime = `${updatedDateString}${jsonData[i].OutTime.replaceAll(":","")}00`;
                }else{
                    outTime = `${jsonData[i].AttendanceDate.replaceAll("/","")}${jsonData[i].OutTime.replaceAll(":","")}00`;
                }

                try {
                    const inTimeResponse = await getOrSetFromTna(`events?action=set;userid=${userID};event-datetime=${inTime};in-out=0;dtype=21;did=2;`)
                    const outTimeResponse = await getOrSetFromTna(`events?action=set;userid=${userID};event-datetime=${outTime};in-out=0;dtype=21;did=2;`)
                    if(inTimeResponse.status == "ok" && outTimeResponse.status == "ok"){
                        let data = {Index:i+1,UserID:userID,AttendanceDate:jsonData[i].AttendanceDate,InTime:jsonData[i].InTime,OutTime:jsonData[i].OutTime, Status:"success", Message:`${inTimeResponse.data};${outTimeResponse.data}`,CreatedBy, DepartmentId}
                        attendanceResponse.push(data)
                        await jobsHelper.addAttendanceCorrectionToDb(db,data)
                    }else{
                        attendanceError = true;
                        let data = {Index:i+1,UserID:userID,AttendanceDate:jsonData[i].AttendanceDate,InTime:jsonData[i].InTime,OutTime:jsonData[i].OutTime, Status:"failed", Message:`${inTimeResponse.error};${outTimeResponse.error}`,CreatedBy, DepartmentId}
                        attendanceResponse.push(data)
                        await jobsHelper.addAttendanceCorrectionToDb(db,data)
                    }
                } catch (error) {
                    throw error
                }
            }
            await controllerLogger(req)
            return res.status(200).json({status:"ok", data:attendanceResponse,attendanceError, error:""})
        } catch (error) {
            console.log("Error in addAttendanceCorrection function : ",error);
            await controllerLogger(req,error)
            return res.status(200).json({status:"not ok", data:"",error:error.message})
        }
    },
    attendanceCorrectionHistoryPageData:async(req,res)=>{
        try {
            const{page,size,UserID,CreatedBy,FromDate,ToDate,CreatedAt,DepartmentId,Status} = req.query;
            let db = req.app.locals.db;
            let firstRow = ((page-1) * size)+1
            let lastRow = page * size;

            let whereClause = `WHERE 
            ('${UserID}' IS NULL OR '${UserID}'='' OR UserID = '${UserID}') AND
            ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = '${DepartmentId}') AND
            ('${CreatedBy}' IS NULL OR '${CreatedBy}'='' OR CreatedBy = '${CreatedBy}') AND
            ('${CreatedAt}' IS NULL OR '${CreatedAt}'='' OR  CONVERT(DATE, CreatedAt) = CAST('${CreatedAt}' AS DATE)) AND
            ('${Status}' IS NULL OR '${Status}'='' OR Status = '${Status}') AND
            (('${FromDate}'='' AND '${ToDate}'='') OR AttendanceDate BETWEEN '${FromDate}' AND '${ToDate}')`
           
            const attendanceCorrectedData = await db.query(`
            SELECT 
                Subquery.*,
                DepartmentMst.Name AS DepartmentName
            FROM (
                SELECT
                    Id, UserID, AttendanceDate, InTime, OutTime, Status, Message,CreatedBy,DepartmentId,CreatedAt,
                    ROW_NUMBER() OVER (ORDER BY Id) AS RowNum
                FROM [TNA_PROXY].[dbo].[Px_AttendCorre]
                ${whereClause}
                
            ) AS Subquery
            JOIN [COSEC].[dbo].[Mx_DepartmentMst] AS DepartmentMst ON CONVERT(numeric(6,0), Subquery.DepartmentId) = DepartmentMst.DPTID
            WHERE RowNum BETWEEN ${firstRow} AND ${lastRow}
            `);
            let totalCount = await db.query( `SELECT COUNT(*) AS TotalRowCount FROM [TNA_PROXY].[dbo].[Px_AttendCorre] ${whereClause}`)
            let lastPage = Math.ceil(totalCount.recordset[0].TotalRowCount / size)
            await controllerLogger(req)
            return res.status(200).json({status:"ok", last_page:lastPage, data:attendanceCorrectedData.recordset})
        } catch (error) {
            console.log("Error in attendanceCorrectionHistoryPageData function : ", error)
            await controllerLogger(req, error)
        }
    },
    downloadAttendanceCorrectionHistory:async(req,res)=>{
        try {
            const{UserID,CreatedBy,FromDate,ToDate,CreatedAt,DepartmentId,Status} = req.query;
            let db = req.app.locals.db;
            let whereClause = `WHERE 
            ('${UserID}' IS NULL OR '${UserID}'='' OR UserID = '${UserID}') AND
            ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = '${DepartmentId}') AND
            ('${CreatedBy}' IS NULL OR '${CreatedBy}'='' OR CreatedBy = '${CreatedBy}') AND
            ('${CreatedAt}' IS NULL OR '${CreatedAt}'='' OR  CONVERT(DATE, CreatedAt) = CAST('${CreatedAt}' AS DATE)) AND
            ('${Status}' IS NULL OR '${Status}'='' OR Status = '${Status}') AND
            (('${FromDate}'='' AND '${ToDate}'='') OR AttendanceDate BETWEEN '${FromDate}' AND '${ToDate}')`
            const attendanceCorrectedData = await db.query(`
            SELECT 
                Subquery.*,
                DepartmentMst.Name AS DepartmentName
            FROM (
                SELECT
                    Id, UserID, AttendanceDate, InTime, OutTime, Status, Message,CreatedBy,DepartmentId,CreatedAt
                FROM [TNA_PROXY].[dbo].[Px_AttendCorre]
                ${whereClause}
            ) AS Subquery
            JOIN [COSEC].[dbo].[Mx_DepartmentMst] AS DepartmentMst ON CONVERT(numeric(6,0), Subquery.DepartmentId) = DepartmentMst.DPTID
            `);
            await controllerLogger(req)
            return res.status(200).json({status:"ok", data:attendanceCorrectedData.recordset, error:""});
        } catch (error) {
            console.log("Error in downloadAttendanceCorrectionHistory function : ", error)
            await controllerLogger(req, error)
            return res.status(200).json({status:"not ok",error:error, data:""})
        }
    },
    getJobList:async(req,res)=>{
        try {
            let db = req.app.locals.db;
            let page = req.query.page;
            let pageSize = req.query.size;
            let searchField = req.query.searchField;
            let {joblist, lastPage} = await jobsHelper.getJobListFromTnaproxy(db,page,pageSize,searchField);
            
            if(joblist){
                await controllerLogger(req)
                return res.status(200).json({status:"OK", last_page:lastPage, data:joblist.recordset})
             }
           
            throw new Error("Error in getJobListFromTnaproxy function")
        } catch (error) {
            console.log("Error in getJobList function : ",error)
            await controllerLogger(req, error)
            return res.status(200).json({status:"failed",last_page:"", data:"",error:error})
        }

    },
    updateMaxJobHourPerDay: async(req, res)=>{
        let db = req.app.locals.db;
        let {MaxJobHourPerDay,BreakHour,TravelHour,ProjectType, JobCode, UpdatedBy, Department} = req.body
        // console.log(`MaxJobHourPerDay=${MaxJobHourPerDay},BreakHour=${BreakHour},TravelHour=${TravelHour},ProjectType=${ProjectType}, JobCode=${JobCode}, `)
        try {
            let response = await jobsHelper.updateMaxJobHourPerDay(db,MaxJobHourPerDay,BreakHour,TravelHour,ProjectType,JobCode, UpdatedBy,Department)
            if(response.status === true){
                await controllerLogger(req)
                return res.status(200).json({status:"ok",error:"",data:{MaxJobHourPerDay,BreakHour,TravelHour,ProjectType,UpdatedBy,Department}})
            }else{
                return res.status(200).json({status:"not ok",error:"Failed to update; Please check ProjectType and TravelHour",data:{MaxJobHourPerDay,BreakHour,TravelHour,ProjectType,UpdatedBy,Department}})
            }

        } catch (error) {
            console.log("Error in updateMaxJobHourPerDay function : ",error)
            await controllerLogger(req,error)
            return res.status(200).json({status:"not ok",error:error.message,data:""})
        }
    },
    maxJobHrCSV: async(req, res)=>{
        let {jsonData,UpdatedBy} = req.body;
        let db = req.app.locals.db;
        try {
            let responseStatus = []
            for (let index = 0; index < jsonData.length; index++) {
                const element = jsonData[index];
                if(!element.DepartmentId){
                    element.DepartmentId = UpdatedBy;
                }
                let response = await jobsHelper.updateMaxJobHourPerDay(
                    db,
                    element.MaxJobHourPerDay,
                    element.BreakHour,
                    element.TravelHour,
                    element.ProjectType,
                    element.JobCode, 
                    UpdatedBy,
                    element.DepartmentId
                )
                if(response.status === true){
                    responseStatus.push({
                        RowNum:element.RowNum,
                        JobCode:element.JobCode,
                        MaxJobHourPerDay:element.MaxJobHourPerDay,
                        BreakHour:element.BreakHour,
                        TravelHour: element.TravelHour,
                        ProjectType:element.ProjectType,
                        DepartmentId: element.DepartmentId,
                        Status:`Success`,
                        Message:response.message
                    })
                }else{
                    responseStatus.push({
                        RowNum:element.RowNum,
                        JobCode:element.JobCode,
                        MaxJobHourPerDay:element.MaxJobHourPerDay,
                        BreakHour:element.BreakHour,
                        TravelHour: element.TravelHour,
                        ProjectType:element.ProjectType,
                        DepartmentId: element.DepartmentId,
                        Status:`Fail`,
                        Message:response.message
                    })
                }
            }
            if(responseStatus.length>0){
                await controllerLogger(req)
                return res.status(200).json({status:"ok",error:"",data:responseStatus})
            }
        } catch (error) {
            console.log("Error in maxJobHrCSV function : ",error)
            await controllerLogger(req,error)
            return res.status(200).json({status:"not ok",error:error.message,data:""})
        }
    },
    searchJobs:async(req, res)=>{
        try {
            let {jobId} = req.body;
            let db = req.app.locals.db;
            let assignedJobs = await db.query(`
            SELECT um.Name,um.UserID, jjt.FromDate, jjt.ToDate 
            FROM [COSEC].[dbo].[Mx_JPCUserJobTrn] jjt 
            INNER JOIN [COSEC].[dbo].[Mx_UserMst] um 
            ON jjt.UserID = um.UserID 
            WHERE jjt.JobCode='${jobId}'
            `);
            if(assignedJobs.recordset.length > 0){
                await controllerLogger(req)
                return res.status(200).json({status:"OK", data:assignedJobs.recordset, error:""})
            }else{
               throw `No users found in ${jobId}`; 
            }
        } catch (error) {
            console.log("Error in searchJobs function : ", error)
            await controllerLogger(req, error)
            return res.status(200).json({status:"OK", data:[], error})
        }
    },
    getAssignedJobs:async (req,res)=>{
        try {
            let db = req.app.locals.db;
            let {ToDay} = req.query
            let db_response = await db.query(`
            SELECT * 
            FROM [COSEC].[dbo].[Mx_JPCUserJobTrn] 
            WHERE FromDate < '${ToDay} 00:00:00.000' AND ToDate > '${ToDay}  00:00:00.000'
            `);
            if(db_response && db_response.recordset.length > 0){
                await controllerLogger(req)
                return res.status(200).json({data:db_response.recordset,message:"ok"})
            }else{
                throw {message:"No Records found"}
            }
        } catch (error) {
            console.log("Error in getAssignedJobs function : ", error)
            await controllerLogger(req,error);
            return res.status(400).json(error.message)
        }
    },
    //Import jobs was in old home page
    importJobs:async(req, res)=>{
        try {
            let db = req.app.locals.db;
            let filepath = path.join(__dirname,'..','..','public','uploads', 'temp','tempFile.csv');
            const data = fs.readFileSync(filepath);
            parse(data, async (err, records) => {
                if (err) {
                    console.error(err)
                    return res.status(400).json({success: false, message: 'An error occurred'})
                }
                const columns = records[0];
                let jobs = records.splice(1);
                let rows = [];
                for (let index = 0; index < jobs.length; index++) {
                    const job = jobs[index];
                    const obj = {};
                    columns.forEach((column, index)=>{
                        obj[column] = job[index];    
                    })
                    try {
                        let db_response = await db.query(`
                        UPDATE [COSEC].[dbo].[Mx_JPCJobMst] 
                        SET ToDate='${obj.ToDate + " 00:00:00.000"}' 
                        WHERE JobCode='${obj.JobCode}' AND CONVERT(date,ToDate) < CONVERT(date,GETDATE())
                        `);
                        if(db_response && db_response.rowsAffected[0] > 0){
                            obj.status = "Success"
                        }else{
                            throw {message:"Database error"}
                        }
                    } catch (error) {
                        console.log(error);
                        obj.status = "Failed"
                    }
                    console.log(obj)
                    rows.push(obj) 
                }
                await controllerLogger(req)
                return res.json({data:rows})
            })
        } catch (error) {
            console.log("Error in importJobs function : ", error)
            await controllerLogger(req,error)
        }
        
    },
    jobsUpload: async (req, res) =>{
        try {
            const file = req.file;
            const data = fs.readFileSync(file.path)
            parse(data,async (err, records)=>{
                if(!err){
                    await controllerLogger(req)
                    return res.json({data: records, status:"ok", error:""})
                } 
                throw err
            })
        } catch (error) {
            console.log("Error in jobsUpload function : ", error)
            await controllerLogger(req, error)
            return res.status(400).json({status:"not ok",error:error, data:""});
        }

    },
    //To upload jobs from csv stored in csv folder
    jobsUploadViaCSV: async (req, res) =>{
        try {
            let db = req.app.locals.db;
            const data = fs.readFileSync(path.join(__dirname,"..","..","csv","jobs","jobs43.csv"))
            parse(data,async(err, records)=>{
                if(err){
                    console.log(err);
                    throw{ message: err};
                } else{
                    const columns = records[0];
                    let failed =[];
                    let success = [];
                    const rows = await Promise.all(records.splice(1).map(async (arr)=>{
                        const obj = {};
                        columns.forEach((column, index)=>{
                            obj[column] = arr[index];
                        })
                        if(obj.JobCode.length <= 15){
                        let db_response = await db.query(`
                        INSERT INTO [COSEC].[dbo].[Mx_JPCJobMst] (FromDate, ToDate, CCID, JobCode, Name, JobID, MergeJob, Allowance) 
                        VALUES ('${obj.FromDate}', '${obj.ToDate}', '1','${obj.JobCode}','${obj.Name.replace(/[^A-Za-z0-9-_.()\[\]]/g, '').slice(0,30).trim()}', '${obj.JobID}','0','0')`);
                            if(db_response?.rowsAffected[0] > 0){
                                success.push({...obj,status:"Success"})
                            }else{
                                failed.push( {...obj,status:"Failed"})
                            }
                        }else{
                            failed.push( {...obj,status:"Failed"})
                        }
                        
                    }))
                    if(rows){
                        const failed_csv = new ObjectsToCsv(failed);
                        await failed_csv.toDisk(path.join(__dirname,"..","..","csv","failed.csv"));
                        const success_csv = new ObjectsToCsv(success);
                        await success_csv.toDisk(path.join(__dirname,"..","..","csv","success.csv"));
                        await controllerLogger(req)
                        return res.status(201).json({status:"ok",error:"",data:rows});
                    }
                   
                }
            })   
        } catch (error) {
            await controllerLogger(req, error)
            console.log(`Error in jobsUploadViaCSV function : ${error.message}`)
            return res.status(400).json({status:"failed",error:error.message});
        }
       
    },
    //Dummy for testing
    getJobs: async (req, res) => {
        try {
            const jobs = await req.app.locals.db.query('SELECT * FROM Mx_JPCJobMst');
            await controllerLogger(req)
            return res.json(jobs.recordset);
        } catch (error) {
            console.log("Error in getJobs function : ", error)
            await controllerLogger(req, error)
        }
    },

    //API Calls from ERP
    addNewJob:async (req, res)=>{
        try {
            let db = req.app.locals.db;
            let {project_id,project_start, project_name} = req.body;
            let currentDate = new Date();
            let futureDate = new Date();
            if(!project_start){
                project_start = JSON.stringify(currentDate).replace("T"," ").slice(1,-2);
            }else{
                project_start = project_start + " 00:00:00.000"
            }
            
            let project_end = JSON.stringify(new Date(futureDate.setFullYear(currentDate.getFullYear() + 10))).replace("T"," ").slice(1,-2);
            if(!project_id || !project_name ){
                throw {message:"Project ID, Project Name and Project End date are required"};
            } 
            try {
                let project_id_array = project_id.split('-')
                if(project_id_array.length > 3){
                    project_id = project_id_array[0]+'-'+project_id_array[1]+'-'+project_id_array[2]+'-'+parseInt(project_id_array[3])
                }
                let job_exist = await db.query(`SELECT * FROM [COSEC].[dbo].[Mx_JPCJobMst] WHERE JobCode='${project_id}' `);
                project_name = project_name.replace(/[^A-Za-z0-9-_.()\[\] ]/g,'').slice(0,30).trim();
                let last_added_job = await db.query(`SELECT TOP 1 * FROM [COSEC].[dbo].[Mx_JPCJobMst] ORDER BY JobID DESC`);
                if(!job_exist.recordset[0]?.JobCode){
                    let db_response = await db.query(`INSERT INTO [COSEC].[dbo].[Mx_JPCJobMst] (FromDate, ToDate, CCID, JobCode, Name, JobID, MergeJob, Allowance) VALUES ('${project_start}', '${project_end}', '1','${project_id}','${project_name}', '${parseInt(last_added_job.recordset[0].JobID)+1}','0','0')`);
                    let px_db_response = await db.query(`INSERT INTO [TNA_PROXY].[dbo].[Px_JPCJobMst] (JobCode, JobName,FromDate, ToDate,MaxJobHourPerDay,TravelHour,BreakHour,ProjectType ) VALUES ('${project_id}','${project_name}','${project_start}', '${project_end}','11.0','1.0','1.0','Camp')`);
                    
                    if(db_response && db_response.rowsAffected[0] > 0 && px_db_response && px_db_response.rowsAffected[0] > 0 ){
                        await controllerLogger(req)
                        return res.status(200).json({status:"ok",error:""});
                    }else{
                        throw {message:"DB Error"};
                    }
                }else{
                    throw {message:"Project already exist"}
                }
            } catch (error) {
                throw error
            }
            
        } catch (error) {
            console.log("Error in addNewJob function : ", error)
            await controllerLogger(req,error.message)
            return res.status(200).json({status:"failed",error:error.message});
        }
        
    },
    //API Calls from ERP
    updateJob:async (req, res)=>{
        try {
            let db = req.app.locals.db;
            let {project_name, project_end,project_id} = req.body;
            if(!project_id ) throw {message:"Project ID must be provided"}
            if(project_end)project_end = project_end + " 00:00:00.000";
            let project_id_array = project_id.split('-')
            if(project_id_array.length > 3){
                project_id = project_id_array[0]+'-'+project_id_array[1]+'-'+project_id_array[2]+'-'+parseInt(project_id_array[3])
            }
            let job_exist = await db.query(`SELECT * FROM [COSEC].[dbo].[Mx_JPCJobMst] WHERE JobCode='${project_id}' `);
            if(project_name){
                project_name = project_name.replace(/[^A-Za-z0-9-_.()\[\] ]/g,'').slice(0,30).trim();
            }
            let assigned_employee_ids = new Set();
            let failed_employees_ids = new Set();
            if(job_exist.recordset[0]?.JobCode){
                let date_compare_status = new Date(Date.parse(project_end)) < new Date(Date.parse(job_exist.recordset[0].ToDate));
                if(project_end && date_compare_status){
                    let all_employees_assigned_this_job =  await db.query(`SELECT * FROM [COSEC].[dbo].[Mx_JPCUserJobTrn] WHERE JobCode='${project_id}'`);
                    let emp_arr = all_employees_assigned_this_job.recordset;
                    for(let i=0;i<emp_arr.length;i++){
                        if(new Date(Date.parse(emp_arr[i].ToDate)) >= new Date(Date.parse(project_end))){
                            try {
                                let db_response = await db.query(`UPDATE [COSEC].[dbo].[Mx_JPCUserJobTrn] SET ToDate='${project_end}' WHERE UserID='${emp_arr[i].UserID}' AND JobCode='${project_id}'`);
                                if(db_response?.rowsAffected[0] == 0){
                                    failed_employees_ids.add(emp_arr[i].UserID)
                                }else{
                                    assigned_employee_ids.add(emp_arr[i].UserID)
                                }
                            } catch (error) {
                                await controllerLogger(req, error)
                                return res.status(200).json({status:"failed",error:error.message});
                            }
                        }
                    }   
                }
                if((project_name|| project_end)&& failed_employees_ids.size == 0){
                    let db_response = await db.query(`UPDATE [COSEC].[dbo].[Mx_JPCJobMst] SET ${project_end?"ToDate='"+project_end+"'":""}${(project_name&&project_end)?",":""} ${project_name? "Name='"+project_name+"'":""} WHERE JobCode='${project_id}' `);
                    if(db_response?.rowsAffected[0] > 0){
                        if(assigned_employee_ids.size > 0){
                            await controllerLogger(req)
                            return res.status(200).json({status:"ok",error:"",message:`Updated project end date of Employees ${[...assigned_employee_ids].toString()} for the ProjectId: ${project_id} to ${project_end} `});
                        }else{
                            await controllerLogger(req)
                            return res.status(200).json({status:"ok",error:""});

                        }
                    }else{
                        throw {message:"Database error"}
                    }
                }else{
                    throw {message:`Failed to Terminate ProjectId: ${project_id} for EMployees ${[...failed_employees_ids].toString()}`}
                }
               
            }else{
                throw {message:"Project not found"}
            }
        } catch (error) {
            console.log("Error in updateJob function : ", error)
            await controllerLogger(req, error.message)
            return res.status(200).json({status:"failed",error:error.message});
        }
    },
}

module.exports = jobsController