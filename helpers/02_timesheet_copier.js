
const {ProxyDbPool, sql} = require("../config/db");
const {MiddlewareHistoryLogger,EventCategory,EventType,EventStatus} = require("../helpers/19_middleware_history_logger");


async function copyTimesheetFromCosecToProxyDbFunction( {fromDate, toDate}) {
  try {
    await ProxyDbPool.connect();
    const request = new sql.Request(ProxyDbPool);
    try {
      const result = await request.query(`
        DELETE FROM [TNA_PROXY].[dbo].[Px_TimesheetMst];
        DBCC CHECKIDENT ('[TNA_PROXY].[dbo].[Px_TimesheetMst]', RESEED, 0);
        WITH DateRangeCTE AS (
            SELECT CAST('${fromDate}' AS DATE) AS PDate
            UNION ALL
            SELECT DATEADD(DAY, 1, PDate)
            FROM DateRangeCTE
            WHERE PDate < CAST('${toDate}' AS DATE)
        )
        MERGE INTO [TNA_PROXY].[dbo].[Px_TimesheetMst] AS Target
        USING (
            SELECT
                DateRangeCTE.PDate,
                MxUser.UserID,
                MxUser.Name,
                MxUser.BRCID,
                MxUser.DPTID,
                MxUser.CG1ID,
                MxUser.CTGID,
                MxUser.DSGID,
                MxUser.SECID,
                MxUser.CG3ID,
                JTS.JobCode,
                COALESCE(SUM(JTS.JobTime), 0) AS TotalJobTime,
                MAX(LT.LeaveID) AS LeaveID
            FROM
                DateRangeCTE
            CROSS JOIN (
                SELECT UserID, Name, BRCID, DPTID, CG1ID, CTGID,DSGID,SECID,CG3ID
                FROM [COSEC].[dbo].[Mx_UserMst]
                WHERE BRCID = '1' AND UserIDEnbl = '1' 
            ) AS MxUser
            LEFT JOIN
                [COSEC].[dbo].[Mx_JPCTimeSheet] JTS ON DateRangeCTE.PDate = JTS.PDate AND MxUser.UserID = JTS.UserID
            LEFT JOIN [COSEC].[dbo].[Mx_LeaveTrn] LT
                ON MxUser.UserID = LT.UserID
                AND DateRangeCTE.PDate BETWEEN LT.FromDate AND LT.ToDate
            GROUP BY
                DateRangeCTE.PDate,
                MxUser.UserID,
                MxUser.Name,
                MxUser.BRCID,
                MxUser.DPTID,
                MxUser.CG1ID,
                MxUser.CTGID,
                MxUser.DSGID,
                MxUser.SECID,
                MxUser.CG3ID,
                JTS.JobCode
        ) AS Source
        ON (Target.PDate = Source.PDate AND Target.UserID = Source.UserID AND COALESCE(Target.JobCode, '') = COALESCE(Source.JobCode, ''))
        WHEN MATCHED AND Target.TotalJobTime <> Source.TotalJobTime THEN
            UPDATE SET TotalJobTime = Source.TotalJobTime, JobCode = Source.JobCode
        WHEN NOT MATCHED THEN
            INSERT (PDate, UserID,Name, BranchId, DepartmentId, UserCategoryId, EmployeeCategoryId, DesignationId, SectionId,CustomGroup3Id, JobCode, TotalJobTime,LeaveID)
            VALUES (Source.PDate, Source.UserID, Source.Name, Source.BRCID, Source.DPTID, Source.CG1ID, Source.CTGID, Source.DSGID, Source.SECID,Source.CG3ID, Source.JobCode, Source.TotalJobTime,Source.LeaveID);
        IF OBJECT_ID('tempdb..#TempTimesheetTable', 'U') IS NOT NULL DROP TABLE #TempTimesheetTable;
        IF OBJECT_ID('tempdb..#TempTimesheetWithoutDuplicates', 'U') IS NOT NULL DROP TABLE #TempTimesheetWithoutDuplicates;
        SELECT DISTINCT
            a.PDate,
            a.UserID,
            a.Name,
            a.BranchId,
            a.DepartmentId,
            a.UserCategoryId,
            a.EmployeeCategoryId,
            a.DesignationId,
            a.SectionId,
            a.CustomGroup3Id,
            COALESCE(a.JobCode, b.JobCode) AS FinalJobCode,
            SUM(a.TotalJobTime) OVER (PARTITION BY a.PDate, a.UserID) AS SumTotalJobTime,
            a.LeaveID
        INTO #TempTimesheetTable
        FROM [TNA_PROXY].[dbo].[Px_TimesheetMst] a
        JOIN (
            SELECT PDate, UserID, MAX(JobCode) AS JobCode
            FROM [TNA_PROXY].[dbo].[Px_TimesheetMst]
            GROUP BY PDate, UserID
            HAVING COUNT(*) > 1
        ) b ON a.PDate = b.PDate AND a.UserID = b.UserID
        ORDER BY a.UserID;
        WITH CTE AS (
            SELECT
                PDate,
                UserID,
                Name,
                BranchId,
                DepartmentId,
                UserCategoryId,
                EmployeeCategoryId,
                DesignationId,
                SectionId,
                CustomGroup3Id,
                FinalJobCode,
                SumTotalJobTime,
                LeaveID,
                ROW_NUMBER() OVER (PARTITION BY PDate, UserID ORDER BY FinalJobCode DESC) AS RowNum
            FROM #TempTimesheetTable
            WHERE FinalJobCode IS NOT NULL OR NOT FinalJobCode=''
        )
        SELECT *
        INTO #TempTimesheetWithoutDuplicates
        FROM CTE
        WHERE RowNum = 1;
        DELETE FROM [TNA_PROXY].[dbo].[Px_TimesheetMst]
        WHERE EXISTS (
            SELECT 1
            FROM #TempTimesheetWithoutDuplicates
            WHERE [TNA_PROXY].[dbo].[Px_TimesheetMst].PDate = #TempTimesheetWithoutDuplicates.PDate
            AND [TNA_PROXY].[dbo].[Px_TimesheetMst].UserID = #TempTimesheetWithoutDuplicates.UserID
        );
        INSERT INTO [TNA_PROXY].[dbo].[Px_TimesheetMst] 
        (PDate, 
        UserID,
        Name,
        BranchId,
        DepartmentId,
        UserCategoryId,
        EmployeeCategoryId,
        DesignationId, 
        SectionId,
        CustomGroup3Id,
        JobCode, 
        TotalJobTime,
        LeaveID
        )
        SELECT  PDate, 
                UserID,
                Name,
                BranchId,
                DepartmentId,
                UserCategoryId,
                EmployeeCategoryId,
                DesignationId,
                SectionId,
                CustomGroup3Id, 
                FinalJobCode, 
                SumTotalJobTime,
                LeaveID
        FROM #TempTimesheetWithoutDuplicates;
      `);
      if(result){
        let message=`Successfully copied timesheet from [COSEC].[dbo].[Mx_JPCTimeSheet] to [TNA_PROXY].[dbo].[Px_TimesheetMst]
         in copyTimesheetFromCosecToProxyDbFunction From:${fromDate} To:${toDate}`
        console.log(message)
        MiddlewareHistoryLogger({EventType:EventType.INFORMATION,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.SUCCESS,EventText:String(message)})
        return 0;
      }
    } catch (error) {
      let message = `Error in copyTimesheetFromCosecToProxyDbFunction function : ${error.message}`
      console.log(message)
      MiddlewareHistoryLogger({EventType:EventType.ERROR,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.FAILED,EventText:String(message)})
    }
  } catch (error) {
    let message =`Error connecting to the database in copyTimesheetFromCosecToProxyDbFunction : ${error.message}`
    console.error(message);
    MiddlewareHistoryLogger({EventType:EventType.ERROR,EventCategory:EventCategory.DB,EventStatus:EventStatus.FAILED,EventText:String(message)})
  } 
  }
  

module.exports= {copyTimesheetFromCosecToProxyDbFunction}