
-- Timesheet query 03/06/2024
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
                MxUser.BRCID,
                MxUser.DPTID,
                MxUser.CG1ID,
                MxUser.CTGID,
                MxUser.DSGID,
                MxUser.SECID,
                MxUser.CG3ID,
                JTS.JobCode,
                COALESCE(SUM(JTS.JobTime), 0) AS TotalJobTime
            FROM
                DateRangeCTE
            CROSS JOIN (
                SELECT UserID, BRCID, DPTID, CG1ID, CTGID,DSGID,SECID,CG3ID
                FROM [COSEC].[dbo].[Mx_UserMst]
                WHERE BRCID = '1' AND UserIDEnbl = '1' 
            ) AS MxUser
            LEFT JOIN
                [COSEC].[dbo].[Mx_JPCTimeSheet] JTS ON DateRangeCTE.PDate = JTS.PDate AND MxUser.UserID = JTS.UserID
            GROUP BY
                DateRangeCTE.PDate,
                MxUser.UserID,
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
            INSERT (PDate, UserID, BranchId, DepartmentId, UserCategoryId, EmployeeCategoryId, DesignationId, SectionId,CustomGroup3Id, JobCode, TotalJobTime)
            VALUES (Source.PDate, Source.UserID, Source.BRCID, Source.DPTID, Source.CG1ID, Source.CTGID, Source.DSGID, Source.SECID,Source.CG3ID, Source.JobCode, Source.TotalJobTime);
        IF OBJECT_ID('tempdb..#TempTimesheetTable', 'U') IS NOT NULL DROP TABLE #TempTimesheetTable;
        IF OBJECT_ID('tempdb..#TempTimesheetWithoutDuplicates', 'U') IS NOT NULL DROP TABLE #TempTimesheetWithoutDuplicates;
        SELECT DISTINCT
            a.PDate,
            a.UserID,
            a.BranchId,
            a.DepartmentId,
            a.UserCategoryId,
            a.EmployeeCategoryId,
            a.DesignationId,
            a.SectionId,
            a.CustomGroup3Id,
            COALESCE(a.JobCode, b.JobCode) AS FinalJobCode,
            SUM(a.TotalJobTime) OVER (PARTITION BY a.PDate, a.UserID) AS SumTotalJobTime
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
                BranchId,
                DepartmentId,
                UserCategoryId,
                EmployeeCategoryId,
                DesignationId,
                SectionId,
                CustomGroup3Id,
                FinalJobCode,
                SumTotalJobTime,
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
        BranchId,
        DepartmentId,
        UserCategoryId,
        EmployeeCategoryId,
        DesignationId, 
        SectionId,
        CustomGroup3Id,
        JobCode, 
        TotalJobTime
        )
        SELECT  PDate, 
                UserID,
                BranchId,
                DepartmentId,
                UserCategoryId,
                EmployeeCategoryId,
                DesignationId,
                SectionId,
                CustomGroup3Id, 
                FinalJobCode, 
                SumTotalJobTime
        FROM #TempTimesheetWithoutDuplicates;
      `);




--Create [TNA_PROXY].[dbo].[Px_TimesheetMst] tbale
CREATE TABLE [TNA_PROXY].[dbo].[Px_TimesheetMst](
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserID nvarchar(20),
    PDate datetime,
    JobCode nvarchar(20),
    TotalJobTime numeric(4,0),
    BranchId numeric(6,0),
    DepartmentId numeric(6,0),
    UserCategoryId numeric(6,0),
    EmployeeCategoryId numeric(6,0),
    DesignationId  numeric(6,0),
    SectionId  numeric(6,0),
    CustomGroup3Id  numeric(6,0),
    CreatedAt DATETIME DEFAULT GETDATE() NOT NULL,
    UpdatedAt DATETIME DEFAULT GETDATE(),
)

GO

CREATE TRIGGER Px_TimesheetMst_Update_Trigger
ON [TNA_PROXY].[dbo].[Px_TimesheetMst]
AFTER UPDATE
AS
BEGIN
    UPDATE [TNA_PROXY].[dbo].[Px_TimesheetMst]
    SET UpdatedAt = GETDATE()
    FROM [TNA_PROXY].[dbo].[Px_TimesheetMst]
    INNER JOIN inserted ON [TNA_PROXY].[dbo].[Px_TimesheetMst].Id = inserted.Id;
END;

ALTER TABLE [TNA_PROXY].[dbo].[Px_TimesheetMst]
ADD LeaveID VARCHAR(50);

UPDATE [TNA_PROXY].[dbo].[Px_TimesheetMst] SET TotalJobTime=1000 WHERE UserID='SRU000778'

--READ FROM Px_TimesheetMst
SELECT [Id]
      ,[UserID]
      ,[PDate]
      ,[JobCode]
      ,[TotalJobTime]
      ,[BranchId]
      ,[DepartmentId]
      ,[UserCategoryId]
      ,[CreatedAt]
      ,[UpdatedAt]
  FROM [TNA_PROXY].[dbo].[Px_TimesheetMst]
  WHERE UserID = 'SRU011980'
  ORDER BY PDate DESC


/*****************************************************/
/*****************************************************/
---CREATE STORED PROCEDURE
USE [TNA_PROXY]
GO
CREATE PROCEDURE update_px_timesheetmst
    @fromDate DATETIME,
    @toDate DATETIME
AS
BEGIN
    -- Delete all records from Px_TimesheetMst
    DELETE FROM [TNA_PROXY].[dbo].[Px_TimesheetMst];

    -- Reset identity seed to 0
    DBCC CHECKIDENT ('[TNA_PROXY].[dbo].[Px_TimesheetMst]', RESEED, 0);

    -- Common Table Expression (CTE) for generating date range
    WITH DateRangeCTE AS (
        SELECT CAST(@fromDate AS DATETIME) AS PDate
        UNION ALL
        SELECT DATEADD(DAY, 1, PDate)
        FROM DateRangeCTE
        WHERE PDate < @toDate
    )
    
    -- Merge operation to update or insert records in Px_TimesheetMst
    MERGE INTO [TNA_PROXY].[dbo].[Px_TimesheetMst] AS Target
    USING (
        SELECT
            DateRangeCTE.PDate,
            MxUser.UserID,
            MxUser.BRCID,
            MxUser.DPTID,
            MxUser.CG1ID,
            MxUser.CTGID,
            MxUser.DSGID,
            MxUser.SECID,
            MxUser.CG3ID,
            JTS.JobCode,
            COALESCE(SUM(JTS.JobTime), 0) AS TotalJobTime
        FROM
            DateRangeCTE
        CROSS JOIN (
            SELECT UserID, BRCID, DPTID, CG1ID, CTGID,DSGID,SECID,CG3ID
            FROM [COSEC].[dbo].[Mx_UserMst]
            WHERE BRCID = '1' AND UserIDEnbl = '1' 
        ) AS MxUser
        LEFT JOIN
            [COSEC].[dbo].[Mx_JPCTimeSheet] JTS ON DateRangeCTE.PDate = JTS.PDate AND MxUser.UserID = JTS.UserID
        GROUP BY
            DateRangeCTE.PDate,
            MxUser.UserID,
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
        INSERT (PDate, UserID, BranchId, DepartmentId, UserCategoryId, EmployeeCategoryId, DesignationId, SectionId,CustomGroup3Id, JobCode, TotalJobTime)
        VALUES (Source.PDate, Source.UserID, Source.BRCID, Source.DPTID, Source.CG1ID, Source.CTGID, Source.DSGID, Source.SECID,Source.CG3ID, Source.JobCode, Source.TotalJobTime);

    -- Drop temporary tables if they exist
    IF OBJECT_ID('tempdb..#TempTimesheetTable', 'U') IS NOT NULL DROP TABLE #TempTimesheetTable;
    IF OBJECT_ID('tempdb..#TempTimesheetWithoutDuplicates', 'U') IS NOT NULL DROP TABLE #TempTimesheetWithoutDuplicates;

    -- Select distinct records into temporary table Px_TempTimesheet
    SELECT DISTINCT
        a.PDate,
        a.UserID,
        a.BranchId,
        a.DepartmentId,
        a.UserCategoryId,
        a.EmployeeCategoryId,
        a.DesignationId,
        a.SectionId,
        a.CustomGroup3Id,
        COALESCE(a.JobCode, b.JobCode) AS FinalJobCode,
        SUM(a.TotalJobTime) OVER (PARTITION BY a.PDate, a.UserID) AS SumTotalJobTime
    INTO #TempTimesheetTable
    FROM [TNA_PROXY].[dbo].[Px_TimesheetMst] a
    JOIN (
        SELECT PDate, UserID, MAX(JobCode) AS JobCode
        FROM [TNA_PROXY].[dbo].[Px_TimesheetMst]
        GROUP BY PDate, UserID
        HAVING COUNT(*) > 1
    ) b ON a.PDate = b.PDate AND a.UserID = b.UserID
    ORDER BY a.UserID;

    -- Common Table Expression (CTE) for selecting records without duplicates
    WITH CTE AS (
        SELECT
            PDate,
            UserID,
            BranchId,
            DepartmentId,
            UserCategoryId,
            EmployeeCategoryId,
            DesignationId,
            SectionId,
            CustomGroup3Id,
            FinalJobCode,
            SumTotalJobTime,
            ROW_NUMBER() OVER (PARTITION BY PDate, UserID ORDER BY FinalJobCode DESC) AS RowNum
        FROM #TempTimesheetTable
        WHERE FinalJobCode IS NOT NULL OR NOT FinalJobCode=''
    )
    
    -- Select records without duplicates into temporary table Px_TempTimesheetWithoutDuplicates
    SELECT *
    INTO #TempTimesheetWithoutDuplicates
    FROM CTE
    WHERE RowNum = 1;

    -- Delete records from Px_TimesheetMst based on duplicates
    DELETE FROM [TNA_PROXY].[dbo].[Px_TimesheetMst]
    WHERE EXISTS (
        SELECT 1
        FROM #TempTimesheetWithoutDuplicates
        WHERE [TNA_PROXY].[dbo].[Px_TimesheetMst].PDate = #TempTimesheetWithoutDuplicates.PDate
        AND [TNA_PROXY].[dbo].[Px_TimesheetMst].UserID = #TempTimesheetWithoutDuplicates.UserID
    );

    -- Insert records into Px_TimesheetMst from temporary table Px_TempTimesheetWithoutDuplicates
    INSERT INTO [TNA_PROXY].[dbo].[Px_TimesheetMst] 
    (PDate, 
    UserID,
    BranchId,
    DepartmentId,
    UserCategoryId,
    EmployeeCategoryId,
    DesignationId, 
    SectionId,
    CustomGroup3Id,
    JobCode, 
    TotalJobTime
    )
    SELECT  PDate, 
            UserID,
            BranchId,
            DepartmentId,
            UserCategoryId,
            EmployeeCategoryId,
            DesignationId,
            SectionId,
            CustomGroup3Id, 
            FinalJobCode, 
            SumTotalJobTime
    FROM #TempTimesheetWithoutDuplicates;
END;


/*********************************************/
--GET NAMES OF ALL IDs
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
        Id, UserID, PDate, JobCode, TotalJobTime, BranchId, DepartmentId, UserCategoryId, EmployeeCategoryId, DesignationId, SectionId, CreatedAt,
        ROW_NUMBER() OVER (ORDER BY Id) AS RowNum
    FROM [TNA_PROXY].[dbo].[Px_TimesheetMst]
) AS Subquery
JOIN [COSEC].[dbo].[Mx_DepartmentMst] AS DepartmentMst ON Subquery.DepartmentId = DepartmentMst.DPTID
JOIN [COSEC].[dbo].[Mx_CustomGroup1Mst] AS CustomGroup1Mst ON Subquery.UserCategoryId = CustomGroup1Mst.CG1ID
JOIN [COSEC].[dbo].[Mx_CategoryMst] AS CategoryMst ON Subquery.EmployeeCategoryId = CategoryMst.CTGID
JOIN [COSEC].[dbo].[Mx_DesignationMst] AS DesignationMst ON Subquery.DesignationId = DesignationMst.DSGID
JOIN [COSEC].[dbo].[Mx_SectionMst] AS SectionMst ON Subquery.SectionId = SectionMst.SECID
JOIN [COSEC].[dbo].[Mx_BranchMst] AS BranchMst ON Subquery.BranchId = BranchMst.BRCID
WHERE Subquery.RowNum BETWEEN 1 AND 15;






/*************************************/
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