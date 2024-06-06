CREATE TABLE [TNA_PROXY].[dbo].[Px_UserHourDeduTrn] (
    Id INT IDENTITY(1,1) PRIMARY KEY,
    UserID NVARCHAR(30) UNIQUE,
    FromDate DATETIME,
    ToDate DATETIME,
    HoursPerDay DECIMAL(4,1),
    Remarks NVARCHAR(100),
    DepartmentId NVARCHAR(30),
    CreatedAt DATETIME DEFAULT GETDATE(),
    CreatedBy NVARCHAR(30),
    UpdatedAt DATETIME DEFAULT GETDATE(),
    UpdatedBy NVARCHAR(30)
);
GO

CREATE TRIGGER Px_UserHourDeduTrn_update_trigger
ON [TNA_PROXY].[dbo].[Px_UserHourDeduTrn]
AFTER UPDATE
AS
BEGIN
    UPDATE [TNA_PROXY].[dbo].[Px_UserHourDeduTrn]
    SET UpdatedAt = GETDATE()
    FROM inserted
    WHERE [TNA_PROXY].[dbo].[Px_UserHourDeduTrn].Id = inserted.Id;
END;
GO
