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