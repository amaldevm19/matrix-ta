
const {ProxyDbPool, sql} = require("../config/db");
const {MiddlewareHistoryLogger,EventCategory,EventType,EventStatus} = require("../helpers/19_middleware_history_logger");
//const {dataBaseReadWriteEvents} = require("./08_erp_transaction_process");

async function PxERPTransactionTableBuilder({FromDate='', ToDate='',DepartmentId=0,UserCategoryId=0,request}) {
    try {
      try {
            if(!FromDate){
                FromDate = new Date();
                // Set to the 26th of the current month
                FromDate.setDate(26);
                // Check if the month is January
                if (FromDate.getMonth() === 0) {
                    // If it's January, set to December of the previous year
                    FromDate.setFullYear(FromDate.getFullYear() - 1);
                    FromDate.setMonth(11); // December is month 11 (0-based index)
                } else {
                    // Otherwise, set to the previous month
                    FromDate.setMonth(FromDate.getMonth() - 1);
                }
                // Set the time to UTC 00:00:00
                FromDate.setUTCHours(0, 0, 0, 0);
                // Format the date as required
                FromDate = FromDate.toISOString().replace("T", " ").replace("Z", "");
            }
            if(!ToDate){
                ToDate = new Date();
                ToDate.setUTCHours(0, 0, 0, 0);
                ToDate = ToDate.toISOString().replace("T"," ").replace("Z","")
            }

            let message = `Started copying data from [TNA_PROXY].[dbo].[Px_TimesheetMst] to [TNA_PROXY].[dbo].[Px_ERPTransactionMst] for From ${FromDate} To ${ToDate} `;
            console.log(message)
            await MiddlewareHistoryLogger({EventType:EventType.INFORMATION,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.STARTED,EventText:String(message)});
            const result = await request.query(`
            MERGE INTO [TNA_PROXY].[dbo].[Px_ERPTransactionMst] AS Target
            USING (
            SELECT
                TSM.UserID AS HcmWorker_PersonnelNumber,
                PDate AS TransDate,
                TSM.JobCode AS projId,
                CASE 
                    WHEN TotalJobTime % 60 >= 15 AND TotalJobTime % 60 < 45 THEN CAST(FLOOR(TotalJobTime / 60) + 0.5 AS DECIMAL(4,1))
                    WHEN TotalJobTime % 60 >= 45 THEN CAST(FLOOR(TotalJobTime / 60) + 1 AS DECIMAL(4,1))
                    ELSE CAST(FLOOR(TotalJobTime / 60) AS DECIMAL(4,1))
                END AS TotalHours,
                BranchId,
                TSM.DepartmentId AS DepartmentId,
                UserCategoryId,
                EmployeeCategoryId,
                DesignationId,
                CustomGroup3Id,
                SectionId,
                'Timesheet' AS CategoryId,
                JPC.MaxJobHourPerDay AS MaxJobHourPerDay,
                JPC.BreakHour AS BreakHour,
                JPC.TravelHour AS TravelHour,
                UHD.HoursPerDay AS DeductionHours
                                
            FROM [TNA_PROXY].[dbo].[Px_TimesheetMst] AS TSM
            LEFT JOIN [TNA_PROXY].[dbo].[Px_JPCJobMst] AS JPC ON TSM.JobCode = JPC.JobCode
            LEFT JOIN [TNA_PROXY].[dbo].[Px_UserHourDeduTrn] AS UHD ON TSM.UserID = UHD.UserID AND TSM.PDate BETWEEN UHD.FromDate AND UHD.ToDate
            WHERE
                PDate BETWEEN '${FromDate}' AND '${ToDate}'
                AND TSM.UserID IS NOT NULL AND TSM.UserID <> ''
                AND PDate IS NOT NULL
                AND TSM.JobCode IS NOT NULL AND TSM.JobCode <> ''
                AND TotalJobTime IS NOT NULL
                AND BranchId = 1
                AND TotalJobTime > (COALESCE(JPC.BreakHour, 1)*60 + COALESCE(JPC.TravelHour, 0)*60) + COALESCE(UHD.HoursPerDay, 0) + 15
                --AND TSM.DepartmentId = 2
                --AND UserCategoryId = 2
                                
            ) AS Source ON
            Target.HcmWorker_PersonnelNumber = CONCAT(
                LEFT(Source.HcmWorker_PersonnelNumber, PATINDEX('%[0-9]%', Source.HcmWorker_PersonnelNumber) - 1),
                '-',
                SUBSTRING(Source.HcmWorker_PersonnelNumber, PATINDEX('%[0-9]%', Source.HcmWorker_PersonnelNumber), LEN(Source.HcmWorker_PersonnelNumber))
            )
            AND Target.TransDate = Source.TransDate
            WHEN MATCHED AND Target.SyncCompleted = 0 AND (
                (CAST(Target.TotalHours AS decimal(4, 1)) <> 
                    CAST( 
                        CASE  
                            WHEN Source.TotalHours < 8.0 THEN Source.TotalHours  
                            WHEN Target.TotalHours > MaxJobHourPerDay 
                                OR Source.TotalHours - COALESCE(BreakHour, 1) - COALESCE(TravelHour, 0)-COALESCE(DeductionHours, 0) > MaxJobHourPerDay THEN MaxJobHourPerDay
                            ELSE Source.TotalHours - COALESCE(BreakHour, 1) - COALESCE(TravelHour, 0) - COALESCE(DeductionHours, 0)
                    END AS decimal(4, 1))
            OR Target.projId <> Source.projId) 
        ) THEN
        UPDATE SET
            TotalHours = CAST(
                        CASE 
                            WHEN Source.TotalHours < 8.0 THEN Source.TotalHours 
                            WHEN Target.TotalHours > COALESCE(Source.MaxJobHourPerDay, Target.TotalHours) 
                                OR Source.TotalHours-COALESCE(BreakHour, 1)-COALESCE(TravelHour, 0) - COALESCE(DeductionHours, 0) > COALESCE(Source.MaxJobHourPerDay, Source.TotalHours)  THEN MaxJobHourPerDay
                            ELSE Source.TotalHours - COALESCE(BreakHour, 1) - COALESCE(TravelHour, 0) - COALESCE(DeductionHours, 0)
                        END AS decimal(4, 1)),
            projId = Source.projId
        WHEN NOT MATCHED THEN
            INSERT (
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
                CustomGroup3Id,
                CategoryId
            ) VALUES (
                CONCAT(
                    LEFT(Source.HcmWorker_PersonnelNumber, PATINDEX('%[0-9]%', Source.HcmWorker_PersonnelNumber) - 1),
                    '-',
                    SUBSTRING(Source.HcmWorker_PersonnelNumber, PATINDEX('%[0-9]%', Source.HcmWorker_PersonnelNumber), LEN(Source.HcmWorker_PersonnelNumber))
                ),
                Source.TransDate,
                Source.projId,
                CASE
                    WHEN Source.TotalHours < 8.0 THEN Source.TotalHours
                    WHEN Source.TotalHours-COALESCE(BreakHour, 1)-COALESCE(TravelHour, 0) - COALESCE(DeductionHours, 0) > COALESCE(Source.MaxJobHourPerDay, Source.TotalHours) THEN COALESCE(Source.MaxJobHourPerDay, Source.TotalHours)
                    ELSE Source.TotalHours - COALESCE(BreakHour, 1) - COALESCE(TravelHour, 0)-COALESCE(DeductionHours, 0)
                END,
                Source.BranchId,
                Source.DepartmentId,
                Source.UserCategoryId,
                Source.EmployeeCategoryId,
                Source.DesignationId,
                Source.SectionId,
                Source.CustomGroup3Id,
                Source.CategoryId
            );
            `)
            // CAST(Source.TotalHours AS decimal(4, 1))
            if(result.rowsAffected){
                message = `Successfully copied data from [TNA_PROXY].[dbo].[Px_TimesheetMst] to [TNA_PROXY].[dbo].[Px_ERPTransactionMst] for From ${FromDate} To ${ToDate} `;
                console.log(message)
                await MiddlewareHistoryLogger({EventType:EventType.INFORMATION,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.SUCCESS,EventText:String(message)});
                return {status:"ok",data:result.rowsAffected,error:""};
            }
            throw (new Error("PxERPTransactionTableBuilder function returned null"))
      } catch (error) {

        let message =`Error in PxERPTransactionTableBuilder function : ${error}`;
        console.log(message)
        await MiddlewareHistoryLogger({EventType:EventType.ERROR,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.FAILED,EventText:String(message)})
        return {status:"not ok",data:"",error};
      }
        
    } catch (error) {
        let message = `Error connecting to the database in PxERPTransactionTableBuilder function : ${error}`;
        console.log(message)
        await MiddlewareHistoryLogger({EventType:EventType.ERROR,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.FAILED,EventText:String(message)})
        return {status:"not ok",data:"",error};
    }
}
async function getTimesheetFromERPTransactionMstTable({
    sendingCount,
    EmployeeId,
    JobCode,
    DepartmentId,
    UserCategoryId,
    EmployeeCategoryId,
    DesignationId,
    SectionId, 
    FromDate, 
    ToDate,
    SyncCompleted,
    }){
    try {
        await ProxyDbPool.connect();
        const request = new sql.Request(ProxyDbPool);
        try {
            let result = await request.query(`
                SELECT TOP (${sendingCount})[Id]
                ,[HcmWorker_PersonnelNumber]
                ,CONVERT(NVARCHAR(10), TransDate, 120) AS TransDate
                ,[projId]
                ,[TotalHours]
                ,[CategoryId]
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
                (SyncCompleted = ${SyncCompleted} AND Error=0 );
            `);
            let message = `Started getting data from [TNA_PROXY].[dbo].[Px_ERPTransactionMst] for EmployeeId: ${EmployeeId}, JobCode: ${JobCode},DepartmentId: ${DepartmentId},UserCategoryId: ${UserCategoryId},EmployeeCategoryId:${EmployeeCategoryId},DesignationId: ${DesignationId},SectionId: ${SectionId},FromDate: ${FromDate},ToDate: ${ToDate}, and SyncCompleted: ${SyncCompleted}`;
            console.log(message)
            await MiddlewareHistoryLogger({EventType:EventType.INFORMATION,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.STARTED,EventText:String(message)})
            if(result?.recordset){
                let message = `Successfully completed getting data from [TNA_PROXY].[dbo].[Px_ERPTransactionMst] for EmployeeId: ${EmployeeId}, JobCode: ${JobCode},DepartmentId: ${DepartmentId},UserCategoryId: ${UserCategoryId},EmployeeCategoryId:${EmployeeCategoryId},DesignationId: ${DesignationId},SectionId: ${SectionId},FromDate: ${FromDate},ToDate: ${ToDate}, and SyncCompleted: ${SyncCompleted}`;
                console.log(message)
                await MiddlewareHistoryLogger({EventType:EventType.INFORMATION,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.STARTED,EventText:String(message)});
                return {data:result.recordset, error:"",status:"ok", request}
            }
            
            throw new Error("Error in getTimesheetFromERPTransactionMstTable function returned null rows")

        } catch (error) {
            let message =`Error in getTimesheetFromERPTransactionMstTable function : ${error}`;
            console.log(message)
            await MiddlewareHistoryLogger({EventType:EventType.ERROR,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.FAILED,EventText:String(message)})
            return {data:"", error:message,status:"not ok"}
        }
    } catch (error) {
        let message =`Error connecting to the database in getTimesheetFromERPTransactionMstTable function : ${error}`;
        console.log(message)
        await MiddlewareHistoryLogger({EventType:EventType.ERROR,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.FAILED,EventText:String(message)})
        return {data:"", error:message,status:"not ok"}
    }
}
async function updateERPTransactionStatus(pendingD365ResponseArray) {
    try {
        await ProxyDbPool.connect();
        const request = new sql.Request(ProxyDbPool);
        try {
            let results =[];
            let message = `Starting updating [TNA_PROXY].[dbo].[Px_ERPTransactionMst] with D365_response in updateERPTransactionStatus function`;
            console.log(message)
            await MiddlewareHistoryLogger({EventType:EventType.INFORMATION,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.STARTED,EventText:String(message)});
            for (let index = pendingD365ResponseArray.length; index > 0; ) {
                const element = pendingD365ResponseArray[index-1]
                let query = "";
                if (element.Error) {
                    query = `UPDATE [TNA_PROXY].[dbo].[Px_ERPTransactionMst] 
                            SET Error = 1, ErrorText = '${element.ErrorTxt}' 
                            WHERE HcmWorker_PersonnelNumber = '${element.HcmWorker_PersonnelNumber}'
                            AND TransDate = '${element.TransDate.slice(0, 10)} 00:00:00.000'
                            AND projId = '${element.ProjId}'`;
                } else {
                    query = `UPDATE [TNA_PROXY].[dbo].[Px_ERPTransactionMst] 
                            SET SyncCompleted = 1 
                            WHERE HcmWorker_PersonnelNumber = '${element.HcmWorker_PersonnelNumber}'
                            AND TransDate = '${element.TransDate.slice(0, 10)} 00:00:00.000'
                            AND projId = '${element.ProjId}'`;
                }
                try {
                    const result = await request.query(query);
                    if (result?.rowsAffected[0]) {
                        console.log({ ...element, SyncCompleted: 1 })
                        results.push({ ...element, SyncCompleted: 1 });
                        pendingD365ResponseArray.pop();
                        index--;
                    } else {
                        results.push(element);
                    }
                } catch (error) {
                    let message = `Error in updating status for HcmWorker_PersonnelNumber: ${element.HcmWorker_PersonnelNumber} and Message: ${error.message}`;
                    console.log(message);
                    await MiddlewareHistoryLogger({EventType:EventType.INFORMATION,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.COMPLETED,EventText:String(message)});
                    setTimeout(()=>{},2000)
                }
            }
            if(results){
                let message = `Completed updating [TNA_PROXY].[dbo].[Px_ERPTransactionMst] with D365_response in updateERPTransactionStatus function`;
                console.log(message)
                await MiddlewareHistoryLogger({EventType:EventType.INFORMATION,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.COMPLETED,EventText:String(message)});
            }
            return {data:results, error:"", status:"ok"}
        } catch (error) {
            let message =`Error in updateERPTransactionStatus function : ${error}`;
            console.log(message)
            await MiddlewareHistoryLogger({EventType:EventType.ERROR,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.FAILED,EventText:String(message)})
            return {data:"", error, status:"not ok"}
        }
    } catch (error) {
        let message =`Error connecting to the database in updateERPTransactionStatus function : ${error}`;
        console.log(message)
        await MiddlewareHistoryLogger({EventType:EventType.ERROR,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.FAILED,EventText:String(message)})
        return {data:"", error, status:"not ok"}
    }

}

module.exports={PxERPTransactionTableBuilder, getTimesheetFromERPTransactionMstTable, updateERPTransactionStatus};