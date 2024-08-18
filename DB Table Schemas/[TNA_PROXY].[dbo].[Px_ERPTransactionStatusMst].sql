DROP TABLE [TNA_PROXY].[dbo].[Px_ERPTransactionStatusMst]

DELETE FROM [TNA_PROXY].[dbo].[Px_ERPTransactionStatusMst]
DBCC CHECKIDENT ('[TNA_PROXY].[dbo].[Px_ERPTransactionStatusMst]', RESEED, 0);

--Create  [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
CREATE TABLE [TNA_PROXY].[dbo].[Px_ERPTransactionStatusMst](
    Id INT IDENTITY(1,1) PRIMARY KEY,
    HcmWorker_PersonnelNumber NVARCHAR(30) NOT NULL,
    TransDate DATE NOT NULL,
    projId NVARCHAR(30) NOT NULL,
    TotalHours decimal(4, 1) NOT NULL,
    SyncCompleted Bit DEFAULT 0 ,
    Error Bit DEFAULT 0,
    ErrorText NVARCHAR(255),
    CreatedAt DATETIME DEFAULT GETDATE() NOT NULL,
)
