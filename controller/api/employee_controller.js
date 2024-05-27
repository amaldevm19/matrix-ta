const fs = require('fs');
const path = require('path');

const sql = require('mssql');
const {insertItem, getItem} = require("../../helpers/11_insert_into_tna");
const readFilePromise = require("../../helpers/13_read_file_promise");
const {controllerLogger} = require("../../helpers/19_middleware_history_logger");


const employeeController = {
    
    addNewEmployee:async (req, res)=>{
        try {
            let {employee_id, employee_name,branch_code,department_code,position,employee_category} = req.body;
            if(!employee_id || !employee_name || !branch_code ||!department_code ||!position||!employee_category ){
                throw {message:"All values required"};
            }
            let index = employee_id.indexOf("-")
            let modified_employee_id = employee_id.substring(0, index) + employee_id.substring(index + 1, employee_id.length);
            let employee_id_exist = await getItem(`user?action=get;id=${modified_employee_id};field-name=id,name;format=json`,"id",modified_employee_id,"user");
            let modified_employee_name = employee_name.slice(0,45).replace(/[^a-zA-Z ]+/g, '').replace(/\s+/g, ' ').trim();
            let branch_exisit = await req.app.locals.db.query(`SELECT TnaBranchId FROM Px_BranchMst WHERE BranchCode='${branch_code}'`);
            let department_exisit = await req.app.locals.db.query(`SELECT TnaDepartmentId FROM Px_DepartmentMst WHERE DepartmentCode='${department_code}'`);
            let designation_exisit = await req.app.locals.db.query(`SELECT TnaDesignationId FROM Px_DesignationMst WHERE Position='${position}'`);
            if(!branch_exisit.recordset[0]?.TnaBranchId){
                throw{message: "Branch doesn't exisits"};
            } else if(!department_exisit.recordset[0]?.TnaDepartmentId){
                throw{message:"Department doesn't exisits"};
            }else if(!designation_exisit.recordset[0]?.TnaDesignationId){
                throw{message:"Designation doesn't exisits"};
            }else if(!["2","3"].includes(employee_category)){
                throw{message:"Employee category doesn't exisits"};
            }else if(employee_id_exist){
                throw{message:"Employee Already Exisit"};
            }else{
                let data = await insertItem(`user?action=set;id=${modified_employee_id};name=${modified_employee_name};branch=${branch_exisit.recordset[0].TnaBranchId};department=${department_exisit.recordset[0].TnaDepartmentId};designation=${designation_exisit.recordset[0].TnaDesignationId};customgroup1ID=${employee_category};customgroup2ID=2;field1=${employee_id}`);
                if(data.status){
                    await controllerLogger(req)
                    return res.status(200).json({status:"ok",error:""});    
                }else{
                    let employee_id_exist = await getItem(`user?action=get;id=${modified_employee_id};field-name=id,name;format=json`,"id",modified_employee_id,"user");
                    console.log("Employee_id = ", employee_id_exist)
                    if(employee_id_exist){
                        await controllerLogger(req)
                        return res.status(200).json({status:"ok",error:""});   
                    }else{
                        throw{message:data.message};
                    }
                }
            }
            
        } catch (error) {
            console.log("Error from addNewEmployee function : ", error.message)
            await controllerLogger(req, error.message)
            return res.status(200).json({status:"failed",error:error.message})
        }
           
    },
    updateEmployee:async(req, res)=>{
        try {
            let {employee_id, employee_name,branch_code,department_code,position,employee_category, employee_status} = req.body;
            if(!employee_id){
                throw {message:"Employee ID not provided"}
            }
            let index = employee_id.indexOf("-")
            let modified_employee_id = employee_id.substring(0, index) + employee_id.substring(index + 1, employee_id.length);
            let employee_id_exist = await getItem(`user?action=get;id=${modified_employee_id};field-name=id,name;format=json`,"id",modified_employee_id,"user");
            let modified_employee_name = employee_name? employee_name.slice(0,45).replace(/[^a-zA-Z ]+/g, '').replace(/\s+/g, ' ').trim():'';
            let branch_exisit = null;
            let department_exisit = null;
            let designation_exisit = null;
            if(branch_code){
                branch_exisit = await req.app.locals.db.query(`SELECT TnaBranchId FROM Px_BranchMst WHERE BranchCode='${branch_code}'`);
                if(!branch_exisit.recordset[0]?.TnaBranchId){
                    throw {message:"Branch doesn't exisits"}
                }
            }
            if(department_code){
                department_exisit = await req.app.locals.db.query(`SELECT TnaDepartmentId FROM Px_DepartmentMst WHERE DepartmentCode='${department_code}'`);
                if(!department_exisit.recordset[0]?.TnaDepartmentId){
                    throw {message:"Department doesn't exisits"}
                }
            }
            if(position){
                designation_exisit = await req.app.locals.db.query(`SELECT TnaDesignationId FROM Px_DesignationMst WHERE Position='${position}'`);
                if(!designation_exisit.recordset[0]?.TnaDesignationId){
                    throw {message:"Designation doesn't exisits"}
                }
            }
            if(employee_category && !["2","3"].includes(employee_category)){
                throw {message:"Employee category doesn't exisits"}
            }
            if(!employee_id_exist){
                throw {message:"Employee doesn't Exisit in T&A"};
            }else{
                let data = await insertItem(`user?action=set;id=${modified_employee_id};${employee_name? "name=" + modified_employee_name:"" };${employee_status=="0"?"active=0":"active=1"};${employee_name? "full-name=" + modified_employee_name:"" };${employee_name? "short-name=" + modified_employee_name.slice(0,15):"" };${branch_code? "branch=" + branch_exisit.recordset[0]?.TnaBranchId:""};${department_code? "department=" + department_exisit.recordset[0]?.TnaDepartmentId:""};${position? "designation=" + designation_exisit.recordset[0]?.TnaDesignationId:""};${employee_category? "customgroup1ID=" + employee_category:''};${employee_status=="0"?"customgroup2ID=3":"customgroup2ID=2"}`);
                if(data.status){
                    await controllerLogger(req)
                    return res.status(200).json({status:"ok",error:""});    
                }else{
                    let employee_id_exist = await getItem(`user?action=get;id=${modified_employee_id};field-name=id,name;format=json`,"id",modified_employee_id,"user");
                    if(employee_id_exist){
                        await controllerLogger(req)
                        return res.status(200).json({status:"ok",error:""});   
                    }else{
                        throw{message:data.message};
                    }
                }
            } 
        } catch (error) {
            console.log("Error from updateEmployee function : ", error);
            await controllerLogger(req, error.message)
            return res.status(200).json({status:"failed",error:error.message})
        }
        
    },
    addEmployeesViaCSV: async (req, res)=>{
        try {
            const fileData = fs.readFileSync(path.join(__dirname,"..","..","csv","users","user1.csv"));
            let {records, err} = await readFilePromise(fileData)
            if(err){
                console.log(err)
                return;
            }
            const columns = records[0];
            // console.log(records)
            let failed =[];
            let success = [];
            const rows = await Promise.all(records.splice(1).map(async (arr)=>{
                const obj = {};
                columns.forEach((column, index)=>{
                    obj[column] = arr[index];
                })
                obj.employee_name = obj.employee_name.slice(0,45).trim();
                return obj;
                /*
                    let db_response = await sql.query(`INSERT INTO Mx_JPCJobMst (FromDate, ToDate, CCID, JobCode, Name, JobID, MergeJob, Allowance) VALUES ('${obj.FromDate}', '${obj.ToDate}', '1','${obj.JobCode}','${obj.Name.replace(/[^A-Za-z0-9-_.()\[\]]/g, '').slice(0,30).trim()}', '${obj.JobID}','0','0')`);
                    if(db_response?.rowsAffected[0] > 0){
                        success.push({...obj,status:"Success"})
                    }else{
                        failed.push( {...obj,status:"Failed"})
                    }
                */
            }))
            let response_status = [];
            if(rows){
                for (let index = 0; index < rows.length; index++) {
                    const element = rows[index];
                    let data = await insertItem(`user?action=set;id=${element.employee_id};name=${element.employee_name};full-name=${element.employee_name};branch=${element.branch_code};department=${element.department_code};designation=${element.designation_code};customgroup1ID=${element.employee_category};customgroup2ID=2;field1=${element.employee_field}`);
                    if(data.status){
                        response_status.push({employee_id:element.employee_id,status:"ok",message:""});   
                    }else{
                        let employee_id_exist = await getItem(`user?action=get;id=${element.employee_id};field-name=id,name;format=json`,"id",element.employee_id,"user");
                        if(employee_id_exist){
                            response_status.push({employee_id:element.employee_id,status:"ok",message:""});   
                        }else{
                            response_status.push({employee_id:element.employee_id,status:"error",message:data.message});
                        }
                    }
                    
                }
            }
            if(response_status){
                await controllerLogger(req)
                return res.status(200).json(response_status);
            }
             
        } catch (error) {
            console.log("Error from addEmployeesViaCSV function : ", error)
            await controllerLogger(req, error)
        }

    }
}

module.exports = employeeController