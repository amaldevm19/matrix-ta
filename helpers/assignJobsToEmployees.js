const sql = require('mssql');


async function assignJobsToEmployees({FromDate, ToDate, JobCode, UserID}) {
    //console.log(FromDate, ToDate, JobCode, UserID);
    //Connect to COSEC DB
    await sql.connect(`Server=${process.env.DB_SERVER};Database=${process.env.TNA_DB_NAME};User Id=${process.env.DB_USER};Password=${process.env.DB_PWD};Encrypt=true;TrustServerCertificate=true`)
    //Check the JobCode is available in Job List
    let job_exist = await sql.query(`SELECT * FROM Mx_JPCJobMst WHERE JobCode='${JobCode}' `);
    if(job_exist.recordset[0]?.JobCode){

        //If avaialable, collect all records for UserID from UserJobTrn
        let assignedJobs = await sql.query(`SELECT * FROM Mx_JPCUserJobTrn WHERE (UserID='${UserID}' AND ToDate>'${FromDate}') `);
        let assignedJobsArray = assignedJobs.recordset;
        const timeZoneOffset = new Date().getTimezoneOffset();
        let Modified_FromDate = new Date(FromDate+" UTC"+ timeZoneOffset).toISOString().split("T")[0];
        let Modified_ToDate = new Date(ToDate+" UTC"+ timeZoneOffset).toISOString().split("T")[0];
        let modified_job_todate = job_exist.recordset[0].ToDate.toISOString().replace('T',' ').replace('Z','').trim();
        if(Date.parse(Modified_FromDate)>Date.parse(Modified_ToDate)){
            return {FromDate, ToDate, JobCode, UserID,status:"Failed",message:`Job ToDate must be later than FromDate`,at:new Date().toISOString()};
        }
        if(Date.parse(Modified_ToDate)>Date.parse(modified_job_todate)){
            return {FromDate, ToDate, JobCode, UserID,status:"Failed",message:`Assigned Job ToDate is greater than Job ToDate`,at:new Date().toISOString()};
        }
        if(assignedJobsArray){
            let updated_job_list = []
            //If entry available, loop through
            for (let index = 0; index < assignedJobsArray.length; index++) {
                const element = assignedJobsArray[index];
                element.FromDate = element.FromDate.toISOString().replace('T',' ').replace('Z','').trim();
                element.ToDate = element.ToDate.toISOString().replace('T',' ').replace('Z','').trim();
                let modified_elementFromDate = element.FromDate.split(" ")[0]
                let modified_elementToDate = element.ToDate.split(" ")[0]
                //Logic-1
                if(Date.parse(Modified_FromDate) > Date.parse(modified_elementFromDate) && Date.parse(Modified_FromDate) <= Date.parse(modified_elementToDate) && Date.parse(Modified_ToDate) >= Date.parse(modified_elementToDate)){
                    let new_toDate = changeDay(Modified_FromDate,"-") //new Date(new Date(FromDate).getTime() - (24 * 60 * 60 * 1000)).toISOString().replace('T',' ').replace('Z','');
                    let updated_job = await sql.query(`UPDATE Mx_JPCUserJobTrn SET ToDate='${new_toDate}' WHERE (UserID='${UserID}' AND JobCode='${element.JobCode}' AND ToDate='${element.ToDate}' AND FromDate='${element.FromDate}')`);
                    if(updated_job.rowsAffected[0]){
                        updated_job_list.push(element.JobCode)
                        continue;
                    }else{
                        return {FromDate, ToDate, JobCode, UserID,status:"Failed",message:`Failed to modify exisiting Job ${element.JobCode}`,at:new Date().toISOString()};
                    }
                }
                //Logic-2
                if(Date.parse(Modified_ToDate) >  Date.parse(modified_elementFromDate) && Date.parse(Modified_ToDate) < Date.parse(modified_elementToDate) && Date.parse(Modified_FromDate) <= Date.parse(modified_elementFromDate)){
                    let new_fromDate = changeDay(Modified_ToDate,"+") //new Date(new Date(ToDate).getTime() + (24 * 60 * 60 * 1000)).toISOString().replace('T',' ').replace('Z','');
                    let updated_job = await sql.query(`UPDATE Mx_JPCUserJobTrn SET FromDate='${new_fromDate}' WHERE (UserID='${UserID}' AND JobCode='${element.JobCode}' AND ToDate='${element.ToDate}' AND FromDate='${element.FromDate}')`);
                    if(updated_job.rowsAffected[0]){
                        updated_job_list.push(element.JobCode)
                    }else{
                        return {FromDate, ToDate, JobCode, UserID,status:"Failed",message:`Failed to modify exisiting Job ${element.JobCode}`,at:new Date().toISOString()};
                    }
                    continue;
                }
                //Logic-3
                if(Date.parse(Modified_FromDate) <= Date.parse(modified_elementFromDate) && Date.parse(Modified_ToDate) >= Date.parse(modified_elementToDate)){
                    let updated_job = await sql.query(`DELETE FROM Mx_JPCUserJobTrn WHERE UserID='${UserID}' AND JobCode='${element.JobCode}' AND ToDate='${element.ToDate}' AND FromDate='${element.FromDate}'`);
                    if(updated_job.rowsAffected[0]){
                        updated_job_list.push(element.JobCode)
                    }else{
                        return {FromDate, ToDate, JobCode, UserID,status:"Failed",message:`Failed to delete exisiting Job ${element.JobCode}`,at:new Date().toISOString()};
                    }
                    continue;
                }
                //Logic-4
                if((Date.parse(Modified_FromDate) > Date.parse(modified_elementFromDate) && Date.parse(Modified_ToDate) < Date.parse(modified_elementToDate) && JobCode == element.JobCode)){
                    return {FromDate, ToDate, JobCode, UserID,status:"unchanged",message:"Same Data exisit",at:new Date().toISOString()};
                }

                //Logic-5
                if((Date.parse(Modified_FromDate) > Date.parse(modified_elementFromDate) && Date.parse(Modified_ToDate) < Date.parse(modified_elementToDate) && JobCode != element.JobCode)){
                    let new_toDate = changeDay(Modified_FromDate,"-") //new Date(Date.parse(FromDate) - (24 * 60 * 60 * 1000)).toISOString().replace('T',' ').replace('Z','');
                    let new_fromDate = changeDay(Modified_ToDate,"+") //new Date(new Date(ToDate).getTime() + (24 * 60 * 60 * 1000)).toISOString().replace('T',' ').replace('Z','');
                    let updated_job = await sql.query(`UPDATE Mx_JPCUserJobTrn SET ToDate='${new_toDate}' WHERE (UserID='${UserID}' AND JobCode='${element.JobCode}' AND ToDate='${element.ToDate}' AND FromDate='${element.FromDate}')`);
                    if(updated_job.rowsAffected[0]){
                        updated_job_list.push(element.JobCode)
                    }else{
                        return {FromDate, ToDate, JobCode, UserID,status:"Failed",message:`Failed to modify exisiting Job ${element.JobCode}`,at:new Date().toISOString()};
                    }
                    let inserted_job = await sql.query(`INSERT INTO Mx_JPCUserJobTrn (FromDate, ToDate, UserID, JobCode,ESSAssignment) VALUES('${new_fromDate}', '${element.ToDate}', '${UserID.trim()}', '${element.JobCode.trim()}','1')`);
                    if(inserted_job.rowsAffected[0]){
                        updated_job_list.push(element.JobCode)
                    }else{
                        return {FromDate, ToDate, JobCode, UserID,status:"Failed",message:`Failed to modify exisiting Job ${element.JobCode}`,at:new Date().toISOString()};
                    }
                    continue;
                }

            }
            if(updated_job_list.length>0){
                //console.log(updated_job_list)
                let inserted_job = await sql.query(`INSERT INTO Mx_JPCUserJobTrn (FromDate, ToDate, UserID, JobCode,ESSAssignment) VALUES('${FromDate.trim()}', '${ToDate.replace("00:00:00.000","23:59:59.000").trim()}', '${UserID.trim()}', '${JobCode.trim()}','1')`);
                if(inserted_job.rowsAffected[0]){
                    return {FromDate, ToDate, JobCode, UserID,status:"Created",message:`Updated exisitng jobs ${updated_job_list}`,at:new Date().toISOString()};
                }else{
                    return {FromDate, ToDate, JobCode, UserID,status:"Failed",message:`DB error while assigning new Job ${JobCode} to ${UserID}`,at:new Date().toISOString()};
                }
            }

        }
        let inserted_job = await sql.query(`INSERT INTO Mx_JPCUserJobTrn (FromDate, ToDate, UserID, JobCode,ESSAssignment) VALUES('${FromDate.trim()}', '${ToDate.replace("00:00:00.000","23:59:59.000").trim()}', '${UserID.trim()}', '${JobCode.trim()}','1')`);
        if(inserted_job.rowsAffected[0]){
            return {FromDate, ToDate, JobCode, UserID,status:"Created",message:`Assigned new Job ${JobCode} to ${UserID}`,at:new Date().toISOString()};
        }else{
            return {FromDate, ToDate, JobCode, UserID,status:"Failed",message:`DB error while assigning new Job ${JobCode} to ${UserID}`,at:new Date().toISOString()};
        }
    }
    return {FromDate, ToDate, JobCode, UserID,status:"Failed",message:"Job Doesnt exist",at:new Date().toISOString()};
}
module.exports = assignJobsToEmployees;

function changeDay(date_only, changer) {
    let modified_date='';
    let day_only = parseInt(date_only.split('-')[2]);
    let month =  parseInt(date_only.split('-')[1]);
    let year = parseInt(date_only.split('-')[0]);
    let time_string = ""
    let last_day = new Date(year, month, 0).getDate();
    let previous_month_last_day = new Date(year, month==1 ? 12 : month-1, 0).getDate();;
    switch (changer) {
        case '+':
            if(day_only == last_day ){
                day_only = 1;
                month = month == 12 ? 1 : month+1;
                year = month == 12 ? year+1: year;
            }else{
                day_only += 1;
            }
            time_string=" 00:00:00.000"
            break;

        case '-':
            if(day_only == 1 ){
                day_only = previous_month_last_day;
                month = month == 1 ? 12 : month-1;
                year = month == 1 ? year-1: year;

            }else{
                day_only -= 1;
            }
            time_string=" 23:59:59.000"
            break;
    }
    modified_date = `${year}-${month.toString().padStart(2,"0")}-${day_only.toString().padStart(2,"0")}${time_string}`
    return modified_date;
}