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
            console.log(`page : ${page}, pageSize : ${pageSize}, searchField : ${searchField} `)
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
            let {HoursPerDay,UserID,FromDate,ToDate,UpdatedBy,Department } = req.body
            let response = await db.query(`
                UPDATE [TNA_PROXY].[dbo].[Px_UserHourDeduTrn] 
                SET 
                    HoursPerDay=ROUND(${HoursPerDay}, 1),
                    FromDate='${FromDate}', 
                    ToDate='${ToDate}', 
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
    }
}

module.exports = employeesApiController;