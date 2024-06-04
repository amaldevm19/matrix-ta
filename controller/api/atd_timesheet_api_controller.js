

function getTotalMinutes(timeString) {
    var timeArray = timeString.split(":");
    var totalMinutes = parseInt(timeArray[0]) * 60 + parseInt(timeArray[1]);
    return totalMinutes;
}
function convertToHHMM(totalMinutes) {
    var hours = Math.floor(totalMinutes / 60);
    var minutes = totalMinutes % 60;
    var hoursStr = hours.toString().padStart(2, '0');
    var minutesStr = minutes.toString().padStart(2, '0');
    var timeString = hoursStr + ":" + minutesStr;
    return timeString;
}
function compareAttendance(a, b) {
    if (a.UserID < b.UserID) return -1;
    if (a.UserID > b.UserID) return 1;
    // If UserID is the same, compare by AttDateTime
    if (a.AttDateTime < b.AttDateTime) return -1;
    if (a.AttDateTime > b.AttDateTime) return 1;
    return 0;
}

const atdTimesheetController ={
    getAtdTimesheetHomePageData:async (req, res)=>{
        try {
            let db = req.app.locals.db;
            try {
                let {UserID,FromDate,ToDate} = req.query;
                if(FromDate && FromDate < '2024-02-08'){
                    FromDate = '2024-02-08'
                }                
                let atdUsers = await db.query(`
                SELECT  
                    u.[UserID],
                    u.[Name],
                    d.[Name] AS DPTName
                FROM 
                    [COSEC].[dbo].[Mx_UserMst] u
                LEFT JOIN
                    [COSEC].[dbo].[Mx_DepartmentMst] d ON u.DPTID = d.DPTID
                WHERE 
                    u.BRCID = 9 AND
                    ('${UserID}' IS NULL OR '${UserID}' = '' OR u.UserID = '${UserID}')
                `)
                let recordset = []
                let att = []
                for (let index = 0; index < atdUsers.recordset.length; index++) {
                    const element = atdUsers.recordset[index];
                    
                    let result = await db.query(`
                    SELECT 
                        UserID,
                        '${element.Name}' AS UserName,
                        '${element.DPTName}' AS DPTName,
                        CONVERT(date, Edatetime) AS AttDateTime,
                        FORMAT(CASE WHEN IOType = 0 THEN Edatetime END, 'HH:mm') AS [InTime],
                        FORMAT(CASE WHEN IOType = 1 THEN Edatetime END, 'HH:mm') AS [OutTime]
                    FROM 
                        [COSEC].[dbo].[Mx_ATDEventTrn]
                    WHERE
                        PROCFLG = 1 AND 
                        UserID = '${element.UserID}' AND 
                        Edatetime > '2024-02-08' AND
                        (('${FromDate}'='' AND '${ToDate}'='') OR Edatetime BETWEEN '${FromDate}' AND '${ToDate}')
                    GROUP BY 
                        UserID,
                        IOType,
                        Edatetime
                    ORDER BY 
                        Edatetime DESC
                    
                    `);
                    
                    if(result.recordset){
                        for (let index = result.recordset.length; index > 0; index--) {
                            const element1 = result.recordset[index-1];
                            element1.AttDateTime = element1.AttDateTime.toISOString().split("T")[0]
                            //console.log(element1)
                            let elementFound = false
                            for (let i = 0; i < att.length; i++) {
                                const element2 = att[i];
                                if(element1.UserID == element2.UserID && element1.AttDateTime == element2.AttDateTime){
                                    if(element1.InTime ){
                                        break;
                                    }
                                    if(element1.OutTime && !element2.OutTime && element1.OutTime > element2.InTime ){
                                        element2.OutTime = element1.OutTime;
                                        elementFound = true;
                                        break;
                                    }
                                }
                            }
                            if(!elementFound){
                                att.push({ UserID: element1.UserID,UserName: element1.UserName,DPTName:element1.DPTName, AttDateTime: element1.AttDateTime, InTime: element1.InTime?element1.InTime:"", OutTime:element1.OutTime?element1.OutTime:""})
                            }
                        }
                        //att.sort(compareAttendance);
                        
                        
                    }
                }
                if(att.length){
                    for (let index = 0; index < att.length; index++) {
                        const element = att[index];
                        if(element.InTime && element.OutTime){
                            let InMinutes = getTotalMinutes(element.InTime);
                            let OutMinutes = getTotalMinutes(element.OutTime);
                            element.TotalWorkHours = convertToHHMM(OutMinutes - InMinutes);
                        }else if(element.InTime && !element.OutTime){
                            let InMinutes = getTotalMinutes(element.InTime);
                            let OutMinutes = null;
                            if(!att[index+1]?.InTime && att[index+1]?.OutTime ){
                                OutMinutes = getTotalMinutes(att[index+1].OutTime);
                            }else{
                                continue;
                            }
                            element.TotalWorkHours = convertToHHMM( (1440 - InMinutes) + OutMinutes);
                        }
                        
                    }

                }
                
                //console.log(att)
                return res.status(200).json({status:"OK", data:att});

            } catch (error) {
                throw error;
            }
        } catch (error) {
            console.log("Error in getAtdTimesheetHomePageData function : ", error)
            return res.status(400).json({status:"not ok",error:error, data:""})
        }
    }
}
module.exports = {atdTimesheetController}

