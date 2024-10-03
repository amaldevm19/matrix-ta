const {sql,ProxyDbPool} = require('../../config/db');
const {controllerLogger} = require("../../helpers/19_middleware_history_logger");
const {copyTimesheetFromCosecToProxyDbFunction} = require('../../helpers/02_timesheet_copier');

const bioTimesheetController ={
    getBioTimesheetHomePageData:async (req, res)=>{
        try {
            await ProxyDbPool.connect();
            const transaction = new sql.Transaction(ProxyDbPool);
            try {
                let EmployeeBranch = req.session.user.Branch;
                let IsAdmin = req.session.user.IsAdmin;
                let EmployeeDepartment = req.session.user.Department
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
                        (('${FromDate}'='' AND '${ToDate}'='') OR PDate BETWEEN '${FromDate}' AND '${ToDate}') AND 
                        ('${IsAdmin}' = 'true' OR BranchId = '${EmployeeBranch}')
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
                    (('${FromDate}'='' AND '${ToDate}'='') OR PDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                    ('${IsAdmin}' = 'true' OR BranchId = '${EmployeeBranch}')
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
                if(result === "OK"){
                    await controllerLogger(req)
                    return res.status(200).json({status:"OK", data:""});
                }
            } catch (error) {
                throw error;
            }
        } catch (error) {
            console.log("Error in updateTimesheetData function : ", error)
            await controllerLogger(req, res)
            return res.status(400).json({status:"not ok",error:error, data:""})
        }
    },
    downloadTimesheetData: async (req, res)=>{
        try {
            await ProxyDbPool.connect();
            try {
                const request = new sql.Request(ProxyDbPool);
                let EmployeeBranch = req.session.user.Branch;
                let IsAdmin = req.session.user.IsAdmin;
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
                        (('${FromDate}'='' AND '${ToDate}'='') OR PDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                        ('${IsAdmin}' = 'true' OR BranchId = '${EmployeeBranch}')
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
        }
    },
    bioTimesheetReportHorizontalPageData:async(req, res)=>{
            try {
                let db = req.app.locals.db;
                let EmployeeBranch = req.session.user.Branch;
                let IsAdmin = req.session.user.IsAdmin;
                let {page,size, EmployeeId,FromDate,ToDate,JobCode,DepartmentId,UserCategoryId,DesignationId,SectionId} = req.query;
                if(!FromDate && !ToDate){
                    switch (EmployeeBranch) {
                        case '1':
                            FromDate = getFromDate(26)
                            ToDate = getToDate(25)
                            break;
                        case '5':
                            FromDate = getFromDate(16)
                            ToDate = getToDate(15)
                            break;
                       
                    }
                }
                let firstRow = ((page-1) * size)
                let lastRow = page * size;
                let result = await db.query(`
                    WITH OrderedSubquery AS (
                        SELECT
                            Id, UserID, Name, PDate, JobCode, TotalJobTime, BranchId, DepartmentId, UserCategoryId, DesignationId, SectionId, CreatedAt, LeaveID,
                            ROW_NUMBER() OVER (ORDER BY UserID ASC) AS RowNum
                        FROM [TNA_PROXY].[dbo].[Px_TimesheetMst]
                        WHERE 
                            ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR UserID = '${EmployeeId}') AND
                            ('${JobCode}' IS NULL OR '${JobCode}'='' OR JobCode ='${JobCode}') AND
                            ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId ? DepartmentId : 0}) AND
                            ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId ? UserCategoryId : 0}) AND
                            ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId ? DesignationId : 0}) AND
                            ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId ? SectionId : 0}) AND
                            (('${FromDate}'='' AND '${ToDate}'='') OR PDate BETWEEN '${FromDate}' AND '${ToDate}') AND 
                            ('${IsAdmin}' = 'true' OR BranchId = '${EmployeeBranch}')
                    )
                    SELECT 
                        OrderedSubquery.*,
                        DepartmentMst.Name AS DepartmentName,
                        CustomGroup1Mst.Name AS UserCategoryName,
                        DesignationMst.Name AS DesignationName,
                        SectionMst.Name AS SectionName,
                        BranchMst.Name AS BranchName
                    FROM OrderedSubquery
                    JOIN [COSEC].[dbo].[Mx_DepartmentMst] AS DepartmentMst ON OrderedSubquery.DepartmentId = DepartmentMst.DPTID
                    JOIN [COSEC].[dbo].[Mx_CustomGroup1Mst] AS CustomGroup1Mst ON OrderedSubquery.UserCategoryId = CustomGroup1Mst.CG1ID
                    JOIN [COSEC].[dbo].[Mx_DesignationMst] AS DesignationMst ON OrderedSubquery.DesignationId = DesignationMst.DSGID
                    JOIN [COSEC].[dbo].[Mx_SectionMst] AS SectionMst ON OrderedSubquery.SectionId = SectionMst.SECID
                    JOIN [COSEC].[dbo].[Mx_BranchMst] AS BranchMst ON OrderedSubquery.BranchId = BranchMst.BRCID
                    ORDER BY OrderedSubquery.UserID ASC
                `);                
               
               
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
                            rownum:finalData.length+1,
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
                let last_page = Math.ceil(finalData.length / size);
                if(lastRow > finalData.length){
                    lastRow = finalData.length;
                }
                let results = finalData.slice(firstRow,lastRow)
                return res.status(200).json({status:"ok", last_page, data:results,FromDate,ToDate });

            } catch (error) {
                console.log("Error in bioTimesheetReportHorizontalPageData function : ", error.message)
                await controllerLogger(req, error)
                return res.status(400).json({status:"not ok",error:error, data:""})
            }
        
    },
    downloadHorizontalTimesheetData: async (req, res)=>{
        try {
            let db = req.app.locals.db;
            let EmployeeBranch = req.session.user.Branch;
            let IsAdmin = req.session.user.IsAdmin;
            let {EmployeeId,FromDate,ToDate,JobCode,DepartmentId,UserCategoryId,DesignationId,SectionId} = req.query;
            if(!FromDate && !ToDate){
                switch (EmployeeBranch) {
                    case '1':
                        FromDate = getFromDate(26)
                        ToDate = getToDate(25)
                        break;
                    case '5':
                        FromDate = getFromDate(16)
                        ToDate = getToDate(15)
                        break;
                   
                }
            }
            let result = await db.query(`
                SELECT 
                    Subquery.*,
                    DepartmentMst.Name AS DepartmentName,
                    CustomGroup1Mst.Name AS UserCategoryName,
                    DesignationMst.Name AS DesignationName,
                    SectionMst.Name AS SectionName,
                    BranchMst.Name AS BranchName
                FROM (
                    SELECT
                        Id, UserID, Name, PDate, JobCode, TotalJobTime, BranchId, DepartmentId,UserCategoryId,DesignationId,SectionId,CreatedAt, LeaveID
                    FROM [TNA_PROXY].[dbo].[Px_TimesheetMst]
                    WHERE 
                        ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR UserID = '${EmployeeId}') AND
                        ('${JobCode}' IS NULL OR '${JobCode}'='' OR JobCode ='${JobCode}') AND
                        ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                        ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                        ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
                        ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
                        (('${FromDate}'='' AND '${ToDate}'='') OR PDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                        ('${IsAdmin}' = 'true' OR BranchId = '${EmployeeBranch}')

                ) AS Subquery
                JOIN [COSEC].[dbo].[Mx_DepartmentMst] AS DepartmentMst ON Subquery.DepartmentId = DepartmentMst.DPTID
                JOIN [COSEC].[dbo].[Mx_CustomGroup1Mst] AS CustomGroup1Mst ON Subquery.UserCategoryId = CustomGroup1Mst.CG1ID
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
    getBioTimesheetComparePageData:async (req, res)=>{
        try {
            let db = req.app.locals.db;
            let EmployeeBranch = req.session.user.Branch;
            let IsAdmin = req.session.user.IsAdmin;
            let {page,size, EmployeeId,FromDate,ToDate,JobCode,DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId} = req.query;
            // console.log(page,size, EmployeeId,FromDate,ToDate,JobCode,DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId)
            let firstRow = ((page-1) * size)+1
            let lastRow = page * size;
            let result = await db.query(`
            SELECT 
                Subquery.*,
                DepartmentMst.Name AS DepartmentName,
                CustomGroup1Mst.Name AS UserCategoryName,
                CategoryMst.Name AS EmployeeCategoryName,
                DesignationMst.Name AS DesignationName,
                SectionMst.Name AS SectionName,
                BranchMst.Name AS BranchName,
                COALESCE(ERPTransactionMst.TotalHours, 0) AS TotalHours
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
                    (('${FromDate}'='' AND '${ToDate}'='') OR PDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                    ('${IsAdmin}' = 'true' OR BranchId = '${EmployeeBranch}')

            ) AS Subquery
            JOIN [COSEC].[dbo].[Mx_DepartmentMst] AS DepartmentMst ON Subquery.DepartmentId = DepartmentMst.DPTID
            JOIN [COSEC].[dbo].[Mx_CustomGroup1Mst] AS CustomGroup1Mst ON Subquery.UserCategoryId = CustomGroup1Mst.CG1ID
            JOIN [COSEC].[dbo].[Mx_CategoryMst] AS CategoryMst ON Subquery.EmployeeCategoryId = CategoryMst.CTGID
            JOIN [COSEC].[dbo].[Mx_DesignationMst] AS DesignationMst ON Subquery.DesignationId = DesignationMst.DSGID
            JOIN [COSEC].[dbo].[Mx_SectionMst] AS SectionMst ON Subquery.SectionId = SectionMst.SECID
            JOIN [COSEC].[dbo].[Mx_BranchMst] AS BranchMst ON Subquery.BranchId = BranchMst.BRCID
            LEFT JOIN [TNA_PROXY].[dbo].[Px_ERPTransactionMst] AS ERPTransactionMst
                ON CONCAT(
                    LEFT(Subquery.UserID, PATINDEX('%[0-9]%', Subquery.UserID ) - 1),
                    '-',
                    SUBSTRING(Subquery.UserID, PATINDEX('%[0-9]%', Subquery.UserID), LEN(Subquery.UserID))
                ) =  ERPTransactionMst.HcmWorker_PersonnelNumber
                AND Subquery.PDate = ERPTransactionMst.TransDate
                AND Subquery.JobCode = ERPTransactionMst.projId
            WHERE RowNum BETWEEN ${firstRow} AND ${lastRow}
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
                (('${FromDate}'='' AND '${ToDate}'='') OR PDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                ('${IsAdmin}' = 'true' OR BranchId = '${EmployeeBranch}')
            `)
            let last_page = Math.ceil(totalCount.recordset[0].TotalRowCount / size);
            await controllerLogger(req)
            return res.status(200).json({status:"OK", last_page, data:result.recordset});

        } catch (error) {
            console.log("Error in getBioTimesheetComparePageData function : ", error)
            await controllerLogger(req, res)
            return res.status(400).json({status:"not ok",error:error, data:""})
        }  
    },
    downloadBioTimesheetCompareData:async(req,res)=>{
        try {
            let db = req.app.locals.db;
            let EmployeeBranch = req.session.user.Branch;
            let IsAdmin = req.session.user.IsAdmin;
            let {EmployeeId,FromDate,ToDate,JobCode,DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId} = req.query;
            // console.log(page,size, EmployeeId,FromDate,ToDate,JobCode,DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId)
            let result = await db.query(`
            SELECT 
                Subquery.*,
                DepartmentMst.Name AS DepartmentName,
                CustomGroup1Mst.Name AS UserCategoryName,
                CategoryMst.Name AS EmployeeCategoryName,
                DesignationMst.Name AS DesignationName,
                SectionMst.Name AS SectionName,
                BranchMst.Name AS BranchName,
                COALESCE(ERPTransactionMst.TotalHours, 0) AS TotalHours
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
                    (('${FromDate}'='' AND '${ToDate}'='') OR PDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                    ('${IsAdmin}' = 'true' OR BranchId = '${EmployeeBranch}')
            ) AS Subquery
            JOIN [COSEC].[dbo].[Mx_DepartmentMst] AS DepartmentMst ON Subquery.DepartmentId = DepartmentMst.DPTID
            JOIN [COSEC].[dbo].[Mx_CustomGroup1Mst] AS CustomGroup1Mst ON Subquery.UserCategoryId = CustomGroup1Mst.CG1ID
            JOIN [COSEC].[dbo].[Mx_CategoryMst] AS CategoryMst ON Subquery.EmployeeCategoryId = CategoryMst.CTGID
            JOIN [COSEC].[dbo].[Mx_DesignationMst] AS DesignationMst ON Subquery.DesignationId = DesignationMst.DSGID
            JOIN [COSEC].[dbo].[Mx_SectionMst] AS SectionMst ON Subquery.SectionId = SectionMst.SECID
            JOIN [COSEC].[dbo].[Mx_BranchMst] AS BranchMst ON Subquery.BranchId = BranchMst.BRCID
            LEFT JOIN [TNA_PROXY].[dbo].[Px_ERPTransactionMst] AS ERPTransactionMst
                ON CONCAT(
                    LEFT(Subquery.UserID, PATINDEX('%[0-9]%', Subquery.UserID ) - 1),
                    '-',
                    SUBSTRING(Subquery.UserID, PATINDEX('%[0-9]%', Subquery.UserID), LEN(Subquery.UserID))
                ) =  ERPTransactionMst.HcmWorker_PersonnelNumber
                AND Subquery.PDate = ERPTransactionMst.TransDate
                AND Subquery.JobCode = ERPTransactionMst.projId
            `);
            await controllerLogger(req)
            return res.status(200).json({status:"OK", data:result.recordset});

        } catch (error) {
            console.log("Error in downloadBioTimesheetCompareData function : ", error)
            await controllerLogger(req, res)
            return res.status(400).json({status:"not ok",error:error, data:""})
        }  
    }
}
module.exports = {bioTimesheetController}

function getFromDate(cutoffDate) {
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth(); // January is 0!
  
    // If today is after the 16th, keep the current month. Otherwise, go to last month.
    if (today.getDate() > cutoffDate) {
      month += 1; // Current month, so increment by 1 since `getMonth()` is zero-indexed.
    } else {
      if (month === 0) { // If current month is January, go to last year December.
        year -= 1;
        month = 12;
      }
    }
  
    // Return the date in yyyy-mm-dd format
    return `${year}-${String(month).padStart(2, '0')}-${cutoffDate}`;
}

function getToDate(cutoffDate) {
    const today = new Date();
    let year = today.getFullYear();
    let month = today.getMonth(); // January is 0!
  
    // If today is after the 16th, keep the current month. Otherwise, go to last month.
    if (today.getDate() > cutoffDate) {
        if(month == 11){
            month=1
            year += 1;
        }
        month += 2; // Next month, so increment by 2 since `getMonth()` is zero-indexed.
    } else {
        month += 1; // Current month, so increment by 1 since `getMonth()` is zero-indexed.
    }
  
    // Return the date in yyyy-mm-dd format
    return `${year}-${String(month).padStart(2, '0')}-${cutoffDate}`;
}
  

