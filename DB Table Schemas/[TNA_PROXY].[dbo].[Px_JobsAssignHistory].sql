
CREATE TABLE [TNA_PROXY].[dbo].[Px_JobsAssignHistory](
	Id INT IDENTITY(1,1) PRIMARY KEY,
    UserID NVARCHAR(30) NOT NULL,
    JobCode NVARCHAR(30),
    FromDate DATETIME,
    ToDate DATETIME,
    Status NVARCHAR(30),
    Message NVARCHAR(1000),
    CreatedAt DATETIME DEFAULT GETDATE() NOT NULL,
    CreatedBy NVARCHAR(30),
    DepartmentId NVARCHAR(30),
)
