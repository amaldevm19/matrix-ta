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





-- Step 1: Fetch relevant data for the given week
WITH WeeklyData AS (
    SELECT 
        TSM.UserID AS HcmWorker_PersonnelNumber,
        PDate,
        DATENAME(WEEKDAY, PDate) AS DayName,
        CASE 
            WHEN TotalJobTime % 60 >= 15 AND TotalJobTime % 60 < 45 THEN CAST(FLOOR(TotalJobTime / 60) + 0.5 AS DECIMAL(4,1))
            WHEN TotalJobTime % 60 >= 45 THEN CAST(FLOOR(TotalJobTime / 60) + 1 AS DECIMAL(4,1))
            ELSE CAST(FLOOR(TotalJobTime / 60) AS DECIMAL(4,1))
        END AS TotalHours,
        TSM.JobCode,
        BranchId,
        TSM.DepartmentId,
        TSM.UserCategoryId,
        EmployeeCategoryId,
        DesignationId,
        CustomGroup3Id,
        SectionId,
        'Timesheet' AS CategoryId,
        JPC.MaxJobHourPerDay,
        JPC.BreakHour,
        JPC.TravelHour,
        UHD.HoursPerDay AS DeductionHours
    FROM [TNA_PROXY].[dbo].[Px_TimesheetMst] AS TSM
    LEFT JOIN [TNA_PROXY].[dbo].[Px_JPCJobMst] AS JPC ON TSM.JobCode = JPC.JobCode
    LEFT JOIN [TNA_PROXY].[dbo].[Px_UserHourDeduTrn] AS UHD ON TSM.UserID = UHD.UserID AND TSM.PDate BETWEEN UHD.FromDate AND UHD.ToDate
    WHERE PDate BETWEEN '${FromDate}' AND '${ToDate}'
    AND TSM.UserID IS NOT NULL AND TSM.UserID <> ''
    AND TSM.JobCode IS NOT NULL AND TSM.JobCode <> ''
    AND BranchId = 1
    AND ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR TSM.DepartmentId = '${DepartmentId}')
    AND ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR TSM.UserCategoryId = '${UserCategoryId}')
),
-- Step 2: Identify users with zero TotalHours on weekdays and non-zero TotalHours on Sunday
ZeroHoursWeekdays AS (
    SELECT 
        HcmWorker_PersonnelNumber,
        PDate AS WeekdayDate,
        DayName,
        TotalHours,
        ROW_NUMBER() OVER (PARTITION BY HcmWorker_PersonnelNumber ORDER BY PDate) AS WeekdayRank
    FROM WeeklyData
    WHERE DayName IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')
    AND TotalHours = 0
),
NonZeroHoursSunday AS (
    SELECT 
        HcmWorker_PersonnelNumber,
        PDate AS SundayDate,
        TotalHours AS SundayHours
    FROM WeeklyData
    WHERE DayName = 'Sunday'
    AND TotalHours > 0
),

-- Step 3: Join the zero-hour weekdays with the non-zero-hour Sundays within the same week
EarliestZeroHoursWeekday AS (
    SELECT 
        Z.HcmWorker_PersonnelNumber,
        Z.WeekdayDate,
        Z.DayName AS Weekday,
        Z.TotalHours AS WeekdayHours,
        S.SundayDate,
        S.SundayHours,
        ROW_NUMBER() OVER (PARTITION BY Z.HcmWorker_PersonnelNumber ORDER BY Z.WeekdayRank) AS PriorityRank
    FROM ZeroHoursWeekdays Z
    JOIN NonZeroHoursSunday S
    ON Z.HcmWorker_PersonnelNumber = S.HcmWorker_PersonnelNumber
    AND DATEDIFF(DAY, Z.WeekdayDate, S.SundayDate) BETWEEN 1 AND 6
)

-- Step 4: Transform the data to move Sunday TotalHours to a zero-hours weekday
TransformedData AS (
    SELECT 
        W.HcmWorker_PersonnelNumber,
        W.PDate,
        CASE
            WHEN W.PDate = ES.WeekdayDate THEN  ES.WeekdayHours
            WHEN W.PDate = ES.SundayDate THEN 0
            ELSE W.TotalHours
        END AS TotalHours,
        W.JobCode,
        W.BranchId,
        W.DepartmentId,
        W.UserCategoryId,
        W.EmployeeCategoryId,
        W.DesignationId,
        W.CustomGroup3Id,
        W.SectionId,
        W.CategoryId,
        W.MaxJobHourPerDay,
        W.BreakHour,
        W.TravelHour,
        W.DeductionHours
    FROM WeeklyData W
    LEFT JOIN EarliestZeroHoursWeekday ES
    ON W.HcmWorker_PersonnelNumber = ES.HcmWorker_PersonnelNumber
    AND W.PDate = ES.WeekdayDate OR W.PDate = ES.SundayDate 
    
),
-- Step 5: Run the MERGE statement using the transformed data
MERGE INTO [TNA_PROXY].[dbo].[Px_ERPTransactionMst] AS Target
USING (
    SELECT
        HcmWorker_PersonnelNumber,
        PDate AS TransDate,
        JobCode AS projId,
        TotalHours,
        BranchId,
        DepartmentId,
        UserCategoryId,
        EmployeeCategoryId,
        DesignationId,
        CustomGroup3Id,
        SectionId,
        CategoryId,
        MaxJobHourPerDay,
        BreakHour,
        TravelHour,
        DeductionHours
    FROM TransformedData
) AS Source
ON Target.HcmWorker_PersonnelNumber = CONCAT(
    LEFT(Source.HcmWorker_PersonnelNumber, PATINDEX('%[0-9]%', Source.HcmWorker_PersonnelNumber) - 1),
    '-',
    SUBSTRING(Source.HcmWorker_PersonnelNumber, PATINDEX('%[0-9]%', Source.HcmWorker_PersonnelNumber), LEN(Source.HcmWorker_PersonnelNumber))
)
AND Target.TransDate = Source.TransDate
WHEN MATCHED AND Target.SyncCompleted=0 AND Target.readForERP=0 AND (
    (CAST(Target.TotalHours AS decimal(4, 1)) <> 
        CAST( 
            CASE  
                WHEN Source.TotalHours <= CAST( 8 AS DECIMAL(4,1)) AND Source.TotalHours > 0 THEN 8   
                WHEN Target.TotalHours > MaxJobHourPerDay 
                    OR Source.TotalHours - COALESCE(BreakHour, 1) - COALESCE(TravelHour, 0)-COALESCE(DeductionHours, 0) > MaxJobHourPerDay THEN MaxJobHourPerDay
                ELSE Source.TotalHours - COALESCE(BreakHour, 1) - COALESCE(TravelHour, 0) - COALESCE(DeductionHours, 0)
            END AS decimal(4, 1))
    OR Target.projId <> Source.projId) 
) THEN
    UPDATE SET
        TotalHours = CAST(
            CASE 
                WHEN Source.TotalHours <= CAST( 8 AS DECIMAL(4,1)) AND Source.TotalHours > 0 THEN 8 
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
            WHEN Source.TotalHours <= CAST( 8 AS DECIMAL(4,1)) AND Source.TotalHours > 0 THEN 8 
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





---------------------------------------------------

-- Step 1: Fetch relevant data for the given week
WITH WeeklyData AS (
    SELECT 
        TSM.UserID AS HcmWorker_PersonnelNumber,
        PDate,
        DATENAME(WEEKDAY, PDate) AS DayName,
        CASE 
            WHEN TotalJobTime % 60 >= 15 AND TotalJobTime % 60 < 45 THEN CAST(FLOOR(TotalJobTime / 60) + 0.5 AS DECIMAL(4,1))
            WHEN TotalJobTime % 60 >= 45 THEN CAST(FLOOR(TotalJobTime / 60) + 1 AS DECIMAL(4,1))
            ELSE CAST(FLOOR(TotalJobTime / 60) AS DECIMAL(4,1))
        END AS TotalHours,
        TSM.JobCode,
        BranchId,
        TSM.DepartmentId,
        TSM.UserCategoryId,
        EmployeeCategoryId,
        DesignationId,
        CustomGroup3Id,
        SectionId
    FROM [TNA_PROXY].[dbo].[Px_TimesheetMst] AS TSM
    LEFT JOIN [TNA_PROXY].[dbo].[Px_JPCJobMst] AS JPC ON TSM.JobCode = JPC.JobCode
    LEFT JOIN [TNA_PROXY].[dbo].[Px_UserHourDeduTrn] AS UHD ON TSM.UserID = UHD.UserID AND TSM.PDate BETWEEN UHD.FromDate AND UHD.ToDate
    WHERE PDate BETWEEN '2024-05-26' AND '2024-06-13'
    AND TSM.UserID IS NOT NULL AND TSM.UserID <> ''
    AND TSM.JobCode IS NOT NULL AND TSM.JobCode <> ''
    AND BranchId = 1
    --AND ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR TSM.DepartmentId = '${DepartmentId}')
    --AND ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR TSM.UserCategoryId = '${UserCategoryId}')
),
-- Step 2: Identify users with zero TotalHours on weekdays and non-zero TotalHours on Sunday
ZeroHoursWeekdays AS (
    SELECT 
        HcmWorker_PersonnelNumber,
        PDate AS WeekdayDate,
        DayName,
        TotalHours,
        ROW_NUMBER() OVER (PARTITION BY HcmWorker_PersonnelNumber ORDER BY PDate) AS WeekdayRank
    FROM WeeklyData
    WHERE DayName IN ('Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday')
    AND TotalHours = 0
),
NonZeroHoursSunday AS (
    SELECT 
        HcmWorker_PersonnelNumber,
        PDate AS SundayDate,
        TotalHours AS SundayHours
    FROM WeeklyData
    WHERE DayName = 'Sunday'
    AND TotalHours > 0
),
-- Step 3: Join the zero-hour weekdays with the non-zero-hour Sundays within the same week
EarliestZeroHoursWeekday AS (
    SELECT 
        Z.HcmWorker_PersonnelNumber,
        Z.WeekdayDate,
        Z.DayName AS Weekday,
        Z.TotalHours AS WeekdayHours,
        S.SundayDate,
        S.SundayHours,
        ROW_NUMBER() OVER (PARTITION BY Z.HcmWorker_PersonnelNumber ORDER BY Z.WeekdayRank) AS PriorityRank
    FROM ZeroHoursWeekdays Z
    JOIN NonZeroHoursSunday S
    ON Z.HcmWorker_PersonnelNumber = S.HcmWorker_PersonnelNumber
    AND DATEDIFF(DAY, Z.WeekdayDate, S.SundayDate) BETWEEN 1 AND 6
)
-- Step 4: Select the detailed report with Sunday hours moved to the earliest zero-hour weekday
SELECT 
    HcmWorker_PersonnelNumber,
    WeekdayDate,
    Weekday,
    CASE 
        WHEN PriorityRank = 1 THEN SundayHours
        ELSE WeekdayHours
    END AS TotalHours,
    SundayDate,
    SundayHours
FROM EarliestZeroHoursWeekday
WHERE PriorityRank = 1
ORDER BY HcmWorker_PersonnelNumber, WeekdayDate;

