DROP TABLE [TNA_PROXY].[dbo].[Px_JPCJobMst]

--CREATE TANLE [TNA_PROXY].[dbo].[Px_JPCJobMst] 
CREATE TABLE [TNA_PROXY].[dbo].[Px_JPCJobMst] (
    JobID INT IDENTITY(1,1) PRIMARY KEY,
    JobCode NVARCHAR(30) UNIQUE,
	JobName NVARCHAR(30),
    FromDate DATETIME,
	ToDate DATETIME,
	MaxJobHourPerDay DECIMAL(4,1),
	DepartmentId NVARCHAR(30),
    CreatedAt DATETIME DEFAULT GETDATE(),
	CreatedBy NVARCHAR(30),
    UpdatedAt DATETIME DEFAULT GETDATE(),
	UpdatedBy NVARCHAR(30)
);
GO
CREATE TRIGGER Px_JPCJobMst_update_trigger
ON [TNA_PROXY].[dbo].[Px_JPCJobMst]
AFTER UPDATE
AS
BEGIN
    UPDATE [TNA_PROXY].[dbo].[Px_JPCJobMst]
    SET UpdatedAt = GETDATE()
    FROM [TNA_PROXY].[dbo].[Px_JPCJobMst]
    INNER JOIN inserted ON [TNA_PROXY].[dbo].[Px_JPCJobMst].JobID = inserted.JobID;
END;

--Update [TNA_PROXY].[dbo].[Px_JPCJobMst] to handle new requirements
ALTER TABLE [TNA_PROXY].[dbo].[Px_JPCJobMst]
ADD TravelHour DECIMAL(4,1);

ALTER TABLE [TNA_PROXY].[dbo].[Px_JPCJobMst] ADD ProjectType NVARCHAR(30) DEFAULT 'Camp', BreakHour DECIMAL(4,1) DEFAULT 1.0;
UPDATE [TNA_PROXY].[dbo].[Px_JPCJobMst] SET ProjectType = 'Camp', BreakHour = 1.0 WHERE ProjectType IS NULL OR BreakHour IS NULL;

UPDATE [TNA_PROXY].[dbo].[Px_JPCJobMst] SET TravelHour=1.0;



-- SELECT FROM [TNA_PROXY].[dbo].[Px_JPCJobMst]
SELECT *
FROM (
    SELECT
        JobID, JobCode, JobName, MaxJobHourPerDay, Department, UpdatedBy, UpdatedAt,
        ROW_NUMBER() OVER (ORDER BY JobID) AS RowNum
    FROM [TNA_PROXY].[dbo].[Px_JPCJobMst]
    WHERE JobCode LIKE 'SRU-0022'
        OR Department LIKE ''
        OR UpdatedBy LIKE ''
) AS Subquery
WHERE RowNum BETWEEN 1 AND 16

--COPY DATA FROM [COSEC].[dbo].[Mx_JPCJobMst] TO  [TNA_PROXY].[dbo].[Px_JPCJobMst]
INSERT INTO [TNA_PROXY].[dbo].[Px_JPCJobMst](JobCode, JobName, FromDate, ToDate, MaxJobHourPerDay)
SELECT JobCode, Name, FromDate, ToDate, CAST(24.0 AS DECIMAL(4,1))
FROM [COSEC].[dbo].[Mx_JPCJobMst];


SELECT *
  FROM [TNA_PROXY].[dbo].[Px_JPCJobMst]
 WHERE JobCode='SRU-002567-04'





  UPDATE [TNA_PROXY].[dbo].[Px_JPCJobMst] SET [MaxJobHourPerDay]=11 WHERE JobCode='SRU-002567-04'
