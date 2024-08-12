
const jobsHelper = {
    getJobListFromTnaproxy:async (db,page,pageSize,searchField)=>{
        let firstRow = ((page-1) * pageSize)+1
        let lastRow = page * pageSize;
        try {
            //let joblist = await db.query(`SELECT JobID, JobCode, JobName, MaxJobHourPerDay, DepartmentCode, UpdatedBy, UpdatedAt FROM Px_JPCJobMst`)
            //let joblist = await db.query(`SELECT JobID, JobCode, JobName, MaxJobHourPerDay, DepartmentCode, UpdatedBy, UpdatedAt FROM Px_JPCJobMst OFFSET 4 ROWS FETCH NEXT 6 ROWS ONLY`)
            let whereClause = ''
            if(searchField){
                whereClause = `WHERE JobCode LIKE '%${searchField}%' OR JobName LIKE '%${searchField}%' OR UpdatedBy LIKE '%${searchField}%'`
            }
            let joblist =await db.query( `
                SELECT *
                FROM (
                    SELECT
                        JobID, JobCode, JobName, MaxJobHourPerDay,BreakHour,TravelHour,ProjectType, DepartmentId, UpdatedBy, UpdatedAt,
                        ROW_NUMBER() OVER (ORDER BY JobID) AS RowNum
                    FROM Px_JPCJobMst
                    ${whereClause}
                ) AS Subquery
                WHERE RowNum BETWEEN ${firstRow} AND ${lastRow}
            `);
            
            let totalCount = await db.query( `SELECT COUNT(*) AS TotalRowCount FROM Px_JPCJobMst ${whereClause}`)
            let lastPage = Math.ceil(totalCount.recordset[0].TotalRowCount / pageSize)
            return {joblist,lastPage}
           
        } catch (error) {
            console.log(error)
            return null
        }
        
    },
    updateMaxJobHourPerDay:async(db,MaxJobHourPerDay,BreakHour,TravelHour,ProjectType, JobCode,JobName, UpdatedBy, Department)=>{
        try {
            if(TravelHour != 0 && (ProjectType == "Bus" || ProjectType=="Site")){
                return {status:false,message:"Travel hours cannot be assigned to Bus or Site Project types"}
            }
            let updateMaxJobHourPerDayResponse = await db.query(`
                MERGE INTO Px_JPCJobMst AS target
                USING (SELECT 
                        '${JobCode}' AS JobCode,
                        '${JobName}' AS JobName,
                        ROUND(${MaxJobHourPerDay}, 1) AS MaxJobHourPerDay,
                        ROUND(${BreakHour}, 1) AS BreakHour,
                        ROUND(${TravelHour}, 1) AS TravelHour,
                        '${ProjectType}' AS ProjectType,
                        '${UpdatedBy}' AS UpdatedBy,
                        '${Department}' AS Department
                    ) AS source
                ON (target.JobCode = source.JobCode)
                WHEN MATCHED THEN 
                    UPDATE SET 
                        target.MaxJobHourPerDay = source.MaxJobHourPerDay,
                        target.JobName = source.JobName,
                        target.BreakHour = source.BreakHour,
                        target.TravelHour = source.TravelHour,
                        target.ProjectType = source.ProjectType,
                        target.UpdatedBy = source.UpdatedBy,
                        target.DepartmentId = source.Department
                WHEN NOT MATCHED THEN
                    INSERT (JobCode,JobName, MaxJobHourPerDay, BreakHour, TravelHour, ProjectType, UpdatedBy, DepartmentId)
                    VALUES (source.JobCode,source.JobName, source.MaxJobHourPerDay, source.BreakHour, source.TravelHour, source.ProjectType, source.UpdatedBy, source.Department);
                `)
            if(updateMaxJobHourPerDayResponse.rowsAffected[0] > 0){
                return {status:true,message:`Successfully Updated Project`}
            }
            if(updateMaxJobHourPerDayResponse.rowsAffected[1] > 0){
                return {status:true,message:`Successfully Added Project`}
            }
            console.log(updateMaxJobHourPerDayResponse);
            return {status:false,message:"Failed to update project, Either Project not found or DB Error"}
        } catch (error) {
            console.log("Error in updateMaxJobHourPerDay function: ",error)
            return {status:false,message:`Failed to update project, ${error.message}`}
        }
    
    },
    addAttendanceCorrectionToDb:async(db,data)=>{
        try {
            let {UserID,AttendanceDate,InTime,OutTime,Status,Message,CreatedBy,DepartmentId} = data
            let dateParts = AttendanceDate.split('/');
            let jsDate = `${dateParts[2]}-${dateParts[1]}-${dateParts[0]} 00:00:00.000`;
            await db.query(`
            INSERT INTO [TNA_PROXY].[dbo].[Px_AttendCorre]
            (UserID,AttendanceDate,InTime,OutTime,Status,Message,CreatedBy,DepartmentId)
            VALUES('${UserID}','${jsDate}','${InTime}','${OutTime}','${Status}','${Message}','${CreatedBy}','${DepartmentId}');
            `)
            return true;
        } catch (error) {
            console.log("Error in addAttendanceCorrectionToDb function: ",error)
            return false
        }
    
    },
    assignJobsToEmployees:async ({FromDate, ToDate, JobCode, UserID,db})=>{
        try {
            let jobStatus =await db.query( `
            SELECT 1
            FROM [COSEC].[dbo].[Mx_JPCJobMst]
            WHERE JobCode = '${JobCode}' AND ToDate >= '${ToDate}' AND FromDate <= '${FromDate}'
            `);
            if(!jobStatus?.recordset){
                return {FromDate, ToDate, JobCode, UserID,Status:"Failed",Message:`JobCode:${JobCode} From:${FromDate} To:${ToDate} is not valid`};
            }
            let userStatus =await db.query( `
            SELECT 1
            FROM [COSEC].[dbo].[Mx_UserMst]
            WHERE [COSEC].[dbo].[Mx_UserMst].UserID = '${UserID}'
            `);
            if(!userStatus?.recordset){
                return {FromDate, ToDate, JobCode, UserID,Status:"Failed",Message:`Employee :${UserID} is not valid`};
            }
            /*
            let assignJob = await db.query( `
            DECLARE @DoInsert BIT = 1;
            DECLARE cursorFoundRows CURSOR FOR
            SELECT FromDate, ToDate, JobCode
            FROM [COSEC].[dbo].[Mx_JPCUserJobTrn]
            WHERE UserID = '${UserID}';
            OPEN cursorFoundRows;

            DECLARE @foundRowFromDate DATE, @foundRowToDate DATE, @foundRowJobCode NVARCHAR(30);

            FETCH NEXT FROM cursorFoundRows INTO @foundRowFromDate, @foundRowToDate, @foundRowJobCode;


            WHILE @@FETCH_STATUS = 0
            BEGIN
                --LOGIC A
                IF CAST('${FromDate}' AS DATE) = @foundRowFromDate AND CAST('${ToDate}' AS DATE) = @foundRowToDate
                    BEGIN
                        DELETE FROM [COSEC].[dbo].[Mx_JPCUserJobTrn]
                        WHERE UserID = '${UserID}' AND JobCode = @foundRowJobCode AND CAST(FromDate AS DATE) = @foundRowFromDate AND CAST (ToDate AS DATE) = @foundRowToDate;
                    END
                --LOGIC B
                ELSE IF CAST('${FromDate}' AS DATE) = @foundRowFromDate AND  CAST('${ToDate}' AS DATE) < @foundRowToDate
                        IF '${JobCode}' = @foundRowJobCode
                            BEGIN
                                SET @DoInsert = 0;
                                BREAK;
                            END
                        ELSE
                            BEGIN
                                UPDATE [COSEC].[dbo].[Mx_JPCUserJobTrn]
                                SET FromDate = DATEADD(DAY, 1, '${ToDate}')
                                WHERE UserID = '${UserID}' AND JobCode = @foundRowJobCode AND CAST(FromDate AS DATE) = @foundRowFromDate AND CAST (ToDate AS DATE) = @foundRowToDate;
                            END
                    --LOGIC B-1
                ELSE IF CAST('${FromDate}' AS DATE) = @foundRowFromDate AND  CAST('${ToDate}' AS DATE) > @foundRowToDate
                        BEGIN
                            DELETE FROM [COSEC].[dbo].[Mx_JPCUserJobTrn]
                            WHERE UserID = '${UserID}' AND JobCode = @foundRowJobCode AND CAST(FromDate AS DATE) = @foundRowFromDate AND CAST (ToDate AS DATE) = @foundRowToDate;
                        END

                    --LOGIC C
                ELSE IF CAST('${FromDate}' AS DATE) > @foundRowFromDate AND  CAST('${ToDate}' AS DATE) = @foundRowToDate
                        IF '${JobCode}' = @foundRowJobCode
                            BEGIN
                                SET @DoInsert = 0;
                                BREAK;
                            END
                        ELSE
                            BEGIN
                                UPDATE [COSEC].[dbo].[Mx_JPCUserJobTrn]
                                SET ToDate = DATEADD(DAY, -1, '${FromDate}')
                                WHERE UserID = '${UserID}' AND JobCode = @foundRowJobCode AND CAST(FromDate AS DATE) = @foundRowFromDate AND CAST (ToDate AS DATE) = @foundRowToDate;
                            END

                --LOGIC C-1
                ELSE IF CAST('${FromDate}' AS DATE) < @foundRowFromDate AND  CAST('${ToDate}' AS DATE) = @foundRowToDate
                        BEGIN
                            DELETE FROM [COSEC].[dbo].[Mx_JPCUserJobTrn]
                            WHERE UserID = '${UserID}' AND JobCode = @foundRowJobCode AND CAST(FromDate AS DATE) = @foundRowFromDate AND CAST (ToDate AS DATE) = @foundRowToDate;
                        END

                --LOGIC D
                ELSE IF CAST('${FromDate}' AS DATE) > @foundRowFromDate AND '${FromDate}' <= @foundRowToDate  AND CAST('${ToDate}' AS DATE) > @foundRowToDate
                        BEGIN
                            UPDATE [COSEC].[dbo].[Mx_JPCUserJobTrn]
                            SET ToDate = DATEADD(DAY, -1, '${FromDate}')
                            WHERE UserID = '${UserID}' AND  JobCode = @foundRowJobCode AND CAST(FromDate AS DATE) = @foundRowFromDate AND CAST (ToDate AS DATE) = @foundRowToDate;
                        END
                    --LOGIC E
                ELSE IF CAST('${FromDate}' AS DATE) < @foundRowFromDate AND CAST('${ToDate}' AS DATE) >= @foundRowFromDate AND CAST('${ToDate}' AS DATE) < @foundRowToDate
                        BEGIN
                            UPDATE [COSEC].[dbo].[Mx_JPCUserJobTrn]
                            SET FromDate = DATEADD(DAY, 1, '${ToDate}')
                            WHERE UserID = '${UserID}' AND JobCode = @foundRowJobCode AND CAST(FromDate AS DATE) = @foundRowFromDate AND CAST (ToDate AS DATE) = @foundRowToDate;
                        END

                    --LOGIC F
                ELSE IF CAST('${FromDate}' AS DATE) < @foundRowFromDate AND CAST('${ToDate}' AS DATE) > @foundRowToDate
                        BEGIN
                            DELETE FROM [COSEC].[dbo].[Mx_JPCUserJobTrn]
                            WHERE UserID = '${UserID}' AND JobCode = @foundRowJobCode AND CAST(FromDate AS DATE) = @foundRowFromDate AND CAST (ToDate AS DATE) = @foundRowToDate;
                        END
                --LOGIC G
                ELSE IF CAST('${FromDate}' AS DATE) > @foundRowFromDate AND  CAST('${ToDate}' AS DATE) < @foundRowToDate
                        IF '${JobCode}' = @foundRowJobCode
                            BEGIN
                                SET @DoInsert = 0;
                                BREAK;
                            END
                        ELSE
                            BEGIN
                                UPDATE [COSEC].[dbo].[Mx_JPCUserJobTrn]
                                SET ToDate = DATEADD(DAY, -1, '${FromDate}')
                                WHERE UserID = '${UserID}' AND JobCode = @foundRowJobCode AND CAST(FromDate AS DATE) = @foundRowFromDate AND CAST (ToDate AS DATE) = @foundRowToDate ;

                                INSERT INTO [COSEC].[dbo].[Mx_JPCUserJobTrn] (FromDate, ToDate, UserID, JobCode,ESSAssignment)
                                VALUES (DATEADD(DAY, 1, '${ToDate}'), @foundRowToDate, '${UserID}', @foundRowJobCode,1);
                            END
                FETCH NEXT FROM cursorFoundRows INTO @foundRowFromDate, @foundRowToDate, @foundRowJobCode;
            END
            CLOSE cursorFoundRows;
            DEALLOCATE cursorFoundRows;
            IF @DoInsert = 1
                BEGIN
                    INSERT INTO [COSEC].[dbo].[Mx_JPCUserJobTrn] (FromDate, ToDate, UserID, JobCode,ESSAssignment)
                    VALUES ('${FromDate}', '${ToDate}', '${UserID}', '${JobCode}', 1);
                END
            `)

            */

            let assignJob = await db.query( `
                    -- Declare variables for new values
                    DECLARE @newFromDate DATE = '${FromDate}';
                    DECLARE @newToDate DATE = '${ToDate}';
                    DECLARE @newUserID NVARCHAR(15) = '${UserID}';
                    DECLARE @newJobCode NVARCHAR(15) =  '${JobCode}';
                    -- Declare variable to hold the highest existing PriorityNo for the given UserID
                    DECLARE @existHighestPriorityNo NUMERIC(15,0);

                    -- Get the highest existing PriorityNo for the given UserID
                    SELECT @existHighestPriorityNo = ISNULL(MAX(PriorityNo), 0)
                    FROM [COSEC].[dbo].[Mx_JPCUserJobTrn]
                    WHERE [UserID] = @newUserID;

                    -- Check if the row exists
                    IF EXISTS (
                        SELECT 1
                        FROM [COSEC].[dbo].[Mx_JPCUserJobTrn]
                        WHERE [FromDate] = @newFromDate
                        AND [ToDate] = @newToDate
                        AND [UserID] = @newUserID
                        AND [JobCode] = @newJobCode
                    )
                    BEGIN
                        -- Update the PriorityNo for the existing row to the highest existing PriorityNo + 1
                        UPDATE [COSEC].[dbo].[Mx_JPCUserJobTrn]
                        SET [PriorityNo] = @existHighestPriorityNo + 1
                        WHERE [FromDate] = @newFromDate
                        AND [ToDate] = @newToDate
                        AND [UserID] = @newUserID
                        AND [JobCode] = @newJobCode;

                        -- Shift PriorityNo for all other rows of the same UserID
                        WITH cte AS (
                            SELECT [PriorityNo], 
                                ROW_NUMBER() OVER (ORDER BY [PriorityNo]) AS newPriorityNo
                            FROM [COSEC].[dbo].[Mx_JPCUserJobTrn]
                            WHERE [UserID] = @newUserID
                            AND NOT ([FromDate] = @newFromDate AND [ToDate] = @newToDate AND [UserID] = @newUserID AND [JobCode] = @newJobCode)
                        )
                        UPDATE cte
                        SET [PriorityNo] = newPriorityNo;

                        -- Correct the PriorityNo for the originally updated row
                        UPDATE [COSEC].[dbo].[Mx_JPCUserJobTrn]
                        SET [PriorityNo] = @existHighestPriorityNo
                        WHERE [FromDate] = @newFromDate
                        AND [ToDate] = @newToDate
                        AND [UserID] = @newUserID
                        AND [JobCode] = @newJobCode;
                    END
                    ELSE
                    BEGIN
                        -- Insert a new row with the new PriorityNo
                        INSERT INTO [COSEC].[dbo].[Mx_JPCUserJobTrn] ([FromDate], [ToDate], [UserID], [JobCode], [ESSAssignment], [PriorityNo])
                        VALUES (@newFromDate, @newToDate, @newUserID, @newJobCode, 1, @existHighestPriorityNo + 1);
                    END
                `)
            
            if(assignJob?.rowsAffected[0]){
                return {FromDate, ToDate, JobCode, UserID, Status:"Success",Message:`Successfully registered ${JobCode} to ${UserID}`};
            }
        } catch (error) {
            return {FromDate, ToDate, JobCode, UserID,Status:"Failed",Message:`Server Error : ${error.message}`};
        }
        
        
    },
    /* GET Download existing Job Hours assignment*/
    getExistingJobListFromTnaproxy: async (db,updatedBy,jobCode, departmentId,projectType)=>{
        try {
            let whereClause = `
                    WHERE 
                    ('${departmentId}' IS NULL OR '${departmentId}'='' OR DepartmentId = '${departmentId}') AND
                    ('${updatedBy}' IS NULL OR '${updatedBy}'='' OR UpdatedBy = '${updatedBy}') AND
                    ('${jobCode}' IS NULL OR '${jobCode}'='' OR JobCode = '${jobCode}') AND
                    ('${projectType}' IS NULL OR '${projectType}'='' OR ProjectType = '${projectType}')
                
                `
            let existingJobList =await db.query( `
                SELECT
                    JobCode, JobName, MaxJobHourPerDay,BreakHour,TravelHour,ProjectType, DepartmentId, UpdatedBy
                FROM Px_JPCJobMst ${whereClause}
            `);

            return {existingJobList, error:null};
           
        } catch (error) {
            return {existingJobList:null, error};
        }
        
    },
}

module.exports = {jobsHelper};