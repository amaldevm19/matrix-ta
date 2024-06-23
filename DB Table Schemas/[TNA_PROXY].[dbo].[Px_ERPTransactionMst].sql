DROP TABLE [TNA_PROXY].[dbo].[Px_ERPTransactionMst]

DELETE FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
DBCC CHECKIDENT ('[TNA_PROXY].[dbo].[Px_ERPTransactionMst]', RESEED, 0);

--Create  [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
CREATE TABLE [TNA_PROXY].[dbo].[Px_ERPTransactionMst](
    Id INT IDENTITY(1,1) PRIMARY KEY,
    HcmWorker_PersonnelNumber NVARCHAR(30) NOT NULL,
    TransDate DATETIME NOT NULL,
    projId NVARCHAR(30) NOT NULL,
    TotalHours decimal(4, 1) NOT NULL,
    CategoryId NVARCHAR(30) NOT NULL,
    BranchId NVARCHAR(30) NOT NULL,
    DepartmentId NVARCHAR(30) NOT NULL,
    UserCategoryId NVARCHAR(30) NOT NULL,
    EmployeeCategoryId numeric(6,0),
    DesignationId  numeric(6,0),
    SectionId  numeric(6,0),
    CustomGroup3Id  numeric(6,0),
    SyncCompleted Bit DEFAULT 0 ,
    SyncTriggeredBy NVARCHAR(30),
    SyncTriggeredOn DATETIME,--To be updated in the Table
    Error Bit DEFAULT 0,
    ErrorText NVARCHAR(255),
    CreatedAt DATETIME DEFAULT GETDATE() NOT NULL,
    UpdatedAt DATETIME DEFAULT GETDATE(),
)

GO

CREATE TRIGGER Px_ERPTransactionMst_update_trigger
ON [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
AFTER UPDATE
AS
BEGIN
    UPDATE [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
    SET UpdatedAt = GETDATE()
    FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
    INNER JOIN inserted ON [TNA_PROXY].[dbo].[Px_ERPTransactionMst].Id = inserted.Id;
END;


UPDATE [TNA_PROXY].[dbo].[Px_ERPTransactionMst] SET SyncCompleted=1 WHERE [HcmWorker_PersonnelNumber]='SRU016316'


-- INSERT DATA TO [TNA_PROXY].[dbo].[Px_ERPTransactionMst] -- OLD
MERGE INTO [TNA_PROXY].[dbo].[Px_ERPTransactionMst] AS Target
USING (
SELECT
    UserID AS HcmWorker_PersonnelNumber,
    PDate AS TransDate,
    TSM.JobCode AS projId,
    CASE 
        WHEN CAST(TotalJobTime/60.0 AS decimal(4, 2)) % 1 >= 0.25 THEN 
            CAST(FLOOR(CAST(TotalJobTime/60 AS decimal(4, 1))) + 0.5 AS decimal(4, 1))
        ELSE 
            CAST(FLOOR(CAST(TotalJobTime/60 AS decimal(4, 1))) AS decimal(4, 1))
    END AS TotalHours,
    BranchId,
    TSM.DepartmentId AS DepartmentId,
    UserCategoryId,
    EmployeeCategoryId,
    DesignationId,
    CustomGroup3Id,
    SectionId,
    'Timesheet' AS CategoryId,
    JPC.MaxJobHourPerDay AS MaxJobHourPerDay
					
FROM [TNA_PROXY].[dbo].[Px_TimesheetMst] AS TSM
LEFT JOIN [TNA_PROXY].[dbo].[Px_JPCJobMst] AS JPC ON TSM.JobCode = JPC.JobCode
WHERE
    PDate BETWEEN '2023-12-01 00:00:00.000' AND '2023-12-20 00:00:00.000'
    AND UserID IS NOT NULL 
    AND PDate IS NOT NULL
    AND TSM.JobCode IS NOT NULL
    AND TotalJobTime IS NOT NULL
    AND UserID <> ''
    AND TSM.JobCode <> ''
    AND BranchId = 1
    AND TotalJobTime > 15
    AND TSM.DepartmentId = 2
    AND UserCategoryId = 2
                    
) AS Source ON
Target.HcmWorker_PersonnelNumber = CONCAT(
    LEFT(Source.HcmWorker_PersonnelNumber, PATINDEX('%[0-9]%', Source.HcmWorker_PersonnelNumber) - 1),
    '-',
    SUBSTRING(Source.HcmWorker_PersonnelNumber, PATINDEX('%[0-9]%', Source.HcmWorker_PersonnelNumber), LEN(Source.HcmWorker_PersonnelNumber))
)
AND Target.TransDate = Source.TransDate
AND Target.projId = Source.projId

WHEN MATCHED AND (
		(CAST(Target.TotalHours AS decimal(4, 1)) <> 
			CAST(CASE 
				WHEN Target.TotalHours > MaxJobHourPerDay OR Source.TotalHours > MaxJobHourPerDay THEN MaxJobHourPerDay
				ELSE Source.TotalHours
			END AS decimal(4, 1))
    OR Target.projId <> Source.projId) AND Target.SyncCompleted = 0
) THEN
UPDATE SET
    TotalHours = CAST(CASE 
					WHEN Target.TotalHours > MaxJobHourPerDay OR Source.TotalHours > MaxJobHourPerDay  THEN MaxJobHourPerDay
					ELSE Source.TotalHours
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
        WHEN Source.TotalHours > COALESCE(Source.MaxJobHourPerDay, Source.TotalHours) THEN COALESCE(Source.MaxJobHourPerDay, Source.TotalHours)
        ELSE Source.TotalHours
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



-- INSERT DATA TO [TNA_PROXY].[dbo].[Px_ERPTransactionMst] -- 05/06/2024

MERGE INTO [TNA_PROXY].[dbo].[Px_ERPTransactionMst] AS Target
            USING (
            SELECT
                UserID AS HcmWorker_PersonnelNumber,
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
                JPC.TravelHour AS TravelHour
                                
            FROM [TNA_PROXY].[dbo].[Px_TimesheetMst] AS TSM
            LEFT JOIN [TNA_PROXY].[dbo].[Px_JPCJobMst] AS JPC ON TSM.JobCode = JPC.JobCode
            WHERE
                PDate BETWEEN '${FromDate}' AND '${ToDate}'
                AND UserID IS NOT NULL 
                AND PDate IS NOT NULL
                AND TSM.JobCode IS NOT NULL
                AND TotalJobTime IS NOT NULL
                AND UserID <> ''
                AND TSM.JobCode <> ''
                AND BranchId = 1
                AND TotalJobTime > (COALESCE(JPC.BreakHour, 1)*60 + COALESCE(JPC.TravelHour, 0)*60) + 15
                --AND TSM.DepartmentId = 2
                --AND UserCategoryId = 2
                                
            ) AS Source ON
            Target.HcmWorker_PersonnelNumber = CONCAT(
                LEFT(Source.HcmWorker_PersonnelNumber, PATINDEX('%[0-9]%', Source.HcmWorker_PersonnelNumber) - 1),
                '-',
                SUBSTRING(Source.HcmWorker_PersonnelNumber, PATINDEX('%[0-9]%', Source.HcmWorker_PersonnelNumber), LEN(Source.HcmWorker_PersonnelNumber))
            )
            AND Target.TransDate = Source.TransDate
            AND Target.projId = Source.projId

            WHEN MATCHED AND (
                (CAST(Target.TotalHours AS decimal(4, 1)) <> 
                    CAST( 
                        CASE    WHEN Target.TotalHours > MaxJobHourPerDay OR Source.TotalHours-COALESCE(BreakHour, 1)-COALESCE(TravelHour, 0) > MaxJobHourPerDay THEN MaxJobHourPerDay
                                ELSE Source.TotalHours - COALESCE(BreakHour, 1) - COALESCE(TravelHour, 0)
                    END AS decimal(4, 1))
            OR Target.projId <> Source.projId) AND Target.SyncCompleted = 0
        ) THEN
        UPDATE SET
            TotalHours = CAST(CASE 
                            WHEN Target.TotalHours > COALESCE(Source.MaxJobHourPerDay, Target.TotalHours) OR Source.TotalHours-COALESCE(BreakHour, 1)-COALESCE(TravelHour, 0) > COALESCE(Source.MaxJobHourPerDay, Source.TotalHours)  THEN MaxJobHourPerDay
                            ELSE Source.TotalHours - COALESCE(BreakHour, 1) - COALESCE(TravelHour, 0)
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
                    WHEN Source.TotalHours-COALESCE(BreakHour, 1)-COALESCE(TravelHour, 0) > COALESCE(Source.MaxJobHourPerDay, Source.TotalHours) THEN COALESCE(Source.MaxJobHourPerDay, Source.TotalHours)
                    ELSE Source.TotalHours - COALESCE(BreakHour, 1) - COALESCE(TravelHour, 0)
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

--GET TOTAL COUNT AND START AND END ID
SELECT 
    COUNT(*) AS TotalCount,
    MIN(Id) AS StartId,
    MAX(Id) AS EndId
FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
WHERE SyncCompleted = 0;




/************************************************/
--FIND DUPLICATE 

SELECT HcmWorker_PersonnelNumber, TransDate, COUNT(*)
FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
GROUP BY HcmWorker_PersonnelNumber, TransDate
HAVING COUNT(*) > 1;

SELECT A.*
FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst] A
JOIN (
    SELECT HcmWorker_PersonnelNumber, TransDate
    FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
    GROUP BY HcmWorker_PersonnelNumber, TransDate
    HAVING COUNT(*) > 1
) B ON A.HcmWorker_PersonnelNumber = B.HcmWorker_PersonnelNumber AND A.TransDate = B.TransDate;

/************************************************/

 SELECT TOP (1000) [Id]
      ,[HcmWorker_PersonnelNumber]
      ,[TransDate]
      ,[projId]
      ,[TotalHours]
      ,[CategoryId]
      ,[BranchId]
      ,[DepartmentId]
      ,[UserCategoryId]
      ,[EmployeeCategoryId]
      ,[DesignationId]
      ,[SectionId]
      ,[CustomGroup3Id]
      ,[SyncCompleted]
      ,[Error]
      ,[ErrorText]
      ,[CreatedAt]
      ,[UpdatedAt]
  FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
  WHERE projId='SRU-002567-04'
  --WHERE TotalHours > 14

    Select HcmWorker_PersonnelNumber,TransDate, projId, TotalHours from [TNA_PROXY].[dbo].[Px_ERPTransactionMst] 
    where [TNA_PROXY].[dbo].[Px_ERPTransactionMst].TotalHours < [TNA_PROXY].[dbo].[Px_JPCJobMst].MaxJobHourPerDay 
    AND ('${EmployeeId}' IS NULL OR '${EmployeeId}'='' OR HcmWorker_PersonnelNumber = '${EmployeeId}') AND
    ('${JobCode}' IS NULL OR '${JobCode}'='' OR projId ='${JobCode}') AND
    ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
    ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
    ('${EmployeeCategoryId}' IS NULL OR '${EmployeeCategoryId}'='' OR EmployeeCategoryId = ${EmployeeCategoryId?EmployeeCategoryId:0}) AND
    ('${DesignationId}' IS NULL OR '${DesignationId}'='' OR DesignationId = ${DesignationId?DesignationId:0}) AND
    ('${SectionId}' IS NULL OR '${SectionId}'='' OR SectionId = ${SectionId?SectionId:0}) AND
    (('${FromDate}'='' AND '${ToDate}'='') OR TransDate BETWEEN '${FromDate}' AND '${ToDate}')




DELETE FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst] WHERE SyncCompleted=0 AND TotalHours<1
SELECT * FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst] WHERE SyncCompleted=0 AND TotalHours<1



--Moving Sunday TotalHours from Sunday to Prevoius zero TotalHours Weekday

-- Step 1: Identify Sundays within the specified date range
WITH Sundays AS (
    SELECT 
        Id,
        HcmWorker_PersonnelNumber,
        TransDate,
        projId,
        TotalHours,
        DATEPART(dw, TransDate) AS DayOfWeek
    FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
    WHERE DATEPART(dw, TransDate) = 1 -- Sunday
      AND TransDate BETWEEN '2024-05-26' AND '2024-06-25'
),
-- Step 2: Generate the previous 6 dates for each Sunday
PreviousDays AS (
    SELECT 
        s.Id AS SundayId,
        s.HcmWorker_PersonnelNumber,
        s.TransDate AS SundayTransDate,
        DATEADD(day, -1, s.TransDate) AS Saturday,
        DATEADD(day, -2, s.TransDate) AS Friday,
        DATEADD(day, -3, s.TransDate) AS Thursday,
        DATEADD(day, -4, s.TransDate) AS Wednesday,
        DATEADD(day, -5, s.TransDate) AS Tuesday,
        DATEADD(day, -6, s.TransDate) AS Monday
    FROM Sundays s
),
-- Step 3: Check for missing entries for each HcmWorker_PersonnelNumber within the date range
MissingDates AS (
    SELECT
        pd.SundayId,
        pd.HcmWorker_PersonnelNumber,
        pd.SundayTransDate,
        pd.Monday AS MissingTransDate
    FROM PreviousDays pd
    LEFT JOIN [TNA_PROXY].[dbo].[Px_ERPTransactionMst] t1
        ON pd.HcmWorker_PersonnelNumber = t1.HcmWorker_PersonnelNumber
        AND pd.Monday = t1.TransDate
    WHERE t1.TransDate IS NULL
      AND pd.Monday BETWEEN '2024-05-26' AND '2024-06-25'
    UNION ALL
    SELECT
        pd.SundayId,
        pd.HcmWorker_PersonnelNumber,
        pd.SundayTransDate,
        pd.Tuesday AS MissingTransDate
    FROM PreviousDays pd
    LEFT JOIN [TNA_PROXY].[dbo].[Px_ERPTransactionMst] t2
        ON pd.HcmWorker_PersonnelNumber = t2.HcmWorker_PersonnelNumber
        AND pd.Tuesday = t2.TransDate
    WHERE t2.TransDate IS NULL
      AND pd.Tuesday BETWEEN '2024-05-26' AND '2024-06-25'
    UNION ALL
    SELECT
        pd.SundayId,
        pd.HcmWorker_PersonnelNumber,
        pd.SundayTransDate,
        pd.Wednesday AS MissingTransDate
    FROM PreviousDays pd
    LEFT JOIN [TNA_PROXY].[dbo].[Px_ERPTransactionMst] t3
        ON pd.HcmWorker_PersonnelNumber = t3.HcmWorker_PersonnelNumber
        AND pd.Wednesday = t3.TransDate
    WHERE t3.TransDate IS NULL
      AND pd.Wednesday BETWEEN '2024-05-26' AND '2024-06-25'
    UNION ALL
    SELECT
        pd.SundayId,
        pd.HcmWorker_PersonnelNumber,
        pd.SundayTransDate,
        pd.Thursday AS MissingTransDate
    FROM PreviousDays pd
    LEFT JOIN [TNA_PROXY].[dbo].[Px_ERPTransactionMst] t4
        ON pd.HcmWorker_PersonnelNumber = t4.HcmWorker_PersonnelNumber
        AND pd.Thursday = t4.TransDate
    WHERE t4.TransDate IS NULL
      AND pd.Thursday BETWEEN '2024-05-26' AND '2024-06-25'
    UNION ALL
    SELECT
        pd.SundayId,
        pd.HcmWorker_PersonnelNumber,
        pd.SundayTransDate,
        pd.Friday AS MissingTransDate
    FROM PreviousDays pd
    LEFT JOIN [TNA_PROXY].[dbo].[Px_ERPTransactionMst] t5
        ON pd.HcmWorker_PersonnelNumber = t5.HcmWorker_PersonnelNumber
        AND pd.Friday = t5.TransDate
    WHERE t5.TransDate IS NULL
      AND pd.Friday BETWEEN '2024-05-26' AND '2024-06-25'
    UNION ALL
    SELECT
        pd.SundayId,
        pd.HcmWorker_PersonnelNumber,
        pd.SundayTransDate,
        pd.Saturday AS MissingTransDate
    FROM PreviousDays pd
    LEFT JOIN [TNA_PROXY].[dbo].[Px_ERPTransactionMst] t6
        ON pd.HcmWorker_PersonnelNumber = t6.HcmWorker_PersonnelNumber
        AND pd.Saturday = t6.TransDate
    WHERE t6.TransDate IS NULL
      AND pd.Saturday BETWEEN '2024-05-26' AND '2024-06-25'
),
-- Step 4: Identify the first missing date for each Sunday
FirstMissingDate AS (
    SELECT 
        SundayId,
        MIN(MissingTransDate) AS MissingTransDate
    FROM MissingDates
    GROUP BY SundayId
)
-- Step 5: Update the Sunday entry with the first missing date
UPDATE t
SET t.TransDate = fmd.MissingTransDate
FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst] t
INNER JOIN FirstMissingDate fmd
    ON t.Id = fmd.SundayId;


----------------------------------------------
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
    AND  [PDate] BETWEEN '2024-05-26' AND '2024-06-25'
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
        pd. [UserID],
		pd.[JobCode],
        pd.[TotalJobTime],
        pd.SundayTransDate,
        pd.Monday AS MissingTransDate
    FROM PreviousDays pd
    LEFT JOIN [TNA_PROXY].[dbo].[Px_TimesheetMst] t1
        ON pd.[UserID] = t1.[UserID]
        AND pd.Monday = t1.[PDate]
    WHERE t1.[TotalJobTime]=0
	AND pd.Monday BETWEEN '2024-05-26' AND '2024-06-25'
    
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
    WHERE t2.[TotalJobTime]=0
	AND pd.Tuesday BETWEEN '2024-05-26' AND '2024-06-25'
    
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
    WHERE t3.[TotalJobTime]=0
	AND pd.Wednesday BETWEEN '2024-05-26' AND '2024-06-25'
    
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
    WHERE t4.[TotalJobTime]=0
	AND pd.Thursday BETWEEN '2024-05-26' AND '2024-06-25'
    
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
    WHERE t5.[TotalJobTime]=0
	AND  pd.Friday BETWEEN '2024-05-26' AND '2024-06-25'
    
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
    WHERE t6.[TotalJobTime]=0
	AND pd.Saturday BETWEEN '2024-05-26' AND '2024-06-25'
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

BEGIN TRANSACTION;

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

COMMIT TRANSACTION;

-- Drop the temporary table
DROP TABLE #FirstMissingDate;


