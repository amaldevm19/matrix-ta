const {sql,ProxyDbPool} = require('../../config/db');
const {controllerLogger} = require("../../helpers/19_middleware_history_logger");
const {copyTimesheetFromCosecToProxyDbFunction} = require('../../helpers/02_timesheet_copier');

const bioTimesheetController ={
    getBioTimesheetHomePageData:async (req, res)=>{
        try {
            await ProxyDbPool.connect();
            const transaction = new sql.Transaction(ProxyDbPool);
            try {
                let {page,size, EmployeeId,FromDate,ToDate,JobCode,DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId} = req.query;
                let firstRow = ((page-1) * size)+1
                let lastRow = page * size;
                await transaction.begin();
                let result = await ProxyDbPool.request().query(`
                SELECT 
                    Subquery.*,
                    DepartmentMst.Name AS DepartmentName,
                    CustomGroup1Mst.Name AS UserCategoryName,
                    CategoryMst.Name AS EmployeeCategoryName,
                    DesignationMst.Name AS DesignationName,
                    SectionMst.Name AS SectionName,
                    BranchMst.Name AS BranchName
                FROM (
                    SELECT
                        Id, UserID, Name, PDate, JobCode, TotalJobTime, BranchId, DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId,CreatedAt,LeaveID,
                        ROW_NUMBER() OVER (ORDER BY Id) AS RowNum
                    FROM [TNA_PROXY].[dbo].[Px_TimesheetMst]
                    WHERE 
                        ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR UserID = '${EmployeeId}') AND
                        ('${JobCode}' IS NULL OR '${JobCode}'='' OR JobCode ='${JobCode}') AND
                        ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                        ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                        ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId?EmployeeCategoryId:0}) AND
                        ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
                        ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
                        (('${FromDate}'='' AND '${ToDate}'='') OR PDate BETWEEN '${FromDate}' AND '${ToDate}')
                ) AS Subquery
                JOIN [COSEC].[dbo].[Mx_DepartmentMst] AS DepartmentMst ON Subquery.DepartmentId = DepartmentMst.DPTID
                JOIN [COSEC].[dbo].[Mx_CustomGroup1Mst] AS CustomGroup1Mst ON Subquery.UserCategoryId = CustomGroup1Mst.CG1ID
                JOIN [COSEC].[dbo].[Mx_CategoryMst] AS CategoryMst ON Subquery.EmployeeCategoryId = CategoryMst.CTGID
                JOIN [COSEC].[dbo].[Mx_DesignationMst] AS DesignationMst ON Subquery.DesignationId = DesignationMst.DSGID
                JOIN [COSEC].[dbo].[Mx_SectionMst] AS SectionMst ON Subquery.SectionId = SectionMst.SECID
                JOIN [COSEC].[dbo].[Mx_BranchMst] AS BranchMst ON Subquery.BranchId = BranchMst.BRCID
                WHERE RowNum BETWEEN ${firstRow} AND ${lastRow}
                `);
                await transaction.commit();
                await transaction.begin();
                let totalCount = await ProxyDbPool.request().query( `
                SELECT COUNT(*) AS TotalRowCount 
                FROM [TNA_PROXY].[dbo].[Px_TimesheetMst] 
                WHERE 
                    ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR UserID = '${EmployeeId}') AND
                    ('${JobCode}' IS NULL OR '${JobCode}'='' OR JobCode ='${JobCode}') AND
                    ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                    ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                    ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId?EmployeeCategoryId:0}) AND
                    ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
                    ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
                    (('${FromDate}'='' AND '${ToDate}'='') OR PDate BETWEEN '${FromDate}' AND '${ToDate}')
                `)
                await transaction.commit();
                let last_page = Math.ceil(totalCount.recordset[0].TotalRowCount / size);
                await controllerLogger(req)
                return res.status(200).json({status:"OK", last_page, data:result.recordset});

            } catch (error) {
                await transaction.rollback();
                throw error;
            }
        } catch (error) {
            console.log("Error in getBioTimesheetHomePageData function : ", error)
            await controllerLogger(req, res)
            return res.status(400).json({status:"not ok",error:error, data:""})
        }finally{
            ProxyDbPool.close();
        }
    },
    updateTimesheetData: async (req, res)=>{
        try {
            await ProxyDbPool.connect();
            try {
                const request = new sql.Request(ProxyDbPool);
                let toDate = new Date();
                toDate.setUTCHours(0, 0, 0, 0);
                let fromDate = new Date();
                fromDate.setDate(fromDate.getDate() - 34);
                fromDate.setUTCHours(0, 0, 0, 0);
                fromDate = fromDate.toISOString().replace("T"," ").replace("Z","");
                toDate = toDate.toISOString().replace("T"," ").replace("Z","");
                console.log(fromDate,toDate)
                let result = await copyTimesheetFromCosecToProxyDbFunction({fromDate,toDate})
                let {page,size, EmployeeId,FromDate,ToDate,JobCode,DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId} = req.query;
                let firstRow = ((page-1) * size)+1
                let lastRow = page * size;
                if(result === 0){
                    let response = await request.query(`
                    SELECT 
                        Subquery.*,
                        DepartmentMst.Name AS DepartmentName,
                        CustomGroup1Mst.Name AS UserCategoryName,
                        CategoryMst.Name AS EmployeeCategoryName,
                        DesignationMst.Name AS DesignationName,
                        SectionMst.Name AS SectionName,
                        BranchMst.Name AS BranchName
                    FROM (
                        SELECT
                            Id, UserID, Name, PDate, JobCode, TotalJobTime, BranchId, DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId,CreatedAt,
                            ROW_NUMBER() OVER (ORDER BY Id) AS RowNum
                        FROM [TNA_PROXY].[dbo].[Px_TimesheetMst]
                        WHERE 
                            ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR UserID = '${EmployeeId}') AND
                            ('${JobCode}' IS NULL OR '${JobCode}'='' OR JobCode ='${JobCode}') AND
                            ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                            ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                            ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId?EmployeeCategoryId:0}) AND
                            ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
                            ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
                            (('${FromDate}'='' AND '${ToDate}'='') OR PDate BETWEEN '${FromDate}' AND '${ToDate}')
                    ) AS Subquery
                    JOIN [COSEC].[dbo].[Mx_DepartmentMst] AS DepartmentMst ON Subquery.DepartmentId = DepartmentMst.DPTID
                    JOIN [COSEC].[dbo].[Mx_CustomGroup1Mst] AS CustomGroup1Mst ON Subquery.UserCategoryId = CustomGroup1Mst.CG1ID
                    JOIN [COSEC].[dbo].[Mx_CategoryMst] AS CategoryMst ON Subquery.EmployeeCategoryId = CategoryMst.CTGID
                    JOIN [COSEC].[dbo].[Mx_DesignationMst] AS DesignationMst ON Subquery.DesignationId = DesignationMst.DSGID
                    JOIN [COSEC].[dbo].[Mx_SectionMst] AS SectionMst ON Subquery.SectionId = SectionMst.SECID
                    JOIN [COSEC].[dbo].[Mx_BranchMst] AS BranchMst ON Subquery.BranchId = BranchMst.BRCID
                    WHERE RowNum BETWEEN ${firstRow} AND ${lastRow}
                `);
                let totalCount = await request.query( `
                SELECT COUNT(*) AS TotalRowCount 
                FROM [TNA_PROXY].[dbo].[Px_TimesheetMst]
                WHERE 
                    ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR UserID = '${EmployeeId}') AND
                    ('${JobCode}' IS NULL OR '${JobCode}'='' OR JobCode ='${JobCode}') AND
                    ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                    ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                    ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId?EmployeeCategoryId:0}) AND
                    ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
                    ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
                    (('${FromDate}'='' AND '${ToDate}'='') OR PDate BETWEEN '${FromDate}' AND '${ToDate}')
                `)
                let last_page = Math.ceil(totalCount.recordset[0].TotalRowCount / size);
                await controllerLogger(req)
                //return res.redirect("/bio-timesheet/horizontal-report/pending-data")
                return res.status(200).json({status:"OK", last_page, data:response.recordset});
                }

                
            } catch (error) {
                throw error;
            }
        } catch (error) {
            console.log("Error in updateTimesheetData function : ", error)
            await controllerLogger(req, res)
            return res.status(400).json({status:"not ok",error:error, data:""})
        }finally{
            ProxyDbPool.close();
        }
    },
    downloadTimesheetData: async (req, res)=>{
        try {
            await ProxyDbPool.connect();
            try {
                const request = new sql.Request(ProxyDbPool);
                let {EmployeeId,FromDate,ToDate,JobCode,DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId} = req.query;
                let response = await request.query(`
                SELECT 
                    Subquery.*,
                    DepartmentMst.Name AS DepartmentName,
                    CustomGroup1Mst.Name AS UserCategoryName,
                    CategoryMst.Name AS EmployeeCategoryName,
                    DesignationMst.Name AS DesignationName,
                    SectionMst.Name AS SectionName,
                    BranchMst.Name AS BranchName
                FROM (
                    SELECT
                        Id, UserID,  Name, PDate, JobCode, TotalJobTime, BranchId, DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId,CreatedAt
                    FROM [TNA_PROXY].[dbo].[Px_TimesheetMst]
                    WHERE 
                        ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR UserID = '${EmployeeId}') AND
                        ('${JobCode}' IS NULL OR '${JobCode}'='' OR JobCode ='${JobCode}') AND
                        ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                        ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                        ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId?EmployeeCategoryId:0}) AND
                        ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
                        ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
                        (('${FromDate}'='' AND '${ToDate}'='') OR PDate BETWEEN '${FromDate}' AND '${ToDate}')
                ) AS Subquery
                JOIN [COSEC].[dbo].[Mx_DepartmentMst] AS DepartmentMst ON Subquery.DepartmentId = DepartmentMst.DPTID
                JOIN [COSEC].[dbo].[Mx_CustomGroup1Mst] AS CustomGroup1Mst ON Subquery.UserCategoryId = CustomGroup1Mst.CG1ID
                JOIN [COSEC].[dbo].[Mx_CategoryMst] AS CategoryMst ON Subquery.EmployeeCategoryId = CategoryMst.CTGID
                JOIN [COSEC].[dbo].[Mx_DesignationMst] AS DesignationMst ON Subquery.DesignationId = DesignationMst.DSGID
                JOIN [COSEC].[dbo].[Mx_SectionMst] AS SectionMst ON Subquery.SectionId = SectionMst.SECID
                JOIN [COSEC].[dbo].[Mx_BranchMst] AS BranchMst ON Subquery.BranchId = BranchMst.BRCID
            `);
            await controllerLogger(req)
            return res.status(200).json({status:"ok", data:response.recordset, error:""});

            } catch (error) {
                throw error;
            }
        } catch (error) {
            console.log("Error in downloadTimesheetData function : ", error);
            await controllerLogger(req, error)
            return res.status(400).json({status:"not ok",error:error, data:""})
        }finally{
            ProxyDbPool.close();
        }
    },
    bioTimesheetReportHorizontalPageData:async(req, res)=>{
            try {
                let db = req.app.locals.db;
                let {page,size, EmployeeId,FromDate,ToDate,JobCode,DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId} = req.query;
                let firstRow = ((page-1) * size)+1
                let lastRow = page * size;
                let result = await db.query(`
                    WITH OrderedSubquery AS (
                        SELECT
                            Id, UserID, Name, PDate, JobCode, TotalJobTime, BranchId, DepartmentId, UserCategoryId, EmployeeCategoryId, DesignationId, SectionId, CreatedAt, LeaveID,
                            ROW_NUMBER() OVER (ORDER BY UserID ASC) AS RowNum
                        FROM [TNA_PROXY].[dbo].[Px_TimesheetMst]
                        WHERE 
                            ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR UserID = '${EmployeeId}') AND
                            ('${JobCode}' IS NULL OR '${JobCode}'='' OR JobCode ='${JobCode}') AND
                            ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId ? DepartmentId : 0}) AND
                            ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId ? UserCategoryId : 0}) AND
                            ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId ? EmployeeCategoryId : 0}) AND
                            ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId ? DesignationId : 0}) AND
                            ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId ? SectionId : 0}) AND
                            (('${FromDate}'='' AND '${ToDate}'='') OR PDate BETWEEN '${FromDate}' AND '${ToDate}')
                    )
                    SELECT 
                        OrderedSubquery.*,
                        DepartmentMst.Name AS DepartmentName,
                        CustomGroup1Mst.Name AS UserCategoryName,
                        CategoryMst.Name AS EmployeeCategoryName,
                        DesignationMst.Name AS DesignationName,
                        SectionMst.Name AS SectionName,
                        BranchMst.Name AS BranchName
                    FROM OrderedSubquery
                    JOIN [COSEC].[dbo].[Mx_DepartmentMst] AS DepartmentMst ON OrderedSubquery.DepartmentId = DepartmentMst.DPTID
                    JOIN [COSEC].[dbo].[Mx_CustomGroup1Mst] AS CustomGroup1Mst ON OrderedSubquery.UserCategoryId = CustomGroup1Mst.CG1ID
                    JOIN [COSEC].[dbo].[Mx_CategoryMst] AS CategoryMst ON OrderedSubquery.EmployeeCategoryId = CategoryMst.CTGID
                    JOIN [COSEC].[dbo].[Mx_DesignationMst] AS DesignationMst ON OrderedSubquery.DesignationId = DesignationMst.DSGID
                    JOIN [COSEC].[dbo].[Mx_SectionMst] AS SectionMst ON OrderedSubquery.SectionId = SectionMst.SECID
                    JOIN [COSEC].[dbo].[Mx_BranchMst] AS BranchMst ON OrderedSubquery.BranchId = BranchMst.BRCID
                    WHERE RowNum BETWEEN ${firstRow} AND ${lastRow}
                    ORDER BY OrderedSubquery.UserID ASC
                `);                
               
                let totalCount = await db.query( `
                SELECT COUNT(*) AS TotalRowCount 
                FROM [TNA_PROXY].[dbo].[Px_TimesheetMst] 
                WHERE 
                    ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR UserID = '${EmployeeId}') AND
                    ('${JobCode}' IS NULL OR '${JobCode}'='' OR JobCode ='${JobCode}') AND
                    ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                    ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                    ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId?EmployeeCategoryId:0}) AND
                    ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
                    ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
                    (('${FromDate}'='' AND '${ToDate}'='') OR PDate BETWEEN '${FromDate}' AND '${ToDate}')
                `)
                let last_page = Math.ceil(totalCount.recordset[0].TotalRowCount / size);
                await controllerLogger(req);
                let horizontalData = new Map();
                //console.log(result.recordset)
                if(result.recordset?.length > 0){
                    for (let index = 0; index < result.recordset.length; index++) {
                        const element = result.recordset[index];
                        let day = element.PDate.toISOString().split("T")[0].split("-")[2]
                        let hour = 0;
                        let minutes=0;
                        if(element.TotalJobTime){
                            hour = Math.floor(element.TotalJobTime / 60);
                            minutes = element.TotalJobTime % 60;
                        }
                        if (element.LeaveID) {
                            hour = element.LeaveID
                        }else{
                            if ( minutes >= 15 && minutes < 45 ) {
                                hour =  (hour + 0.5).toFixed(1);
                            } else if (minutes >= 45) {
                                hour =  (hour + 1).toFixed(1);
                            }else{
                                hour =  hour.toFixed(1);
                            }
                        }
                        if(horizontalData.has(element.UserID)){
                            let employee = horizontalData.get(element.UserID)
                            let found = false
                            for (let index = 0; index < employee.JobCodes?.length; index++) {
                                const JobCodes = employee.JobCodes[index];
                                if(!JobCodes.JobCode && element.JobCode){
                                    JobCodes.JobCode = element.JobCode
                                }
                                if( JobCodes.JobCode == element.JobCode || (!element.JobCode && !element.TotalJobTime)){
                                    JobCodes.days.push({[day]:hour})
                                    found = true;
                                    break;
                                }
                            }
                            if(!found){
                                employee.JobCodes.push({JobCode:element.JobCode,days:[{[day]:hour}]})
                            }
                        }else{
                            horizontalData.set(element.UserID,
                                {
                                    JobCodes:[{JobCode:element.JobCode,days:[{[day]:hour}]}],
                                    Name:element.Name,
                                    DepartmentName:element.DepartmentName,
                                    UserCategoryName:element.UserCategoryName,
                                    DesignationName:element.DesignationName,
                                    SectionName:element.SectionName,
                                }
                            )
                        }
                    }
                }
                let finalData =[]
                for (let [key, value] of horizontalData) {
                    //console.log(`${key}: ${JSON.stringify(value)}`);
                    for (let index = 0; index < value.JobCodes.length; index++) {
                        const element = value.JobCodes[index];
                        finalData.push({
                            UserID:key,
                            JobCode:element.JobCode,
                            Name:value.Name,
                            DepartmentName:value.DepartmentName,
                            UserCategoryName:value.UserCategoryName,
                            DesignationName:value.DesignationName,
                            SectionName:value.SectionName,
                        })
                        for (let index = 0; index < element.days.length; index++) {
                            const day = element.days[index];
                            finalData[finalData.length-1]={...finalData[finalData.length-1],...day}
                        }
                    }
                }
               // console.log(finalData)
                return res.status(200).json({status:"ok", last_page, data:finalData });

            } catch (error) {
                console.log("Error in bioTimesheetReportHorizontalPageData function : ", error.message)
                await controllerLogger(req, error)
                return res.status(400).json({status:"not ok",error:error, data:""})
            }
        
    },
    downloadHorizontalTimesheetData: async (req, res)=>{
        try {
            let db = req.app.locals.db;
            let {EmployeeId,FromDate,ToDate,JobCode,DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId} = req.query;
            let result = await db.query(`
                SELECT 
                    Subquery.*,
                    DepartmentMst.Name AS DepartmentName,
                    CustomGroup1Mst.Name AS UserCategoryName,
                    CategoryMst.Name AS EmployeeCategoryName,
                    DesignationMst.Name AS DesignationName,
                    SectionMst.Name AS SectionName,
                    BranchMst.Name AS BranchName
                FROM (
                    SELECT
                        Id, UserID, Name, PDate, JobCode, TotalJobTime, BranchId, DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId,CreatedAt
                    FROM [TNA_PROXY].[dbo].[Px_TimesheetMst]
                    WHERE 
                        ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR UserID = '${EmployeeId}') AND
                        ('${JobCode}' IS NULL OR '${JobCode}'='' OR JobCode ='${JobCode}') AND
                        ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                        ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                        ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId?EmployeeCategoryId:0}) AND
                        ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
                        ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
                        (('${FromDate}'='' AND '${ToDate}'='') OR PDate BETWEEN '${FromDate}' AND '${ToDate}')
                ) AS Subquery
                JOIN [COSEC].[dbo].[Mx_DepartmentMst] AS DepartmentMst ON Subquery.DepartmentId = DepartmentMst.DPTID
                JOIN [COSEC].[dbo].[Mx_CustomGroup1Mst] AS CustomGroup1Mst ON Subquery.UserCategoryId = CustomGroup1Mst.CG1ID
                JOIN [COSEC].[dbo].[Mx_CategoryMst] AS CategoryMst ON Subquery.EmployeeCategoryId = CategoryMst.CTGID
                JOIN [COSEC].[dbo].[Mx_DesignationMst] AS DesignationMst ON Subquery.DesignationId = DesignationMst.DSGID
                JOIN [COSEC].[dbo].[Mx_SectionMst] AS SectionMst ON Subquery.SectionId = SectionMst.SECID
                JOIN [COSEC].[dbo].[Mx_BranchMst] AS BranchMst ON Subquery.BranchId = BranchMst.BRCID
            `);
            await controllerLogger(req)
            let horizontalData = new Map();
            //console.log(result.recordset)
            if(result.recordset?.length > 0){
                for (let index = 0; index < result.recordset.length; index++) {
                    const element = result.recordset[index];
                    let day = element.PDate.toISOString().split("T")[0].split("-")[2]
                    let hour = 0;
                    let minutes=0;
                    if(element.TotalJobTime){
                        hour = Math.floor(element.TotalJobTime / 60);
                        minutes = element.TotalJobTime % 60;
                    }
                    if (element.LeaveID) {
                        hour = element.LeaveID
                    }else{
                        if ( minutes >= 15 && minutes < 45 ) {
                            hour =  (hour + 0.5).toFixed(1);
                        } else if (minutes >= 45) {
                            hour =  (hour + 1).toFixed(1);
                        }else{
                            hour =  hour.toFixed(1);
                        }
                    }
                    if(horizontalData.has(element.UserID)){
                        let employee = horizontalData.get(element.UserID)
                        let found = false
                        for (let index = 0; index < employee.JobCodes?.length; index++) {
                            const JobCodes = employee.JobCodes[index];
                            if(!JobCodes.JobCode && element.JobCode){
                                JobCodes.JobCode = element.JobCode
                            }
                            if( JobCodes.JobCode == element.JobCode || (!element.JobCode && !element.TotalJobTime)){
                                JobCodes.days.push({[day]:hour})
                                found = true;
                                break;
                            }
                        }
                        if(!found){
                            employee.JobCodes.push({JobCode:element.JobCode,days:[{[day]:hour}]})
                        }
                    }else{
                        horizontalData.set(element.UserID,
                            {
                                JobCodes:[{JobCode:element.JobCode,days:[{[day]:hour}]}],
                                Name:element.Name,
                                DepartmentName:element.DepartmentName,
                                UserCategoryName:element.UserCategoryName,
                                DesignationName:element.DesignationName,
                                SectionName:element.SectionName,
                            }
                        )
                    }
                }
            }
            let finalData =[]
            let rownum=0;
            for (let [key, value] of horizontalData) {
                //console.log(`${key}: ${JSON.stringify(value)}`);
                for (let index = 0; index < value.JobCodes.length; index++) {
                    const element = value.JobCodes[index];
                    finalData.push({
                        UserID:key,
                        Name:value.Name,
                        rownum:++rownum,
                        JobCode:element.JobCode,
                        DepartmentName:value.DepartmentName,
                        UserCategoryName:value.UserCategoryName,
                        DesignationName:value.DesignationName,
                        SectionName:value.SectionName,
                    })
                    for (let index = 0; index < element.days.length; index++) {
                        const day = element.days[index];
                        finalData[finalData.length-1]={...finalData[finalData.length-1],...day}
                    }
                }
            }
           // console.log(finalData)
            return res.status(200).json({status:"ok", data:finalData ,error:''});
        } catch (error) {
            console.log("Error in downloadHorizontalTimesheetData function : ", error);
            await controllerLogger(req, error)
            return res.status(400).json({status:"not ok",error:error, data:""})
        }
    },
}
module.exports = {bioTimesheetController}

