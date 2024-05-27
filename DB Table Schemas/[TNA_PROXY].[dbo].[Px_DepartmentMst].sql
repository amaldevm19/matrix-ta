CREATE TABLE [TNA_PROXY].[dbo].[Px_DepartmentMst](
    DepartmentId int NOT NULL IDENTITY PRIMARY KEY,
    DepartmentName varchar(50) UNIQUE NOT NULL ,
    DepartmentCode varchar(25)  UNIQUE NOT NULL,
    TnaDepartmentID varchar(25)
);

SELECT * FROM [TNA_PROXY].[dbo].[Px_DepartmentMst]
DELETE FROM [TNA_PROXY].[dbo].[Px_DepartmentMst]
DROP TABLE [TNA_PROXY].[dbo].[Px_DepartmentMst]

