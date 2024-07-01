
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
      const result1 = await request.query(`
        IF OBJECT_ID('tempdb..#FirstMissingDate') IS NOT NULL
        DROP TABLE #FirstMissingDate;
        WITH Sundays AS (
            SELECT 
                Id,
                [UserID],
                PDate,
                [JobCode],
                [TotalJobTime],
                DATEPART(dw,  PDate) AS DayOfWeek
            FROM [TNA_PROXY].[dbo].[Px_TimesheetMst]
            WHERE DATEPART(dw,  PDate) = 1 -- Sunday
            AND  [PDate] BETWEEN '${fromDate}' AND '${toDate}'
          AND [TotalJobTime] > 0 
        ),
        PreviousDays AS (
            SELECT 
                s.Id AS SundayId,
                s.[UserID],
                s.[JobCode],
                s.[TotalJobTime],
                s.PDate AS SundayTransDate,
                DATEADD(day, -1, s.PDate) AS Saturday,
                DATEADD(day, -2, s.PDate) AS Friday,
                DATEADD(day, -3, s.PDate) AS Thursday,
                DATEADD(day, -4, s.PDate) AS Wednesday,
                DATEADD(day, -5, s.PDate) AS Tuesday,
                DATEADD(day, -6, s.PDate) AS Monday
            FROM Sundays s
        ),
        MissingDates AS (
        SELECT
                pd.SundayId,
                pd.[UserID],
                pd.[JobCode],
                pd.[TotalJobTime],
                pd.SundayTransDate,
                pd.Monday AS MissingTransDate
            FROM PreviousDays pd
            LEFT JOIN [TNA_PROXY].[dbo].[Px_TimesheetMst] t1
                ON pd.[UserID] = t1.[UserID]
                AND pd.Monday = t1.[PDate]
            WHERE t1.[TotalJobTime]=0 AND t1.[LeaveID] IS NULL
          AND pd.Monday BETWEEN '${fromDate}' AND '${toDate}'
            
          UNION ALL
            SELECT
                pd.SundayId,
                pd.[UserID],
                pd.[JobCode],
                pd.[TotalJobTime],
                pd.SundayTransDate,
                pd.Tuesday AS MissingTransDate
            FROM PreviousDays pd
            LEFT JOIN [TNA_PROXY].[dbo].[Px_TimesheetMst] t2
                ON pd.[UserID] = t2.[UserID]
                AND pd.Tuesday = t2.[PDate]
            WHERE t2.[TotalJobTime]=0 AND t2.[LeaveID] IS NULL
          AND pd.Tuesday BETWEEN '${fromDate}' AND '${toDate}'
            
          UNION ALL
            SELECT
                pd.SundayId,
                pd.[UserID],
                pd.[JobCode],
                pd.[TotalJobTime],
                pd.SundayTransDate,
                pd.Wednesday AS MissingTransDate
            FROM PreviousDays pd
            LEFT JOIN [TNA_PROXY].[dbo].[Px_TimesheetMst] t3
                ON pd.[UserID] = t3.[UserID]
                AND pd.Wednesday = t3.[PDate]
            WHERE t3.[TotalJobTime]=0 AND t3.[LeaveID] IS NULL
          AND pd.Wednesday BETWEEN '${fromDate}' AND '${toDate}'
            
          UNION ALL
            SELECT
                pd.SundayId,
                pd.[UserID],
                pd.[JobCode],
                pd.[TotalJobTime],
                pd.SundayTransDate,
                pd.Thursday AS MissingTransDate
            FROM PreviousDays pd
            LEFT JOIN [TNA_PROXY].[dbo].[Px_TimesheetMst] t4
                ON pd.[UserID] = t4.[UserID]
                AND pd.Thursday = t4.[PDate]
            WHERE t4.[TotalJobTime]=0 AND t4.[LeaveID] IS NULL
          AND pd.Thursday BETWEEN '${fromDate}' AND '${toDate}'
            
          UNION ALL
            SELECT
                pd.SundayId,
                pd.[UserID],
                pd.[JobCode],
                pd.[TotalJobTime],
                pd.SundayTransDate,
                pd.Friday AS MissingTransDate
            FROM PreviousDays pd
            LEFT JOIN [TNA_PROXY].[dbo].[Px_TimesheetMst] t5
                ON pd.[UserID] = t5.[UserID]
                AND pd.Friday = t5.[PDate]
            WHERE t5.[TotalJobTime]=0 AND t5.[LeaveID] IS NULL
          AND  pd.Friday BETWEEN '${fromDate}' AND '${toDate}'
            
          UNION ALL
            SELECT
                pd.SundayId,
                pd.[UserID],
                pd.[JobCode],
                pd.[TotalJobTime],
                pd.SundayTransDate,
                pd.Saturday AS MissingTransDate
            FROM PreviousDays pd
            LEFT JOIN [TNA_PROXY].[dbo].[Px_TimesheetMst] t6
                ON pd.[UserID] = t6.[UserID]
                AND pd.Saturday = t6.[PDate]
            WHERE t6.[TotalJobTime]=0 AND t6.[LeaveID] IS NULL
          AND pd.Saturday BETWEEN '${fromDate}' AND '${toDate}'
        ),
        FirstMissingDate AS (
          SELECT 
            SundayId,
            [UserID],
            [JobCode],
            [TotalJobTime],
            MIN(MissingTransDate) AS MissingTransDate
          FROM MissingDates
          GROUP BY SundayId,[TotalJobTime],[JobCode],[UserID]
        )
        -- Insert the results of FirstMissingDate into the temporary table
        SELECT * INTO #FirstMissingDate FROM FirstMissingDate;

        -- First update: update records with the missing date
        UPDATE t
        SET t.[TotalJobTime] = fmd.[TotalJobTime], t.[JobCode] = fmd.[JobCode]
        FROM [TNA_PROXY].[dbo].[Px_TimesheetMst] t
        INNER JOIN #FirstMissingDate fmd
        ON t.[UserID] = fmd.[UserID] AND t.PDate = fmd.MissingTransDate;

        -- Second update: update the Sunday entries
        UPDATE t
        SET t.[TotalJobTime] = 0, t.[JobCode] = NULL
        FROM [TNA_PROXY].[dbo].[Px_TimesheetMst] t
        INNER JOIN #FirstMissingDate fmd
            ON t.Id = fmd.SundayId;
        -- Drop the temporary table
        DROP TABLE #FirstMissingDate;
      `);

      //if(result){
      if(result && result1){
        let message=`Successfully copied timesheet from [COSEC].[dbo].[Mx_JPCTimeSheet] to [TNA_PROXY].[dbo].[Px_TimesheetMst]
         in copyTimesheetFromCosecToProxyDbFunction From:${fromDate} To:${toDate}`
        console.log(message)
        MiddlewareHistoryLogger({EventType:EventType.INFORMATION,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.SUCCESS,EventText:String(message)})
        return "OK";
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