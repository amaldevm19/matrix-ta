--CREATE TABLE [TNA_PROXY].[dbo].[Px_Users]
CREATE TABLE [TNA_PROXY].[dbo].[Px_MiddlewareHistory] (
    id INT IDENTITY(1,1) PRIMARY KEY,
    EventCreatedAt DATETIME DEFAULT GETDATE(),
    EventType NVARCHAR(30) NOT NULL, -- Error, Warning, Information
    EventCategory NVARCHAR(30) NOT NULL, -- System, Http
    EventMethod NVARCHAR(30),
    EventStatus NVARCHAR(30),
    EventUrl NVARCHAR(1000), -- GET, POST, UPDATE, DELETE
    EventIp NVARCHAR(30), -- req.clientIp;
    EventText NVARCHAR(1000), -- Error in 
    EventCreatedBy NVARCHAR(30), -- CreatedBy
);

DROP TABLE [TNA_PROXY].[dbo].[Px_MiddlewareHistory]

DELETE FROM [TNA_PROXY].[dbo].[Px_MiddlewareHistory]
DBCC CHECKIDENT ('[TNA_PROXY].[dbo].[Px_MiddlewareHistory]', RESEED, 0);