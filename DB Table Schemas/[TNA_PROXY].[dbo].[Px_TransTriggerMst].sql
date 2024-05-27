--Create [TNA_PROXY].[dbo].[Px_TransTriggerMst] tbale
CREATE TABLE [TNA_PROXY].[dbo].[Px_TransTriggerMst](
    Id INT IDENTITY(1,1) PRIMARY KEY,
    DepartmentId nvarchar(20),
    UserCategoryId nvarchar(20),
    TriggerDate numeric(2,0),
    FromDate numeric(2,0),
    ToDate numeric(2,0),
    Status Bit DEFAULT 1,
    CreatedBy nvarchar(100),
    UpdatedBy nvarchar(100),
    CreatedAt DATETIME DEFAULT GETDATE() NOT NULL,
    UpdatedAt DATETIME DEFAULT GETDATE(),
)

GO

CREATE TRIGGER Px_TransTriggerMst_update_trigger
ON [TNA_PROXY].[dbo].[Px_TransTriggerMst]
AFTER UPDATE
AS
BEGIN
    UPDATE [TNA_PROXY].[dbo].[Px_TransTriggerMst]
    SET UpdatedAt = GETDATE()
    FROM [TNA_PROXY].[dbo].[Px_TransTriggerMst]
    INNER JOIN inserted ON [TNA_PROXY].[dbo].[Px_TransTriggerMst].Id = inserted.Id;
END;


--GET DATA
SELECT *
Id, Category, CategoryId, TransactionTrigger, FromDate, ToDate, HourMinute,Status,CreatedAt,CreatedBy, UpdatedAt, UpdatedBy,
FROM [TNA_PROXY].[dbo].[Px_TransTriggerMst]

--INSERT DATA
INSERT INTO [TNA_PROXY].[dbo].[Px_TransTriggerMst] (Category, CategoryId, TransactionTrigger, FromDate, ToDate, HourMinute) VALUES('User Category','2','2023-12-24 00:00:000','2023-11-24 00:00:000','2023-12-23 00:00:000','17:00')


--DELETE ROWS FROM [TNA_PROXY].[dbo].[Px_TransTriggerMst] tbale
DELETE FROM [TNA_PROXY].[dbo].[Px_TransTriggerMst]

--Reset the identity seed using DBCC CHECKIDENT:
DBCC CHECKIDENT ('[TNA_PROXY].[dbo].[Px_TransTriggerMst]', RESEED, 0);

--DELETE [TNA_PROXY].[dbo].[Px_TransTriggerMst] TABLE
DROP TABLE [TNA_PROXY].[dbo].[Px_TransTriggerMst]


--JOIN QUERY
SELECT
    tt.Id,
    dm.Name AS Department,
    cg1.Name AS UserCategory,
    tt.TriggerDate,
    tt.FromDate,
    tt.ToDate,
    tt.Status,
    tt.CreatedAt,
    tt.CreatedBy,
    tt.UpdatedAt,
    tt.UpdatedBy
FROM
    [TNA_PROXY].[dbo].[Px_TransTriggerMst] tt
JOIN
    [COSEC].[dbo].[Mx_DepartmentMst] dm ON tt.DepartmentId = dm.DPTID
JOIN
    [COSEC].[dbo].[Mx_CustomGroup1Mst] cg1 ON tt.UserCategoryId = cg1.CG1ID;



--Delete
DELETE FROM [TNA_PROXY].[dbo].[Px_TransTriggerMst]
WHERE Id = ${Id}

 UPDATE [TNA_PROXY].[dbo].[Px_TransTriggerMst] 
 SET TriggerDate='2024-04-26 14:00:00.000', FromDate='2024-03-26 00:00:00.000', ToDate='2024-04-25 00:00:00.000'