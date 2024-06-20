
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
    updateMaxJobHourPerDay:async(db,MaxJobHourPerDay,BreakHour,TravelHour,ProjectType, JobCode, UpdatedBy, Department)=>{
        try {
            if(TravelHour != 0 && (ProjectType == "Bus" || ProjectType=="Site")){
                return {status:false,message:"Travel hours cannot be assigned to Bus or Site Project types"}
            }
            let updateMaxJobHourPerDayResponse = await db.query(`
                INSERT INTO Px_JPCJobMst (JobCode, MaxJobHourPerDay, BreakHour, TravelHour, ProjectType, UpdatedBy, DepartmentId)
                VALUES (
                    '${JobCode}',
                    ROUND(${MaxJobHourPerDay}, 1),
                    ROUND(${BreakHour}, 1),
                    ROUND(${TravelHour}, 1),
                    '${ProjectType}',
                    '${UpdatedBy}',
                    '${Department}'
                )
                ON DUPLICATE KEY UPDATE
                    MaxJobHourPerDay = ROUND(${MaxJobHourPerDay}, 1),
                    BreakHour = ROUND(${BreakHour}, 1),
                    TravelHour = ROUND(${TravelHour}, 1),
                    ProjectType = '${ProjectType}',
                    UpdatedBy = '${UpdatedBy}',
                    DepartmentId = '${Department}';
                `)
            if(updateMaxJobHourPerDayResponse.rowsAffected[0] > 0){
                return {status:true,message:`Successfully updated project`}
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
            
            if(assignJob?.rowsAffected[0]){
                return {FromDate, ToDate, JobCode, UserID, Status:"Success",Message:`Successfully registered ${JobCode} to ${UserID}`};
            }
        } catch (error) {
            return {FromDate, ToDate, JobCode, UserID,Status:"Failed",Message:`Server Error : ${error.message}`};
        }
        
        
    }
}

module.exports = {jobsHelper};