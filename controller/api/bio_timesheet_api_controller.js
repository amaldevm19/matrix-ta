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
                        Id, UserID, PDate, JobCode, TotalJobTime, BranchId, DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId,CreatedAt,
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
                            Id, UserID, PDate, JobCode, TotalJobTime, BranchId, DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId,CreatedAt,LeaveID,
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
                        Id, UserID, PDate, JobCode, TotalJobTime, BranchId, DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId,CreatedAt
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
    }
}
module.exports = {bioTimesheetController}

