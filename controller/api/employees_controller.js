const {controllerLogger} = require("../../helpers/19_middleware_history_logger");

const employeesApiController = {
    hourDeductionPageData:async(req,res)=>{
        try {
            let db = req.app.locals.db;
            let page = req.query.page;
            let pageSize = req.query.size;
            let searchField = req.query.searchField;
            let firstRow = ((page-1) * pageSize)+1
            let lastRow = page * pageSize;
            // console.log(`page : ${page}, pageSize : ${pageSize}, searchField : ${searchField} `)
            let whereClause = ''
            if(searchField){
                whereClause = `WHERE UserID LIKE '%${searchField}%' OR UserName LIKE '%${searchField}%' OR UpdatedBy LIKE '%${searchField}%'`
            }
            let employeeWorkHourDeductionList =await db.query( `
                SELECT *
                FROM (
                    SELECT
                        UserID, UserName, HoursPerDay,FromDate,ToDate,Remarks, DepartmentId, UpdatedBy, UpdatedAt,
                        ROW_NUMBER() OVER (ORDER BY UserID) AS RowNum
                    FROM [TNA_PROXY].[dbo].[Px_UserHourDeduTrn]
                    ${whereClause}
                ) AS Subquery
                WHERE RowNum BETWEEN ${firstRow} AND ${lastRow}
            `);

            let totalCount = await db.query( `SELECT COUNT(*) AS TotalRowCount FROM [TNA_PROXY].[dbo].[Px_UserHourDeduTrn] ${whereClause}`)
            let lastPage = Math.ceil(totalCount.recordset[0].TotalRowCount / pageSize)
            
            if(employeeWorkHourDeductionList){
                await controllerLogger(req)
                return res.status(200).json({status:"OK", last_page:lastPage, data:employeeWorkHourDeductionList.recordset})
             }
           
            throw new Error("Error in getemployeeWorkHourDeductionListFromTnaproxy function")
        } catch (error) {
            console.log("Error in getemployeeWorkHourDeductionList function : ",error)
            await controllerLogger(req, error)
            return res.status(200).json({status:"failed",last_page:"", data:"",error:error})
        }
    },
    updateHourDeductionData:async(req,res)=>{
        try {
            let db = req.app.locals.db;
            let {HoursPerDay,UserID,FromDate,ToDate,Remarks,UpdatedBy,Department } = req.body
            const remarksRegex = /^[a-zA-Z0-9\s.,!?'-]*$/;
            if (!remarksRegex.test(Remarks)) {
                return res.status(400).json({status:"not ok",error:"Invalid input in Remarks.",data:{HoursPerDay,UserID,FromDate,ToDate,UpdatedBy,Department }})
            } 
            let response = await db.query(`
                UPDATE [TNA_PROXY].[dbo].[Px_UserHourDeduTrn] 
                SET 
                    HoursPerDay=ROUND(${HoursPerDay}, 1),
                    FromDate='${FromDate}', 
                    ToDate='${ToDate}', 
                    Remarks='${Remarks}', 
                    UpdatedBy='${UpdatedBy}', 
                    DepartmentId='${Department}' 
                WHERE UserID='${UserID}'`)
            if(response.rowsAffected[0] > 0){
                await controllerLogger(req)
                return res.status(200).json({status:"ok",error:"",data:{HoursPerDay,UserID,FromDate,ToDate,UpdatedBy,Department }})
            }else{
                await controllerLogger(req)
                return res.status(200).json({status:"not ok",error:"Failed to update updateHourDeductionData",data:{HoursPerDay,UserID,FromDate,ToDate,UpdatedBy,Department }})
            }
        } catch (error) {
            console.log("Error in updateHourDeductionData function : ",error)
            await controllerLogger(req,error)
            return res.status(200).json({status:"not ok",error:error.message,data:""})
        }
    },
    updateHourDeductionViaCSVUpload:async(req, res)=>{
        try {
            let {jsonData,UpdatedBy} = req.body;
            let db = req.app.locals.db;
            let responseStatus = [];
            const remarksRegex = /^[a-zA-Z0-9\s.,!?'-]*$/;
            for (let index = 0; index < jsonData.length; index++) {
                const element = jsonData[index];
                if (!remarksRegex.test(element.Remarks)) {
                    responseStatus.push({
                        RowNum:element.RowNum,
                        HoursPerDay:element.HoursPerDay,
                        UserID:element.UserID,
                        UserName:element.UserName,
                        FromDate:element.FromDate,
                        ToDate: element.ToDate,
                        Remarks:element.Remarks,
                        DepartmentId: element.DepartmentId,
                        Status:`Fail`,
                        Message:'Invalid input in Remarks.'
                    })
                    continue;
                } 
                let response = await db.query(`
                    MERGE [TNA_PROXY].[dbo].[Px_UserHourDeduTrn] AS target
                    USING (SELECT 
                                '${element.UserID}' AS UserID, 
                                '${element.UserName}' AS UserName, 
                                ROUND(${element.HoursPerDay}, 1) AS HoursPerDay, 
                                '${element.FromDate}' AS FromDate, 
                                '${element.ToDate}' AS ToDate, 
                                '${element.Remarks}' AS Remarks, 
                                '${UpdatedBy}' AS UpdatedBy, 
                                '${element.DepartmentId}' AS DepartmentId
                            ) AS source
                    ON (target.UserID = source.UserID)
                    WHEN MATCHED THEN
                        UPDATE SET 
                            target.HoursPerDay = source.HoursPerDay,
                            target.FromDate = source.FromDate, 
                            target.ToDate = source.ToDate, 
                            target.Remarks = source.Remarks, 
                            target.UpdatedBy = source.UpdatedBy, 
                            target.DepartmentId = source.DepartmentId
                    WHEN NOT MATCHED THEN
                        INSERT (UserID, UserName, HoursPerDay, FromDate, ToDate, Remarks, UpdatedBy, DepartmentId)
                        VALUES (source.UserID, source.UserName, source.HoursPerDay, source.FromDate, source.ToDate, source.Remarks, source.UpdatedBy, source.DepartmentId);
                `)
                if(response.rowsAffected[0] > 0){
                    responseStatus.push({
                        RowNum:element.RowNum,
                        HoursPerDay:element.HoursPerDay,
                        UserID:element.UserID,
                        UserName:element.UserName,
                        FromDate:element.FromDate,
                        ToDate: element.ToDate,
                        Remarks:element.Remarks,
                        DepartmentId: element.DepartmentId,
                        Status:`Success`,
                        Message:'Successfully updated UserId'
                    })
                }else{
                    responseStatus.push({
                        RowNum:element.RowNum,
                        HoursPerDay:element.HoursPerDay,
                        UserID:element.UserID,
                        UserName:element.UserName,
                        FromDate:element.FromDate,
                        ToDate: element.ToDate,
                        Remarks:element.Remarks,
                        DepartmentId: element.DepartmentId,
                        Status:`Fail`,
                        Message:'Failed to update UserId, Either UserId not found or DB Error'
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
    }
}

module.exports = employeesApiController;