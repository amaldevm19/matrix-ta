const dateRangeBuilder = require("./date_range_builder");
const readCSVToMap = require('./read_csv_to_map')

async function getTransactionsFromTna(employee_category,test_date,tna_url,tna_username, tna_password) {
    try {
        let date_range = dateRangeBuilder(employee_category);
        
       if(test_date){
            date_range = test_date;
       }
        tna_username = process.env.TNA_USERNAME;
        tna_password = process.env.TNA_PASSWORD;
        // tna_url = "https://tna.up.ae/cosec/api.svc/v2/attendance-daily?action=get;";
        tna_url = "https://tna.up.ae/cosec/api.svc/v2/timesheet?action=get;";
        let url = `${tna_url}range=custom-group-3;id=${employee_category};date-range=${date_range};format=json`;
        
        //let url = `${tna_url}range=custom-group-1;id=${employee_category};date-range=${date_range};format=json`;
        //let url = `${tna_url}range=custom-group-3;id=${employee_category};date-range=${date_range};format=json;field-name=worktime_hhmm,userid,processdate`;
        
        let headers = new Headers();
        headers.set('Authorization', 'Basic ' + Buffer.from(tna_username + ":" + tna_password).toString('base64'));
        let response = await fetch(url,{method:'GET',headers:headers});
        const json = await response.text();
        const data = JSON.parse(json);
        let transactionData =[];
        let transactionMap = new Map();
        const jobCodeMap = await readCSVToMap(employee_category);
        //console.log("Total employees in Homeservice list : "+data["attendance-daily"].length)
        if(data.timesheet){
            //Loop through timesheet array of Biometric response data
            for (let index = 0; index < data.timesheet.length; index++) {
                    //Assign the current transaction to an object
                    const obj = data.timesheet[index];

                    //Check availability of Job code and Job hours, if not available continue with loop
                    if(!obj['job-hours']){
                        continue;
                    }
                    // if(!obj['job-code']){
                    //     obj['job-code'] = jobCodeMap.get(obj.userid+"#"+obj['attendance-date']);
                    // }
                    //console.log( jobCodeMap.get(obj.userid+"#"+obj['processdate']))
                    //console.log("Emp Id: "+obj.userid+" JobCode: "+obj['job-code']+" processdate: "+obj['processdate'])
                    if(!obj['job-code']){
                        continue;
                    }


                    //Assign job-hours to an object
                    let job_hours=obj['job-hours'];

                    //Check Job-hours has decimal points
                    if(job_hours.includes(":")){
                        //If decimal point avaialble split into two
                        job_hours = job_hours.split(":");

                        //Check the decimal is greater than 15
                        if(parseInt(job_hours[1]) >= 15){

                            //If greater than 15, mark it as .5
                            job_hours[1] = 0.5;
                        }else{

                            //Else mark it as 0
                            job_hours[1] = 0;
                        }

                        //Assign job-hours to obj.job-hours
                        obj['job-hours'] = parseInt(job_hours[0])+job_hours[1]
                    }
                    //Continue loop if job hours equal to 0
                    if(obj['job-hours'] <= 0){
                        continue;
                    }
                    //Handling Project Code length from ERP,
                    let project_id_array = obj['job-code'].split('-')
                    if(project_id_array.length > 3){
                        obj['job-code'] = project_id_array[0]+'-'+project_id_array[1]+'-'+project_id_array[2]+'-0'+project_id_array[3];
                    }
                    //Converting format of attendance date of Biometric response to match ERP required format 
                    const dateParts = obj['attendance-date'].split("/");
                    const formattedDate = `${dateParts[2]}-${dateParts[0].padStart(2, "0")}-${dateParts[1].padStart(2, "0")}`;
                    
                    //Converting format of Employee code of Biometric response to match ERP required format 
                    obj.userid = obj.userid.replace(/([a-zA-Z])(\d)/, '$1-$2');

                    //Check the current userid exisit in the Transaction Map data structure
                    let exis_obj = transactionMap.get(obj.userid);
                    //If not found Set new UserId key with current object inside an array
                    if(!exis_obj){
                        transactionMap.set(obj.userid,[{
                            HcmWorker_PersonnelNumber:obj.userid,
                            TransDate:formattedDate,
                            projId:obj['job-code'],
                            TotalHours:parseFloat(obj['job-hours']),
                            CategoryId:"Timesheet"
                        }])
                    }else{
                        //Else if found, loop through the Object array of that user
                        let obj_found = false;
                        for (let index = 0; index < exis_obj.length; index++) {
                            const element = exis_obj[index];
                            
                            //Check the project id of Object in object array matches the current user's project id
                            if(exis_obj[index].projId == obj['job-code'] && exis_obj[index].TransDate == formattedDate){
                                //If matching, add obj.job-hours to the matched jobcode's job hours 
                                exis_obj[index].TotalHours += obj['job-hours'];
                                obj_found = true;
                                break;
                            }
                        }
                       
                        if(!obj_found){
                             //If object not found push the current object to exisitng user object array
                           exis_obj.push({
                                HcmWorker_PersonnelNumber:obj.userid,
                                TransDate:formattedDate,
                                projId:obj['job-code'],
                                TotalHours:parseFloat(obj['job-hours']),
                                CategoryId:"Timesheet"
                            })
                        }
                        //Set the updated user obect in place of existing user.
                        transactionMap.set(obj.userid,exis_obj)
                    }

            }
            //Loop through transaction Map to construct transactionData array
            for(let userArray of transactionMap.values() ){
                for (let index = 0; index < userArray.length; index++) {
                    const element = userArray[index];
                    if(element.TotalHours >= 9){
                        element.TotalHours -= 1;
                    }
                    if(element.TotalHours > 15){
                        element.TotalHours = 15;
                    }
                    transactionData.push(element)
                }
            }
            return {TransList:transactionData};
        }else{
            throw {message:"Couldn't retrieve the transactions"}
        }
        /*
        if(data["attendance-daily"]){
            //Loop through timesheet array of Biometric response data
            for (let index = 0; index < data["attendance-daily"].length; index++) {
                    const obj = data["attendance-daily"][index];
                    if(!obj['worktime_hhmm']){
                        continue;
                    }

                    if(!obj['job-code']){
                        obj['job-code'] = jobCodeMap.get(obj.userid+"#"+obj['processdate']);
                    }
                    //console.log( jobCodeMap.get(obj.userid+"#"+obj['processdate']))
                    //console.log("Emp Id: "+obj.userid+" JobCode: "+obj['job-code']+" processdate: "+obj['processdate'])
                    if(!obj['job-code']){
                        continue;
                    }

                    //Assign worktime_hhmm to an object
                    let job_hours=obj['worktime_hhmm'];

                    //Check worktime_hhmm has decimal points
                    if(job_hours.includes(":")){
                        //If decimal point avaialble split into two
                        job_hours = job_hours.split(":");

                        //Check the decimal is greater than 15
                        if(parseInt(job_hours[1]) >= 15){

                            //If greater than 15, mark it as .5
                            job_hours[1] = 0.5;
                        }else{

                            //Else mark it as 0
                            job_hours[1] = 0;
                        }

                        //Assign worktime_hhmm to obj.worktime_hhmm
                        obj['worktime_hhmm'] = parseInt(job_hours[0])+job_hours[1]
                    }
                    //Continue loop if job hours equal to 0
                    if(obj['worktime_hhmm'] <= 0){
                        continue;
                    }
                    //Handling Project Code length from ERP,
                    let project_id_array = obj['job-code'].split('-')
                    if(project_id_array.length > 3){
                        obj['job-code'] = project_id_array[0]+'-'+project_id_array[1]+'-'+project_id_array[2]+'-0'+project_id_array[3];
                    }
                    //Converting format of attendance date of Biometric response to match ERP required format 
                    const dateParts = obj['processdate'].split("/");
                    const formattedDate = `${dateParts[2]}-${dateParts[1].padStart(2, "0")}-${dateParts[0].padStart(2, "0")}`;
                    
                    //Converting format of Employee code of Biometric response to match ERP required format 
                    obj.userid = obj.userid.replace(/([a-zA-Z])(\d)/, '$1-$2');

                    //Check the current userid exisit in the Transaction Map data structure
                    let exis_obj = transactionMap.get(obj.userid);
                    //If not found Set new UserId key with current object inside an array
                    if(!exis_obj){
                        transactionMap.set(obj.userid,[{
                            HcmWorker_PersonnelNumber:obj.userid,
                            TransDate:formattedDate,
                            projId:obj['job-code'],
                            TotalHours:parseFloat(obj['worktime_hhmm']),
                            CategoryId:"Timesheet"
                        }])
                    }else{
                        //Else if found, loop through the Object array of that user
                        let obj_found = false;
                        for (let index = 0; index < exis_obj.length; index++) {
                            const element = exis_obj[index];
                            
                            //Check the project id of Object in object array matches the current user's project id
                            if(exis_obj[index].projId == obj['job-code'] && exis_obj[index].TransDate == formattedDate){
                                //If matching, add obj.worktime_hhmm to the matched jobcode's job hours 
                                exis_obj[index].TotalHours += obj['worktime_hhmm'];
                                obj_found = true;
                                break;
                            }
                        }
                       
                        if(!obj_found){
                             //If object not found push the current object to exisitng user object array
                           exis_obj.push({
                                HcmWorker_PersonnelNumber:obj.userid,
                                TransDate:formattedDate,
                                projId:obj['job-code'],
                                TotalHours:parseFloat(obj['worktime_hhmm']),
                                CategoryId:"Timesheet"
                            })
                        }
                        //Set the updated user obect in place of existing user.
                        transactionMap.set(obj.userid,exis_obj)
                    }

            }
            //Loop through transaction Map to construct transactionData array
            for(let userArray of transactionMap.values() ){
                for (let index = 0; index < userArray.length; index++) {
                    const element = userArray[index];
                    transactionData.push(element)
                }
            }
            //console.log("Process currently run for :"+(employee_category==2?"staff":"non-staff"))
            //console.log("Work Hours Found for: "+transactionData.length)
            return {TransList:transactionData};
        }else{
            throw {message:"Couldn't retrieve the transactions"}
        }
        */
    } catch (error) {
        return error;
    }
  
}

module.exports=getTransactionsFromTna;