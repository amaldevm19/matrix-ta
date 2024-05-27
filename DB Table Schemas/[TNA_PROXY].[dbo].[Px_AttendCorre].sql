CREATE TABLE [TNA_PROXY].[dbo].[Px_AttendCorre](
	Id INT IDENTITY(1,1) PRIMARY KEY,
    UserID NVARCHAR(30) NOT NULL,
    AttendanceDate DATETIME,
    InTime NVARCHAR(30),
    OutTime NVARCHAR(30),
    Status NVARCHAR(30),
    Message NVARCHAR(1000),
    CreatedAt DATETIME DEFAULT GETDATE() NOT NULL,
    CreatedBy NVARCHAR(30),
    DepartmentId NVARCHAR(30),
)


SELECT TOP (1000) 
[Id]
,[UserID]
,[AttendanceDate]
,[InTime]
,[OutTime]
,[Status]
,[Message]
,[CreatedAt]
,[CreatedBy]
,[DepartmentId]
FROM [TNA_PROXY].[dbo].[Px_AttendCorre]