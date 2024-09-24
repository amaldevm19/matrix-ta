const {sql,ProxyDbPool} = require('../../config/db');
const {startERPTransaction,checkPendingCount,revertERPData} = require('../../helpers/08_erp_transaction_process');
const {controllerLogger} = require("../../helpers/19_middleware_history_logger");
const {PxERPTransactionTableBuilder} = require("../../helpers/04_erp_transaction_copier");

const transactionController = {
    getErpPendingData:async(req,res)=>{
        try {
            await ProxyDbPool.connect();
            const transaction = new sql.Transaction(ProxyDbPool);
            try {
                let EmployeeBranch = req.session.user.Branch;
                let IsAdmin = req.session.user.IsAdmin;
                let {page,size, EmployeeId,FromDate,ToDate,JobCode,DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId,Error} = req.query;
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
                        Id, HcmWorker_PersonnelNumber, TransDate, projId,Error,ErrorText, TotalHours, BranchId, DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId,SyncCompleted,CreatedAt,UpdatedAt,
                        ROW_NUMBER() OVER (ORDER BY Id) AS RowNum
                    FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
                    WHERE 
                        ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR HcmWorker_PersonnelNumber = '${EmployeeId}') AND
                        ('${JobCode}' IS NULL OR '${JobCode}'='' OR projId ='${JobCode}') AND
                        ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                        ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                        ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId?EmployeeCategoryId:0}) AND
                        ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
                        ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
                        ('${Error}' IS NULL OR '${Error}'='' OR Error = ${Error?Error:0}) AND
                        (('${FromDate}'='' AND '${ToDate}'='') OR TransDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                        SyncCompleted=0 AND ('${IsAdmin}' = 'true' OR BranchId = '${EmployeeBranch}')

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
                FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst] 
                WHERE 
                    ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR HcmWorker_PersonnelNumber = '${EmployeeId}') AND
                    ('${JobCode}' IS NULL OR '${JobCode}'='' OR projId ='${JobCode}') AND
                    ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                    ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                    ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId?EmployeeCategoryId:0}) AND
                    ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
                    ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
                    ('${Error}' IS NULL OR '${Error}'='' OR Error = ${Error?Error:0}) AND
                    (('${FromDate}'='' AND '${ToDate}'='') OR TransDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                    SyncCompleted=0 AND ('${IsAdmin}' = 'true' OR BranchId = '${EmployeeBranch}')
                `)
                await transaction.commit();
                let last_page = Math.ceil(totalCount.recordset[0].TotalRowCount / size);
                await controllerLogger(req)
                return res.status(200).json({status:"ok", last_page, data:result.recordset});

            } catch (error) {
                await transaction.rollback();
                throw error;
            }
        } catch (error) {
            console.log("Error in getErpPendingData function : ", error.message)
            await controllerLogger(req, error)
            return res.status(400).json({status:"not ok",error:error, data:""})
        }
    },
    getErpStatusData:async(req,res)=>{
        try {
            await ProxyDbPool.connect();
            const transaction = new sql.Transaction(ProxyDbPool);
            try {
                let EmployeeBranch = req.session.user.Branch;
                let IsAdmin = req.session.user.IsAdmin;
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
                        Id, HcmWorker_PersonnelNumber, TransDate, projId, TotalHours, BranchId, DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId,SyncCompleted,CreatedAt,UpdatedAt,
                        ROW_NUMBER() OVER (ORDER BY Id) AS RowNum
                    FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
                    WHERE 
                        ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR HcmWorker_PersonnelNumber = '${EmployeeId}') AND
                        ('${JobCode}' IS NULL OR '${JobCode}'='' OR projId ='${JobCode}') AND
                        ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                        ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                        ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId?EmployeeCategoryId:0}) AND
                        ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
                        ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
                        (('${FromDate}'='' AND '${ToDate}'='') OR TransDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                        SyncCompleted=1 AND ('${IsAdmin}' = 'true' OR BranchId = '${EmployeeBranch}')

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
                FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst] 
                WHERE 
                    ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR HcmWorker_PersonnelNumber = '${EmployeeId}') AND
                    ('${JobCode}' IS NULL OR '${JobCode}'='' OR projId ='${JobCode}') AND
                    ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                    ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                    ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId?EmployeeCategoryId:0}) AND
                    ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
                    ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
                    (('${FromDate}'='' AND '${ToDate}'='') OR TransDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                    SyncCompleted=1 AND ('${IsAdmin}' = 'true' OR BranchId = '${EmployeeBranch}')
                `)
                await transaction.commit();
                let last_page = Math.ceil(totalCount.recordset[0].TotalRowCount / size);
                await controllerLogger(req)
                return res.status(200).json({status:"ok", last_page, data:result.recordset});
            } catch (error) {
                await transaction.rollback();
                throw error;
            }
        } catch (error) {
            console.log("Error in getErpStatusData function : ", error)
            await controllerLogger(req, error)
            return res.status(400).json({status:"not ok",error:error, data:""})
        }
    },
    downloadErpStatusData:async(req,res)=>{
        try {
            await ProxyDbPool.connect();
            try {
                let EmployeeBranch = req.session.user.Branch;
                let IsAdmin = req.session.user.IsAdmin;
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
                        HcmWorker_PersonnelNumber,
                        TransDate,
                        projId,
                        TotalHours,
                        BranchId,
                        DepartmentId,
                        UserCategoryId,
                        EmployeeCategoryId,
                        DesignationId,
                        SectionId,
                        SyncCompleted,
                        CreatedAt,
                        UpdatedAt
                    FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
                    WHERE 
                        ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR HcmWorker_PersonnelNumber = '${EmployeeId}') AND
                        ('${JobCode}' IS NULL OR '${JobCode}'='' OR projId ='${JobCode}') AND
                        ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                        ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                        ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId?EmployeeCategoryId:0}) AND
                        ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
                        ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
                        (('${FromDate}'='' AND '${ToDate}'='') OR TransDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                        SyncCompleted=1 AND ('${IsAdmin}' = 'true' OR BranchId = '${EmployeeBranch}')
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
            console.log("Error in downloadTimesheetData function : ", error)
            await controllerLogger(req, error)
            return res.status(400).json({status:"not ok",error:error, data:""})
        }
    },
    getErpSettings:async(req,res)=>{
        try {
            await ProxyDbPool.connect();
            const transaction = new sql.Transaction(ProxyDbPool);
            try {
                await transaction.begin();
                let result = await ProxyDbPool.request().query(`
                SELECT
                    tt.Id,
                    tt.DepartmentId,
                    dm.Name AS Department,
                    tt.UserCategoryId,
                    cg1.Name AS UserCategory,
                    tt.TriggerDate,
                    tt.FromDate,
                    tt.ToDate,
                    tt.Status,
                    tt.CreatedAt,
                    tt.CreatedBy,
                    tt.UpdatedAt,
                    tt.UpdatedBy
                FROM
                    [TNA_PROXY].[dbo].[Px_TransTriggerMst] tt
                JOIN
                    [COSEC].[dbo].[Mx_DepartmentMst] dm ON tt.DepartmentId = dm.DPTID
                JOIN
                    [COSEC].[dbo].[Mx_CustomGroup1Mst] cg1 ON tt.UserCategoryId = cg1.CG1ID;
                `);
                await transaction.commit();
                await controllerLogger(req)
                return res.status(200).json({status:"ok", data:result.recordset, error:""});
            } catch (error) {
                await transaction.rollback();
                throw error;
            }
        } catch (error) {
            console.log("Error in getErpSettings function : ", error.message)
            await controllerLogger(req,error)
            return res.status(200).json({status:"not ok",error:"Server Error", data:[]})
        }
    },
    getAllErpTimesheet:async(req,res)=>{
        try {
            await ProxyDbPool.connect();
            const transaction = new sql.Transaction(ProxyDbPool);
            try {
                let {page,size, searchField} = req.query;
                let firstRow = ((page-1) * size)+1
                let lastRow = page * size;
                let whereClause = ''
                if(searchField){
                    whereClause = `
                    WHERE HcmWorker_PersonnelNumber LIKE '%${searchField.HcmWorker_PersonnelNumber}%' 
                    OR DepartmentId LIKE '%${searchField.DepartmentId}%' 
                    OR UserCategoryId LIKE '%${searchField.UserCategoryId}%'
                    OR SyncCompleted=${searchField.syncCompleted}
                    OR Error=${searchField.error}
                    `
                }
                await transaction.begin();
                let result = await ProxyDbPool.request().query(`
                    SELECT *
                    FROM (
                        SELECT
                            Id, HcmWorker_PersonnelNumber, TransDate, projId, TotalHours, BranchId, DepartmentId,UserCategoryId,SyncCompleted,Error, ErrorText, CreatedAt,UpdatedAt,
                            ROW_NUMBER() OVER (ORDER BY Id) AS RowNum
                        FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
                        ${whereClause}
                    ) AS Subquery
                    WHERE RowNum BETWEEN ${firstRow} AND ${lastRow}
                `);
                await transaction.commit();

                let totalCount = await ProxyDbPool.request().query( `SELECT COUNT(*) AS TotalRowCount FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst] ${ whereClause}`)
                let last_page = Math.ceil(totalCount.recordset[0].TotalRowCount / size);
                await controllerLogger(req)
                return res.status(200).json({status:"OK", last_page, data:result.recordset});

            } catch (error) {
                await transaction.rollback();
                throw error;
            }
        } catch (error) {
            console.log("Error in getAllErpTimesheet function : ", error);
            await controllerLogger(req, res)
            return res.status(400).json({status:"not ok",error:error, data:""})
        }
    },
    postErpSettings:async(req,res)=>{
        try {
            await ProxyDbPool.connect();
            const transaction = new sql.Transaction(ProxyDbPool);
            try {
                let {DepartmentId, UserCategoryId, TriggerDate, FromDate, ToDate, Status,CreatedBy} = req.body;
                await transaction.begin();
                let result = await ProxyDbPool.request().query(`
                INSERT INTO [TNA_PROXY].[dbo].[Px_TransTriggerMst]
                (DepartmentId,UserCategoryId,TriggerDate,FromDate,ToDate,Status,CreatedBy)
                VALUES (${DepartmentId},${UserCategoryId},'${TriggerDate}','${FromDate}','${ToDate}',${Status},'${CreatedBy}')
                `);
                await transaction.commit();
                if(result.rowsAffected > 0){
                    await controllerLogger(req);
                    return res.status(200).json({status:"ok",data:"",error:""});
                }
                throw new Error("Adding new Trigger has failed")
            } catch (error) {
                await transaction.rollback();
                throw error;
            }
        } catch (error) {
            console.log("Error in postErpSettings function : ", error.message)
            await controllerLogger(req, error)
            return res.status(200).json({status:"not ok",error:`Server Error : ${error.message}`, data:""})
        }
    },
    deleteErpSettings:async(req,res)=>{
        try {
            await ProxyDbPool.connect();
            const transaction = new sql.Transaction(ProxyDbPool);
            try {
                let {Id} = req.params;
                await transaction.begin();
                let result = await ProxyDbPool.request().query(`
                DELETE FROM [TNA_PROXY].[dbo].[Px_TransTriggerMst]
                WHERE Id = ${Id}
                `);
                await transaction.commit();
                if(result.rowsAffected[0] > 0){
                    await controllerLogger(req)
                    return res.status(200).json({status:"ok",data:"",error:""});
                }
                throw new Error("Adding new Trigger has failed")
            } catch (error) {
                await transaction.rollback();
                throw error;
            }
        } catch (error) {
            console.log("Error in deleteErpSettings function : ", error.message)
            await controllerLogger(req,error)
            return res.status(200).json({status:"not ok",error:`Server Error : ${error.message}`, data:""})
        }
    },
    updateErpSettings:async(req,res)=>{
        try {
            await ProxyDbPool.connect();
            let {TriggerDate, FromDate, ToDate, Status,UpdatedBy} = req.body;
            let {Id} = req.params;
            let updateColumns = [
                TriggerDate && `TriggerDate = '${TriggerDate}'`,
                FromDate && `FromDate ='${FromDate}'`,
                ToDate && `ToDate = '${ToDate}'`,
                Status && `Status =${Status=="Active"?1:0}`,
                UpdatedBy && `UpdatedBy = '${UpdatedBy}'`
            ].filter(Boolean).join(", ");
            const request = new sql.Request(ProxyDbPool);
            let result = await request.query(`
            UPDATE [TNA_PROXY].[dbo].[Px_TransTriggerMst]
            SET ${updateColumns}
            WHERE Id='${Id}'
            `);
            if(result.rowsAffected[0] > 0){
                await controllerLogger(req)
                return res.status(200).json({status:"ok",data:"",error:""});
            }
            throw new Error("Updating Trigger has failed")
        } catch (error) {
            console.log("Error in updateErpSettings function : ", error.message);
            await controllerLogger(req, error)
            return res.status(200).json({status:"not ok",error:`Server Error : ${error.message}`, data:""})
        }
    },
    copyTimesheetToErpTable:async(req,res)=>{
        try {
            let {DepartmentId} = req.query;
            let result = await PxERPTransactionTableBuilder({DepartmentId:DepartmentId.toString()});
            if(result.status == "ok"){
                await controllerLogger(req)
            }else{
                await controllerLogger(req,result.error)
            }
            return res.status(200).json(result);

        } catch (error) {
            console.log("Error in copyTimesheetToErpTable function : ", error.message)
            await controllerLogger(req,error)
            return res.status(200).json({status:"not ok",error:`Server Error : ${error.message}`, data:""})
        }
    },
    downloadERPTimesheet:async(req,res)=>{
        try {
            await ProxyDbPool.connect();
            try {
                const request = new sql.Request(ProxyDbPool);
                let EmployeeBranch = req.session.user.Branch;
                let IsAdmin = req.session.user.IsAdmin;
                let {EmployeeId,FromDate,ToDate,JobCode,DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId,Error} = req.query;
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
                        HcmWorker_PersonnelNumber,
                        TransDate,
                        projId,
                        TotalHours,
                        BranchId,
                        DepartmentId,
                        UserCategoryId,
                        EmployeeCategoryId,
                        DesignationId,
                        SectionId,
                        SyncCompleted,
                        Error,
                        ErrorText,
                        CreatedAt,
                        UpdatedAt
                    FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
                    WHERE 
                        ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR HcmWorker_PersonnelNumber = '${EmployeeId}') AND
                        ('${JobCode}' IS NULL OR '${JobCode}'='' OR projId ='${JobCode}') AND
                        ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                        ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                        ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId?EmployeeCategoryId:0}) AND
                        ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
                        ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
                        ('${Error}' IS NULL OR '${Error}'='' OR Error = ${Error?Error:0}) AND
                        (('${FromDate}'='' AND '${ToDate}'='') OR TransDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                        SyncCompleted=0 AND ('${IsAdmin}' = 'true' OR BranchId = '${EmployeeBranch}')
                ) AS Subquery
                JOIN [COSEC].[dbo].[Mx_DepartmentMst] AS DepartmentMst ON Subquery.DepartmentId = DepartmentMst.DPTID
                JOIN [COSEC].[dbo].[Mx_CustomGroup1Mst] AS CustomGroup1Mst ON Subquery.UserCategoryId = CustomGroup1Mst.CG1ID
                JOIN [COSEC].[dbo].[Mx_CategoryMst] AS CategoryMst ON Subquery.EmployeeCategoryId = CategoryMst.CTGID
                JOIN [COSEC].[dbo].[Mx_DesignationMst] AS DesignationMst ON Subquery.DesignationId = DesignationMst.DSGID
                JOIN [COSEC].[dbo].[Mx_SectionMst] AS SectionMst ON Subquery.SectionId = SectionMst.SECID
                JOIN [COSEC].[dbo].[Mx_BranchMst] AS BranchMst ON Subquery.BranchId = BranchMst.BRCID
            `);
            await controllerLogger(req)
            return res.status(200).json({status:"ok", data:response?.recordset, error:""});

            } catch (error) {
                throw error;
            }
        } catch (error) {
            console.log("Error in downloadTimesheetData function : ", error)
            await controllerLogger(req, error)
            return res.status(400).json({status:"not ok",error:error, data:""})
        }
    },
    postSelectedErpTimesheet:async(req,res)=>{
        try {
            let {Id,DepartmentId, UserCategoryId, FromDate, ToDate} = req.body;
            if(!DepartmentId || !UserCategoryId || !FromDate || !ToDate){
                throw new Error("Required data missing");
            }
            let pendingCountObj = await checkPendingCount({
                DepartmentId,
                UserCategoryId,
                FromDate,
                ToDate,
            });
              if(pendingCountObj.error){
                throw new Error("Could not retrieve Pending count in postSelectedErpTimesheet function ");
              }
            // console.log(Id, DepartmentId, UserCategoryId, FromDate, ToDate,UpdatedBy);
            if(pendingCountObj.pendingCount){
                let {status,error,data} = await startERPTransaction({pendingCount:pendingCountObj.pendingCount,DepartmentId,UserCategoryId,FromDate,ToDate})
                if(status == "ok"){
                    await controllerLogger(req)
                    return res.status(200).json({status,error, data})
                }
                throw new Error(error);
                
            }else{
                throw new Error(`No pending erp data for this Department ID: ${DepartmentId} and User Category ID: ${UserCategoryId}`);
            }
           
        } catch (error) {
            console.log("Error in postSelectedErpTimesheet function : ", error.message)
            await controllerLogger(req, error)
            return res.status(200).json({status:"not ok",error:error.message, data:""})
        }
    },
    clearSelectedErpTimesheet:async(req, res)=>{
        try {
            let {DepartmentId, UserCategoryId, FromDate, ToDate} = req.body;
            if(!DepartmentId || !UserCategoryId || !FromDate || !ToDate){
                throw new Error("DepartmentId, UserCategoryId, FromDate, ToDate, data is missing");
            }
            let {status,data,error} = await revertERPData({DepartmentId, UserCategoryId, FromDate, ToDate});
            if(status == "ok"){
                return res.status(200).json({status, data,error})
            }else{
                throw new Error(error);
            }

        } catch (error) {
            let message = (`Error in clearSelectedErpTimesheet function, Message: ${error.message} `)
            console.log(message)
            return res.status(200).json({status:"not ok",error:message, data:""})
        }
    },
    selectServer:(req,res)=>{
        try {
            global.d365_server = req.body.selectedServer;
            return res.status(200).json({status:"ok",error:"", data: global.d365_server})
        } catch (error) {
            let message = (`Error in selectServer function, Message: ${error.message} `)
            console.log(message)
            return res.status(200).json({status:"not ok",error:message, data:""})
        }
       
    },
    downloadException:async(req,res)=>{
        try {
            await ProxyDbPool.connect();
            try {
                let EmployeeBranch = req.session.user.Branch;
                let IsAdmin = req.session.user.IsAdmin;
                const request = new sql.Request(ProxyDbPool);
                let {EmployeeId,FromDate,ToDate,JobCode,DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId} = req.query;
                console.log(EmployeeId,FromDate,ToDate,JobCode,DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId)
                let response = await request.query(`
                SELECT 
                    Subquery.HcmWorker_PersonnelNumber,
                    Subquery.TransDate,
                    Subquery.projId,
                    Subquery.TotalHours,
                    DepartmentMst.Name AS DepartmentName,
                    CustomGroup1Mst.Name AS UserCategoryName,
                    CategoryMst.Name AS EmployeeCategoryName,
                    DesignationMst.Name AS DesignationName,
                    SectionMst.Name AS SectionName,
                    BranchMst.Name AS BranchName
                FROM (
                    SELECT
                        HcmWorker_PersonnelNumber,
                        TransDate,
                        projId,
                        TotalHours,
                        BranchId,
                        t.DepartmentId ,
                        UserCategoryId ,
                        EmployeeCategoryId,
                        DesignationId,
                        SectionId
                    FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst] t
                    JOIN [TNA_PROXY].[dbo].[Px_JPCJobMst] j
                    ON t.projId = j.JobCode 
                    WHERE 
                        t.TotalHours < j.MaxJobHourPerDay  AND
                        ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR HcmWorker_PersonnelNumber = '${EmployeeId}') AND
                        ('${JobCode}' IS NULL OR '${JobCode}'='' OR projId ='${JobCode}') AND
                        ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR t.DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                        ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                        ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId?EmployeeCategoryId:0}) AND
                        ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
                        ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
                        (('${FromDate}'='' AND '${ToDate}'='') OR TransDate BETWEEN '${FromDate}' AND '${ToDate}')AND
                        SyncCompleted=0 AND ('${IsAdmin}' = 'true' OR BranchId = '${EmployeeBranch}')
                ) AS Subquery
                JOIN [COSEC].[dbo].[Mx_DepartmentMst] AS DepartmentMst ON Subquery.DepartmentId = DepartmentMst.DPTID
                JOIN [COSEC].[dbo].[Mx_CustomGroup1Mst] AS CustomGroup1Mst ON Subquery.UserCategoryId = CustomGroup1Mst.CG1ID
                JOIN [COSEC].[dbo].[Mx_CategoryMst] AS CategoryMst ON Subquery.EmployeeCategoryId = CategoryMst.CTGID
                JOIN [COSEC].[dbo].[Mx_DesignationMst] AS DesignationMst ON Subquery.DesignationId = DesignationMst.DSGID
                JOIN [COSEC].[dbo].[Mx_SectionMst] AS SectionMst ON Subquery.SectionId = SectionMst.SECID
                JOIN [COSEC].[dbo].[Mx_BranchMst] AS BranchMst ON Subquery.BranchId = BranchMst.BRCID
            `);
            await controllerLogger(req)
            return res.status(200).json({status:"ok", data:response?.recordset, error:""});

            } catch (error) {
                throw error;
            }
        } catch (error) {
            console.log("Error in downloadException function : ", error)
            await controllerLogger(req, error)
            return res.status(400).json({status:"not ok",error:error, data:""})
        }
    },
    getErpTransactionPendingHorizontalData:async(req,res)=>{
        try {
            let db = req.app.locals.db;
            try {
                let EmployeeBranch = req.session.user.Branch;
                let IsAdmin = req.session.user.IsAdmin;
                let {page,size, EmployeeId,FromDate,ToDate,JobCode,DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId,Error} = req.query;
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
                    BranchMst.Name AS BranchName
                FROM (
                    SELECT
                        Id, HcmWorker_PersonnelNumber, TransDate, projId,Error,ErrorText, TotalHours, BranchId, DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId,SyncCompleted,CreatedAt,UpdatedAt,
                        ROW_NUMBER() OVER (ORDER BY Id) AS RowNum
                    FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
                    WHERE 
                        ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR HcmWorker_PersonnelNumber = '${EmployeeId}') AND
                        ('${JobCode}' IS NULL OR '${JobCode}'='' OR projId ='${JobCode}') AND
                        ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                        ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                        ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId?EmployeeCategoryId:0}) AND
                        ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
                        ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
                        ('${Error}' IS NULL OR '${Error}'='' OR Error = ${Error?Error:0}) AND
                        (('${FromDate}'='' AND '${ToDate}'='') OR TransDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                        SyncCompleted=0 AND ('${IsAdmin}' = 'true' OR BranchId = '${EmployeeBranch}')

                ) AS Subquery
                JOIN [COSEC].[dbo].[Mx_DepartmentMst] AS DepartmentMst ON Subquery.DepartmentId = DepartmentMst.DPTID
                JOIN [COSEC].[dbo].[Mx_CustomGroup1Mst] AS CustomGroup1Mst ON Subquery.UserCategoryId = CustomGroup1Mst.CG1ID
                JOIN [COSEC].[dbo].[Mx_CategoryMst] AS CategoryMst ON Subquery.EmployeeCategoryId = CategoryMst.CTGID
                JOIN [COSEC].[dbo].[Mx_DesignationMst] AS DesignationMst ON Subquery.DesignationId = DesignationMst.DSGID
                JOIN [COSEC].[dbo].[Mx_SectionMst] AS SectionMst ON Subquery.SectionId = SectionMst.SECID
                JOIN [COSEC].[dbo].[Mx_BranchMst] AS BranchMst ON Subquery.BranchId = BranchMst.BRCID
                WHERE RowNum BETWEEN ${firstRow} AND ${lastRow}
                `);
               
                let totalCount = await db.query( `
                SELECT COUNT(*) AS TotalRowCount 
                FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst] 
                WHERE 
                    ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR HcmWorker_PersonnelNumber = '${EmployeeId}') AND
                    ('${JobCode}' IS NULL OR '${JobCode}'='' OR projId ='${JobCode}') AND
                    ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                    ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                    ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId?EmployeeCategoryId:0}) AND
                    ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
                    ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
                    ('${Error}' IS NULL OR '${Error}'='' OR Error = ${Error?Error:0}) AND
                    (('${FromDate}'='' AND '${ToDate}'='') OR TransDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                    SyncCompleted=0 AND ('${IsAdmin}' = 'true' OR BranchId = '${EmployeeBranch}')
                `)
                let last_page = Math.ceil(totalCount.recordset[0].TotalRowCount / size);
                await controllerLogger(req);
                let horizontalData = new Map();
                //console.log(result.recordset)
                if(result.recordset?.length > 0){
                    for (let index = 0; index < result.recordset.length; index++) {
                        const element = result.recordset[index];
                        let day = element.TransDate.toISOString().split("T")[0].split("-")[2]
                        //console.log(day)
                        if(horizontalData.has(element.HcmWorker_PersonnelNumber)){
                            let employee = horizontalData.get(element.HcmWorker_PersonnelNumber)
                            let found = false
                            for (let index = 0; index < employee.projectIds?.length; index++) {
                                const projectIds = employee.projectIds[index];
                                if(projectIds.projId == element.projId){
                                    projectIds.days.push({[day]:element.TotalHours})
                                    found = true;
                                    break;
                                }
                            }
                            if(!found){
                                employee.projectIds.push({projId:element.projId,days:[{[day]:element.TotalHours}]})
                            }
                        }else{
                            horizontalData.set(element.HcmWorker_PersonnelNumber,
                                {
                                    projectIds:[{projId:element.projId,days:[{[day]:element.TotalHours}]}],
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
                    for (let index = 0; index < value.projectIds.length; index++) {
                        const element = value.projectIds[index];
                        finalData.push({
                            HcmWorker_PersonnelNumber:key,
                            projId:element.projId,
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
                throw error;
            }
        } catch (error) {
            console.log("Error in getErpTransactionPendingHorizontalData function : ", error.message)
            await controllerLogger(req, error)
            return res.status(400).json({status:"not ok",error:error, data:""})
        }
    },
    downloadErpTransactionPendingHorizontalData:async(req,res)=>{
        try {
            let db = req.app.locals.db;   
            let EmployeeBranch = req.session.user.Branch;
            let IsAdmin = req.session.user.IsAdmin; 
            let {EmployeeId,FromDate,ToDate,JobCode,DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId,Error} = req.query;
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
                    Id, HcmWorker_PersonnelNumber, TransDate, projId,Error,ErrorText, TotalHours, BranchId, DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId,SyncCompleted,CreatedAt,UpdatedAt,
                    ROW_NUMBER() OVER (ORDER BY Id) AS RowNum
                FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
                WHERE 
                    ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR HcmWorker_PersonnelNumber = '${EmployeeId}') AND
                    ('${JobCode}' IS NULL OR '${JobCode}'='' OR projId ='${JobCode}') AND
                    ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                    ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                    ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId?EmployeeCategoryId:0}) AND
                    ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
                    ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
                    ('${Error}' IS NULL OR '${Error}'='' OR Error = ${Error?Error:0}) AND
                    (('${FromDate}'='' AND '${ToDate}'='') OR TransDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                    SyncCompleted=0 AND ('${IsAdmin}' = 'true' OR BranchId = '${EmployeeBranch}')

            ) AS Subquery
            JOIN [COSEC].[dbo].[Mx_DepartmentMst] AS DepartmentMst ON Subquery.DepartmentId = DepartmentMst.DPTID
            JOIN [COSEC].[dbo].[Mx_CustomGroup1Mst] AS CustomGroup1Mst ON Subquery.UserCategoryId = CustomGroup1Mst.CG1ID
            JOIN [COSEC].[dbo].[Mx_CategoryMst] AS CategoryMst ON Subquery.EmployeeCategoryId = CategoryMst.CTGID
            JOIN [COSEC].[dbo].[Mx_DesignationMst] AS DesignationMst ON Subquery.DesignationId = DesignationMst.DSGID
            JOIN [COSEC].[dbo].[Mx_SectionMst] AS SectionMst ON Subquery.SectionId = SectionMst.SECID
            JOIN [COSEC].[dbo].[Mx_BranchMst] AS BranchMst ON Subquery.BranchId = BranchMst.BRCID
            `);
            
            await controllerLogger(req);
            let horizontalData = new Map();
            //console.log(result.recordset)
            if(result.recordset?.length > 0){
                for (let index = 0; index < result.recordset.length; index++) {
                    const element = result.recordset[index];
                    let day = element.TransDate.toISOString().split("T")[0].split("-")[2]
                    //console.log(day)
                    if(horizontalData.has(element.HcmWorker_PersonnelNumber)){
                        let employee = horizontalData.get(element.HcmWorker_PersonnelNumber)
                        let found = false
                        for (let index = 0; index < employee.projectIds?.length; index++) {
                            const projectIds = employee.projectIds[index];
                            if(projectIds.projId == element.projId){
                                projectIds.days.push({[day]:element.TotalHours})
                                found = true;
                                break;
                            }
                        }
                        if(!found){
                            employee.projectIds.push({projId:element.projId,days:[{[day]:element.TotalHours}]})
                        }
                    }else{
                        horizontalData.set(element.HcmWorker_PersonnelNumber,
                            {
                                projectIds:[{projId:element.projId,days:[{[day]:element.TotalHours}]}],
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
            let rownum = 0
            for (let [key, value] of horizontalData) {
                //console.log(`${key}: ${JSON.stringify(value)}`);
                for (let index = 0; index < value.projectIds.length; index++) {
                    const element = value.projectIds[index];
                    finalData.push({
                        HcmWorker_PersonnelNumber:key,
                        rownum:++rownum,
                        projId:element.projId,
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
            return res.status(200).json({status:"ok", data:finalData, error:"" });
        } catch (error) {
            console.log("Error in downloadErpTransactionPendingHorizontalData function : ", error.message)
            await controllerLogger(req, error)
            return res.status(400).json({status:"not ok",error:error, data:""})
        }
    },
    downloadExceptionHorizontal:async(req,res)=>{
        try {
            let db = req.app.locals.db;  
            let EmployeeBranch = req.session.user.Branch;
            let IsAdmin = req.session.user.IsAdmin;  
            let {EmployeeId,FromDate,ToDate,JobCode,DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId} = req.query;
            let result = await db.query(`
            SELECT 
                    Subquery.HcmWorker_PersonnelNumber,
                    Subquery.TransDate,
                    Subquery.projId,
                    Subquery.TotalHours,
                    DepartmentMst.Name AS DepartmentName,
                    CustomGroup1Mst.Name AS UserCategoryName,
                    CategoryMst.Name AS EmployeeCategoryName,
                    DesignationMst.Name AS DesignationName,
                    SectionMst.Name AS SectionName,
                    BranchMst.Name AS BranchName
                FROM (
                    SELECT
                        HcmWorker_PersonnelNumber,
                        TransDate,
                        projId,
                        TotalHours,
                        BranchId,
                        t.DepartmentId ,
                        UserCategoryId ,
                        EmployeeCategoryId,
                        DesignationId,
                        SectionId
                    FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst] t
                    JOIN [TNA_PROXY].[dbo].[Px_JPCJobMst] j
                    ON t.projId = j.JobCode 
                    WHERE 
                        t.TotalHours < j.MaxJobHourPerDay  AND
                        ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR HcmWorker_PersonnelNumber = '${EmployeeId}') AND
                        ('${JobCode}' IS NULL OR '${JobCode}'='' OR projId ='${JobCode}') AND
                        ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR t.DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                        ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                        ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId?EmployeeCategoryId:0}) AND
                        ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
                        ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
                        (('${FromDate}'='' AND '${ToDate}'='') OR TransDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                        SyncCompleted=0 AND ('${IsAdmin}' = 'true' OR BranchId = '${EmployeeBranch}')
                ) AS Subquery
                JOIN [COSEC].[dbo].[Mx_DepartmentMst] AS DepartmentMst ON Subquery.DepartmentId = DepartmentMst.DPTID
                JOIN [COSEC].[dbo].[Mx_CustomGroup1Mst] AS CustomGroup1Mst ON Subquery.UserCategoryId = CustomGroup1Mst.CG1ID
                JOIN [COSEC].[dbo].[Mx_CategoryMst] AS CategoryMst ON Subquery.EmployeeCategoryId = CategoryMst.CTGID
                JOIN [COSEC].[dbo].[Mx_DesignationMst] AS DesignationMst ON Subquery.DesignationId = DesignationMst.DSGID
                JOIN [COSEC].[dbo].[Mx_SectionMst] AS SectionMst ON Subquery.SectionId = SectionMst.SECID
                JOIN [COSEC].[dbo].[Mx_BranchMst] AS BranchMst ON Subquery.BranchId = BranchMst.BRCID
            `);
            
            await controllerLogger(req);
            let horizontalData = new Map();
            //console.log(result.recordset)
            if(result.recordset?.length > 0){
                for (let index = 0; index < result.recordset.length; index++) {
                    const element = result.recordset[index];
                    let day = element.TransDate.toISOString().split("T")[0].split("-")[2]
                    //console.log(day)
                    if(horizontalData.has(element.HcmWorker_PersonnelNumber)){
                        let employee = horizontalData.get(element.HcmWorker_PersonnelNumber)
                        let found = false
                        for (let index = 0; index < employee.projectIds?.length; index++) {
                            const projectIds = employee.projectIds[index];
                            if(projectIds.projId == element.projId){
                                projectIds.days.push({[day]:element.TotalHours})
                                found = true;
                                break;
                            }
                        }
                        if(!found){
                            employee.projectIds.push({projId:element.projId,days:[{[day]:element.TotalHours}]})
                        }
                    }else{
                        horizontalData.set(element.HcmWorker_PersonnelNumber,
                            {
                                projectIds:[{projId:element.projId,days:[{[day]:element.TotalHours}]}],
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
            let rownum = 0
            for (let [key, value] of horizontalData) {
                //console.log(`${key}: ${JSON.stringify(value)}`);
                for (let index = 0; index < value.projectIds.length; index++) {
                    const element = value.projectIds[index];
                    finalData.push({
                        HcmWorker_PersonnelNumber:key,
                        rownum:++rownum,
                        projId:element.projId,
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
            return res.status(200).json({status:"ok", data:finalData, error:"" });
        } catch (error) {
            console.log("Error in downloadExceptionHorizontal function : ", error.message)
            await controllerLogger(req, error)
            return res.status(400).json({status:"not ok",error:error, data:""})
        }
    },
    getErpTransactionCompletedHorizontalData: async(req,res)=>{
        try {
            let db = req.app.locals.db;
            try {
                let EmployeeBranch = req.session.user.Branch;
                let IsAdmin = req.session.user.IsAdmin;
                let {page,size, EmployeeId,FromDate,ToDate,JobCode,DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId,Error} = req.query;
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
                    BranchMst.Name AS BranchName
                FROM (
                    SELECT
                        Id, HcmWorker_PersonnelNumber, TransDate, projId,Error,ErrorText, TotalHours, BranchId, DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId,SyncCompleted,CreatedAt,UpdatedAt,
                        ROW_NUMBER() OVER (ORDER BY Id) AS RowNum
                    FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
                    WHERE 
                        ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR HcmWorker_PersonnelNumber = '${EmployeeId}') AND
                        ('${JobCode}' IS NULL OR '${JobCode}'='' OR projId ='${JobCode}') AND
                        ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                        ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                        ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId?EmployeeCategoryId:0}) AND
                        ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
                        ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
                        ('${Error}' IS NULL OR '${Error}'='' OR Error = ${Error?Error:0}) AND
                        (('${FromDate}'='' AND '${ToDate}'='') OR TransDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                        SyncCompleted=1 AND ('${IsAdmin}' = 'true' OR BranchId = '${EmployeeBranch}')

                ) AS Subquery
                JOIN [COSEC].[dbo].[Mx_DepartmentMst] AS DepartmentMst ON Subquery.DepartmentId = DepartmentMst.DPTID
                JOIN [COSEC].[dbo].[Mx_CustomGroup1Mst] AS CustomGroup1Mst ON Subquery.UserCategoryId = CustomGroup1Mst.CG1ID
                JOIN [COSEC].[dbo].[Mx_CategoryMst] AS CategoryMst ON Subquery.EmployeeCategoryId = CategoryMst.CTGID
                JOIN [COSEC].[dbo].[Mx_DesignationMst] AS DesignationMst ON Subquery.DesignationId = DesignationMst.DSGID
                JOIN [COSEC].[dbo].[Mx_SectionMst] AS SectionMst ON Subquery.SectionId = SectionMst.SECID
                JOIN [COSEC].[dbo].[Mx_BranchMst] AS BranchMst ON Subquery.BranchId = BranchMst.BRCID
                WHERE RowNum BETWEEN ${firstRow} AND ${lastRow}
                `);
               
                let totalCount = await db.query( `
                SELECT COUNT(*) AS TotalRowCount 
                FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst] 
                WHERE 
                    ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR HcmWorker_PersonnelNumber = '${EmployeeId}') AND
                    ('${JobCode}' IS NULL OR '${JobCode}'='' OR projId ='${JobCode}') AND
                    ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                    ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                    ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId?EmployeeCategoryId:0}) AND
                    ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
                    ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
                    ('${Error}' IS NULL OR '${Error}'='' OR Error = ${Error?Error:0}) AND
                    (('${FromDate}'='' AND '${ToDate}'='') OR TransDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                    SyncCompleted=1 AND ('${IsAdmin}' = 'true' OR BranchId = '${EmployeeBranch}')
                `)
                let last_page = Math.ceil(totalCount.recordset[0].TotalRowCount / size);
                await controllerLogger(req);
                let horizontalData = new Map();
                //console.log(result.recordset)
                if(result.recordset?.length > 0){
                    for (let index = 0; index < result.recordset.length; index++) {
                        const element = result.recordset[index];
                        let day = element.TransDate.toISOString().split("T")[0].split("-")[2]
                        //console.log(day)
                        if(horizontalData.has(element.HcmWorker_PersonnelNumber)){
                            let employee = horizontalData.get(element.HcmWorker_PersonnelNumber)
                            let found = false
                            for (let index = 0; index < employee.projectIds?.length; index++) {
                                const projectIds = employee.projectIds[index];
                                if(projectIds.projId == element.projId){
                                    projectIds.days.push({[day]:element.TotalHours})
                                    found = true;
                                    break;
                                }
                            }
                            if(!found){
                                employee.projectIds.push({projId:element.projId,days:[{[day]:element.TotalHours}]})
                            }
                        }else{
                            horizontalData.set(element.HcmWorker_PersonnelNumber,
                                {
                                    projectIds:[{projId:element.projId,days:[{[day]:element.TotalHours}]}],
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
                    for (let index = 0; index < value.projectIds.length; index++) {
                        const element = value.projectIds[index];
                        finalData.push({
                            HcmWorker_PersonnelNumber:key,
                            projId:element.projId,
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
                throw error;
            }
        } catch (error) {
            console.log("Error in getErpTransactionPendingHorizontalData function : ", error.message)
            await controllerLogger(req, error)
            return res.status(400).json({status:"not ok",error:error, data:""})
        }
    },
    downloadErpTransactionCompletedHorizontalData:async(req,res)=>{
        try {
            let db = req.app.locals.db;  
            let EmployeeBranch = req.session.user.Branch;
            let IsAdmin = req.session.user.IsAdmin;  
            let {EmployeeId,FromDate,ToDate,JobCode,DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId,Error} = req.query;
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
                    Id, HcmWorker_PersonnelNumber, TransDate, projId,Error,ErrorText, TotalHours, BranchId, DepartmentId,UserCategoryId,EmployeeCategoryId,DesignationId,SectionId,SyncCompleted,CreatedAt,UpdatedAt,
                    ROW_NUMBER() OVER (ORDER BY Id) AS RowNum
                FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
                WHERE 
                    ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR HcmWorker_PersonnelNumber = '${EmployeeId}') AND
                    ('${JobCode}' IS NULL OR '${JobCode}'='' OR projId ='${JobCode}') AND
                    ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                    ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                    ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId?EmployeeCategoryId:0}) AND
                    ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
                    ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
                    ('${Error}' IS NULL OR '${Error}'='' OR Error = ${Error?Error:0}) AND
                    (('${FromDate}'='' AND '${ToDate}'='') OR TransDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                    SyncCompleted=1 AND ('${IsAdmin}' = 'true' OR BranchId = '${EmployeeBranch}')

            ) AS Subquery
            JOIN [COSEC].[dbo].[Mx_DepartmentMst] AS DepartmentMst ON Subquery.DepartmentId = DepartmentMst.DPTID
            JOIN [COSEC].[dbo].[Mx_CustomGroup1Mst] AS CustomGroup1Mst ON Subquery.UserCategoryId = CustomGroup1Mst.CG1ID
            JOIN [COSEC].[dbo].[Mx_CategoryMst] AS CategoryMst ON Subquery.EmployeeCategoryId = CategoryMst.CTGID
            JOIN [COSEC].[dbo].[Mx_DesignationMst] AS DesignationMst ON Subquery.DesignationId = DesignationMst.DSGID
            JOIN [COSEC].[dbo].[Mx_SectionMst] AS SectionMst ON Subquery.SectionId = SectionMst.SECID
            JOIN [COSEC].[dbo].[Mx_BranchMst] AS BranchMst ON Subquery.BranchId = BranchMst.BRCID
            `);
            
            await controllerLogger(req);
            let horizontalData = new Map();
            //console.log(result.recordset)
            if(result.recordset?.length > 0){
                for (let index = 0; index < result.recordset.length; index++) {
                    const element = result.recordset[index];
                    let day = element.TransDate.toISOString().split("T")[0].split("-")[2]
                    //console.log(day)
                    if(horizontalData.has(element.HcmWorker_PersonnelNumber)){
                        let employee = horizontalData.get(element.HcmWorker_PersonnelNumber)
                        let found = false
                        for (let index = 0; index < employee.projectIds?.length; index++) {
                            const projectIds = employee.projectIds[index];
                            if(projectIds.projId == element.projId){
                                projectIds.days.push({[day]:element.TotalHours})
                                found = true;
                                break;
                            }
                        }
                        if(!found){
                            employee.projectIds.push({projId:element.projId,days:[{[day]:element.TotalHours}]})
                        }
                    }else{
                        horizontalData.set(element.HcmWorker_PersonnelNumber,
                            {
                                projectIds:[{projId:element.projId,days:[{[day]:element.TotalHours}]}],
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
            let rownum = 0
            for (let [key, value] of horizontalData) {
                //console.log(`${key}: ${JSON.stringify(value)}`);
                for (let index = 0; index < value.projectIds.length; index++) {
                    const element = value.projectIds[index];
                    finalData.push({
                        HcmWorker_PersonnelNumber:key,
                        rownum:++rownum,
                        projId:element.projId,
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
            return res.status(200).json({status:"ok", data:finalData, error:"" });
        } catch (error) {
            console.log("Error in downloadErpTransactionPendingHorizontalData function : ", error.message)
            await controllerLogger(req, error)
            return res.status(400).json({status:"not ok",error:error, data:""})
        }
    }
}

module.exports=transactionController;