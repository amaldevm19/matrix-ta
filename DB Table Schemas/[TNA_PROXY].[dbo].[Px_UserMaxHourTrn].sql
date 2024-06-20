CREATE TABLE [TNA_PROXY].[dbo].[Px_UserMaxHourTrn] (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserID NVARCHAR(30) UNIQUE,
    FromDate DATETIME,
    ToDate DATETIME,
    MaxWorkHoursPerDay DECIMAL(4,1),
    Remarks NVARCHAR(100),
    DepartmentId NVARCHAR(30),
    CreatedAt DATETIME DEFAULT GETDATE(),
    CreatedBy NVARCHAR(30),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    UpdatedBy NVARCHAR(30)
);
GO

CREATE TRIGGER Px_UserMaxHourTrn_update_trigger
ON [TNA_PROXY].[dbo].[Px_UserMaxHourTrn]
AFTER UPDATE
AS
BEGIN
    UPDATE [TNA_PROXY].[dbo].[Px_UserMaxHourTrn]
    SET UpdatedAt = GETDATE()
    FROM inserted
    WHERE [TNA_PROXY].[dbo].[Px_UserMaxHourTrn].Id = inserted.Id;
END;
GO

ALTER TABLE [TNA_PROXY].[dbo].[Px_UserMaxHourTrn]
ADD UserName NVARCHAR(50);
