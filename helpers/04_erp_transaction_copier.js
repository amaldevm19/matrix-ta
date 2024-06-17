
const {ProxyDbPool, sql} = require("../config/db");
const {MiddlewareHistoryLogger,EventCategory,EventType,EventStatus} = require("../helpers/19_middleware_history_logger");


async function PxERPTransactionTableBuilder({FromDate='', ToDate='',DepartmentId='',UserCategoryId=''}) {
    try {
        await ProxyDbPool.connect();
        const request = new sql.Request(ProxyDbPool);
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

            let message=`Started copying timesheet from [COSEC].[dbo].[Px_TimesheetMst] to [TNA_PROXY].[dbo].[Px_ERPTransactionMst] 
            for Department:${DepartmentId} and User Category:${UserCategoryId} 
            in PxERPTransactionTableBuilder function From ${FromDate} To ${ToDate}\n\n`;
            //console.log(message)
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
                TSM.UserCategoryId AS UserCategoryId,
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
                PDate BETWEEN '${FromDate}' AND '${ToDate}' AND PDate IS NOT NULL
                AND TSM.UserID IS NOT NULL AND TSM.UserID <> ''
                AND TSM.JobCode IS NOT NULL AND TSM.JobCode <> ''
                AND TotalJobTime IS NOT NULL AND TotalJobTime > (COALESCE(JPC.BreakHour, 1)*60 + COALESCE(JPC.TravelHour, 0)*60) + COALESCE(UHD.HoursPerDay, 0) + 15
                AND BranchId = 1
                AND ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR TSM.DepartmentId = '${DepartmentId}')
                AND ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR TSM.UserCategoryId = '${UserCategoryId}')
                                
            ) AS Source ON
            Target.HcmWorker_PersonnelNumber = CONCAT(
                LEFT(Source.HcmWorker_PersonnelNumber, PATINDEX('%[0-9]%', Source.HcmWorker_PersonnelNumber) - 1),
                '-',
                SUBSTRING(Source.HcmWorker_PersonnelNumber, PATINDEX('%[0-9]%', Source.HcmWorker_PersonnelNumber), LEN(Source.HcmWorker_PersonnelNumber))
            )
            AND Target.TransDate = Source.TransDate
            WHEN MATCHED AND Target.SyncCompleted=0 AND Target.readForERP=0 AND (
                (CAST(Target.TotalHours AS decimal(4, 1)) <> 
                    CAST( 
                        CASE  
                            WHEN Source.TotalHours <= CAST( 8 AS DECIMAL(4,1)) AND Source.TotalHours > 0 THEN Source.TotalHours   
                            WHEN Target.TotalHours > MaxJobHourPerDay 
                                OR Source.TotalHours - COALESCE(BreakHour, 1) - COALESCE(TravelHour, 0)-COALESCE(DeductionHours, 0) > MaxJobHourPerDay THEN MaxJobHourPerDay
                            ELSE Source.TotalHours - COALESCE(BreakHour, 1) - COALESCE(TravelHour, 0) - COALESCE(DeductionHours, 0)
                    END AS decimal(4, 1))
            OR Target.projId <> Source.projId) 
        ) THEN
        UPDATE SET
            TotalHours = CAST(
                        CASE 
                            WHEN Source.TotalHours <= CAST( 8 AS DECIMAL(4,1)) AND Source.TotalHours > 0 THEN Source.TotalHours 
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
                    WHEN Source.TotalHours <= CAST( 8 AS DECIMAL(4,1)) AND Source.TotalHours > 0 THEN Source.TotalHours
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
            if(result.rowsAffected){
                let message=`Successfully copied timesheet from [COSEC].[dbo].[Px_TimesheetMst] to [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
                 for Department:${DepartmentId} and User Category:${UserCategoryId} 
                 in PxERPTransactionTableBuilder function From ${FromDate} To ${ToDate} \n\n`;
                return {status:"ok",data:result.rowsAffected,message,error:""};
            }
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
async function getTimesheetFromERPTransactionMstTable({DepartmentId,UserCategoryId,FromDate, ToDate}){
    try {
        await ProxyDbPool.connect();
        const request = new sql.Request(ProxyDbPool);
        request.stream = true 
        const query = `
            SELECT 
                Id,
                HcmWorker_PersonnelNumber,
                TransDate,
                projId,
                TotalHours,
                CategoryId 
            FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
            WHERE 
                ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId ? DepartmentId : 0}) AND
                ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId ? UserCategoryId : 0}) AND
                (('${FromDate}'='' AND '${ToDate}'='') OR TransDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                (SyncCompleted = 0 AND Error = 0 AND readForERP = 0);
        `;
        request.query(query);
        request.on('error', async (err) => {
            const message = `Error in getTimesheetFromERPTransactionMstTable function : ${err}`;
            console.log(message);
            await MiddlewareHistoryLogger({EventType:EventType.ERROR, EventCategory:EventCategory.SYSTEM, EventStatus:EventStatus.FAILED, EventText:String(message)});
            throw err;
        });
        return request;
    } catch (error) {
        const message = `Error connecting to the database in getTimesheetFromERPTransactionMstTable function : ${error}`;
        console.log(message);
        await MiddlewareHistoryLogger({EventType:EventType.ERROR, EventCategory:EventCategory.SYSTEM, EventStatus:EventStatus.FAILED, EventText:String(message)});
        throw error;
    }
}

async function updateERPTransactionStatus(postingResult) {
    try {
        await ProxyDbPool.connect();
        let results = [];
        const message = `Starting updating [TNA_PROXY].[dbo].[Px_ERPTransactionMst] with D365_response in updateERPTransactionStatus function`;
        console.log(message);
        await MiddlewareHistoryLogger({ EventType: EventType.INFORMATION, EventCategory: EventCategory.SYSTEM, EventStatus: EventStatus.STARTED, EventText: String(message) });
        const request = new sql.Request(ProxyDbPool);
        
        for (let index = 0; index < postingResult.length; index++) {
            const element = postingResult[index];
            let query = "";
            let updatedQuery = {}
            if (element.Error) {
                query = `UPDATE [TNA_PROXY].[dbo].[Px_ERPTransactionMst] 
                         SET Error = 1, ErrorText = '${sanitizeInput(element.ErrorTxt)}'
                         WHERE HcmWorker_PersonnelNumber = '${sanitizeInput(element.HcmWorker_PersonnelNumber)}' 
                         AND TransDate = '${element.TransDate.slice(0, 10)} 00:00:00.000'
                         AND projId = '${sanitizeInput(element.ProjId)}'`;
                updatedQuery = {...element, SyncCompleted: 0}
            } else {
                query = `UPDATE [TNA_PROXY].[dbo].[Px_ERPTransactionMst] 
                         SET SyncCompleted = 1 
                         WHERE HcmWorker_PersonnelNumber = '${sanitizeInput(element.HcmWorker_PersonnelNumber)}'
                         AND TransDate = '${element.TransDate.slice(0, 10)} 00:00:00.000'
                         AND projId = '${sanitizeInput(element.ProjId)}'`;
                updatedQuery = {...element, SyncCompleted: 1}
            }
            let db_response = await request.query(query);
            if(db_response?.rowsAffected[0]){
                results.push(updatedQuery)
            }
        }

        if(results){
            const completionMessage = `Completed updating [TNA_PROXY].[dbo].[Px_ERPTransactionMst] with D365_response in updateERPTransactionStatus function`;
            console.log(completionMessage);
            await MiddlewareHistoryLogger({ EventType: EventType.INFORMATION, EventCategory: EventCategory.SYSTEM, EventStatus: EventStatus.COMPLETED, EventText: String(completionMessage) });
            return { data: results, error: "", status: "ok" };
        }
    
    } catch (error) {
        const connectionErrorMessage = `Error connecting to the database in updateERPTransactionStatus function: ${error}`;
        console.log(connectionErrorMessage);
        await MiddlewareHistoryLogger({ EventType: EventType.ERROR, EventCategory: EventCategory.SYSTEM, EventStatus: EventStatus.FAILED, EventText: String(connectionErrorMessage) });
        return { data: "", error: error, status: "not ok" };
    }
    
}

async function updateReadForERP({FromDate, ToDate, UserCategoryId, DepartmentId,eventEmitter, stream}){
    try {
        eventEmitter.emit("db-lock");
        await ProxyDbPool.connect();
        let request = new sql.Request(ProxyDbPool);
        let query = `
            UPDATE [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
            SET readForERP = 1
            WHERE 
                ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId ? DepartmentId : 0}) AND
                ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId ? UserCategoryId : 0}) AND
                (('${FromDate}'='' AND '${ToDate}'='') OR TransDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                (SyncCompleted = 0 AND Error = 0 AND readForERP = 0);
        `
        let db_response = await request.query(query);
        if(db_response?.rowsAffected[0]){
            eventEmitter.emit("db-unlock");
            stream.resume();
        }
    } catch (error) {
        console.log(error)
    }

}

 function sanitizeInput(input) {
    if(!input){
        return input;
    }
    // Use a regular expression to remove characters other than a-zA-Z0-9 and hyphen (-)
    return input.trim().replace(/[^a-zA-Z0-9-]/g, '');
}






module.exports={PxERPTransactionTableBuilder, getTimesheetFromERPTransactionMstTable, updateERPTransactionStatus,updateReadForERP};