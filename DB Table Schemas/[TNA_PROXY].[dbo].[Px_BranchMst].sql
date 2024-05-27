
CREATE TABLE Mx_BranchMst(
    BranchId int NOT NULL IDENTITY PRIMARY KEY,
    BranchName varchar(50) UNIQUE NOT NULL,
    BranchCode varchar(25) UNIQUE NOT NULL,
    TnaBranchID varchar(25),
		
);

SELECT * FROM [TNA_PROXY].[dbo].[Px_BranchMst];

DELETE FROM [TNA_PROXY].[dbo].[Px_BranchMst];


DROP TABLE [TNA_PROXY].[dbo].[Px_BranchMst];