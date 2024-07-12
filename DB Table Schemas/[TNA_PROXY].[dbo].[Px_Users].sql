--CREATE TABLE [TNA_PROXY].[dbo].[Px_Users]
CREATE TABLE [TNA_PROXY].[dbo].[Px_Users] (
    id INT IDENTITY(1,1) PRIMARY KEY,
    EmployeeId NVARCHAR(255) NOT NULL,
    Email NVARCHAR(255) NOT NULL,
    Password NVARCHAR(255) NOT NULL,
    Department NVARCHAR(255) NOT NULL,
    CreatedAt DATETIME DEFAULT GETDATE(),
    IsValid Bit DEFAULT 0,
    IsAdmin Bit DEFAULT 0,
    IsCoordinator Bit DEFAULT 0,
    IsSuperAdmin Bit DEFAULT 0,
);


SELECT TOP (1000) [FromDate]
      ,[ToDate]
      ,[UserID]
      ,[JobCode]
      ,[ESSAssignment]
      ,[PriorityNo]
  FROM [COSEC].[dbo].[Mx_JPCUserJobTrn]





-- Declare variables for new values
DECLARE @newFromDate DATE = '2024-07-01';
DECLARE @newToDate DATE = '2024-07-05';
DECLARE @newUserID INT = 1;
DECLARE @newJobCode VARCHAR(50) = 'Job1';

-- Declare variable to hold the highest existing PriorityNo for the given UserID
DECLARE @existHighestPriorityNo INT;

-- Get the highest existing PriorityNo for the given UserID
SELECT @existHighestPriorityNo = ISNULL(MAX(PriorityNo), 0)
FROM [COSEC].[dbo].[Mx_JPCUserJobTrn]
WHERE [UserID] = @newUserID;

-- Check if the row exists
IF EXISTS (
    SELECT 1
    FROM [COSEC].[dbo].[Mx_JPCUserJobTrn]
    WHERE [FromDate] = @newFromDate
      AND [ToDate] = @newToDate
      AND [UserID] = @newUserID
      AND [JobCode] = @newJobCode
)
BEGIN
    -- Update the PriorityNo for the existing row to the highest existing PriorityNo + 1
    UPDATE [COSEC].[dbo].[Mx_JPCUserJobTrn]
    SET [PriorityNo] = @existHighestPriorityNo + 1
    WHERE [FromDate] = @newFromDate
      AND [ToDate] = @newToDate
      AND [UserID] = @newUserID
      AND [JobCode] = @newJobCode;

    -- Shift PriorityNo for all other rows of the same UserID
    WITH cte AS (
        SELECT [PriorityNo], 
               ROW_NUMBER() OVER (ORDER BY [PriorityNo]) AS newPriorityNo
        FROM [COSEC].[dbo].[Mx_JPCUserJobTrn]
        WHERE [UserID] = @newUserID
          AND NOT ([FromDate] = @newFromDate AND [ToDate] = @newToDate AND [UserID] = @newUserID AND [JobCode] = @newJobCode)
    )
    UPDATE cte
    SET [PriorityNo] = newPriorityNo;

    -- Correct the PriorityNo for the originally updated row
    UPDATE [COSEC].[dbo].[Mx_JPCUserJobTrn]
    SET [PriorityNo] = @existHighestPriorityNo
    WHERE [FromDate] = @newFromDate
      AND [ToDate] = @newToDate
      AND [UserID] = @newUserID
      AND [JobCode] = @newJobCode;
END
ELSE
BEGIN
    -- Insert a new row with the new PriorityNo
    INSERT INTO [COSEC].[dbo].[Mx_JPCUserJobTrn] ([FromDate], [ToDate], [UserID], [JobCode], [ESSAssignment], [PriorityNo])
    VALUES (@newFromDate, @newToDate, @newUserID, @newJobCode, 1, @existHighestPriorityNo + 1);
END




    '
