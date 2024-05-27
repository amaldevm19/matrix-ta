
const sql = require('mssql');
const {insertItem, getItem} = require("../../helpers/11_insert_into_tna");
const generateCode = require("../../helpers/12_code_generator");
const {controllerLogger} = require("../../helpers/19_middleware_history_logger");


const departmentController = {

    addNewDepartment:async (req, res)=>{
    try {
        let {department_name, department_code} = req.body;
        if(!department_name || !department_code){
            throw{message:"department_name and department_code is required"};
        }
        department_name = department_name.replace(/[^A-Za-z0-9-_.()\[\] ]/g,'').slice(0,45).trim();
        let tna_department_code = department_code.slice(-6);
        if(!parseInt(tna_department_code)){
            tna_department_code = generateCode();
        }
        let db_response = await req.app.locals.db.query(`INSERT INTO Px_DepartmentMst (DepartmentName,DepartmentCode) VALUES ('${department_name}', '${department_code}')`);
        if(db_response && db_response.rowsAffected[0] > 0){
            let data = await insertItem(`department?action=set;code=${tna_department_code};name=${department_name}`);
            if(data.status){
                let id = await getItem(`department?action=get;format=json`,"code",tna_department_code,"department")
                let db_response = await req.app.locals.db.query(`UPDATE Px_DepartmentMst SET TnaDepartmentId='${id}' WHERE DepartmentCode='${department_code}'`);
                if(db_response && db_response.rowsAffected[0] > 0){
                    await controllerLogger(req)
                    return res.status(200).json({status:"ok",error:""});
                }else{
                    await req.app.locals.db.query(`DELETE Px_DepartmentMst WHERE DepartmentCode='${department_code}'`);
                    throw{message:"Failed to store in T&A ID in local server"};
                }
            }else{
                await req.app.locals.db.query(`DELETE Px_DepartmentMst WHERE DepartmentCode='${department_code}'`);
                throw{message:data.message};
            }
        }else{
            throw{message:"DB Error"};
        }
        
    } catch (error) {
        console.log("Error in addNewDepartment function : ",error);
        await controllerLogger(req, error)
        return res.status(200).json({status:"failed",error:error.message});
    }
    },
    updateDepartment:async (req, res)=>{
        try {
            let {department_name, department_code} = req.body;
            if(!department_name || !department_code){
                throw{message:"department_name and department_code is required"};
            }
            let exisitng_dpt = await req.app.locals.db.query(`SELECT * FROM Px_DepartmentMst WHERE DepartmentCode='${department_code}'`);
            if(exisitng_dpt.recordset[0]){
                let updated_department_name = department_name? department_name:exisitng_dpt.recordset[0].DepartmentName;
                let tna_department_Id = exisitng_dpt.recordset[0].TnaDepartmentId;
                let db_response = await req.app.locals.db.query(`UPDATE Px_DepartmentMst SET DepartmentName='${updated_department_name}' WHERE TnaDepartmentId='${tna_department_Id}'`);
                if(db_response && db_response.rowsAffected[0] > 0){
                    let data = await insertItem(`department?action=update;id=${tna_department_Id};name=${updated_department_name}`);
                    if(data.status){
                        await controllerLogger(req)
                        return res.status(201).json({status:"ok",error:""});
                    } else{
                        throw {message:data.message};
                    }
                }else{
                    throw {message:"Database error;  Try agian"};
                }
                
            }else{
                throw {message:"Department not found"};
            }
        } catch (error) {
            console.log("Error in updateDepartment function : ",error)
            await controllerLogger(req, error)
            return res.status(400).json({status:"failed",error:error.message}); 
        }

    },
    addAllDepartmentsFromTnaToProxyDB:async(req, res)=>{
        try {
            await sql.connect(`Server=${process.env.DB_SERVER};Database=${process.env.TNA_DB_NAME};User Id=${process.env.DB_USER};Password=${process.env.DB_PWD};Encrypt=true;TrustServerCertificate=true`)
            let all_departments = await sql.query(`SELECT * FROM Mx_DepartmentMst`);
            let response_array = []; 
            if(all_departments.recordset[0]){
                for(let i=0; i<all_departments.recordset.length;i++){
                    let db_response = await req.app.locals.db.query(`INSERT INTO Px_DepartmentMst (DepartmentName, DepartmentCode, TnaDepartmentId) VALUES ('${all_departments.recordset[i].Name}','${all_departments.recordset[i].DPTCODE}',${all_departments.recordset[i].DPTID})`);
                    response_array.push(db_response);
                };
                if(response_array.length >=all_departments.recordset.length){
                    await controllerLogger(req)
                    return res.status(201).json({status:"ok",error:""});
                }
            }
        } catch (error) {
            console.log("Error in addAllDepartmentsFromTnaToProxyDB function : ",error)
            await controllerLogger(req, error)
            return res.status(400).json({status:"failed",error:error.message});
        }
    }

}

module.exports = departmentController