
const sql = require('mssql');
const {insertItem, getItem} = require("../../helpers/11_insert_into_tna");
const {controllerLogger} = require("../../helpers/19_middleware_history_logger");

const branchController = {
    addNewBranch:async (req, res)=>{
        let {branch_name, branch_code} = req.body;
            if(!branch_name || !branch_code){
                await controllerLogger(req)
                return res.status(200).json({status:"failed",error:"Values cannot be empty"});
            }else{
                try {
                    branch_name = branch_name.replace(/[^A-Za-z0-9-_.()\[\] ]/g,'').slice(0,45).trim();
                    let db_response = await req.app.locals.db.query(`INSERT INTO Px_BranchMst (BranchName,BranchCode) VALUES ('${branch_name}', '${branch_code}')`);
                    if(db_response && db_response.rowsAffected[0] > 0){
                        insertItem(`branch?action=set;code=${branch_code};name=${branch_name}`).then(async data=>{
                            if(data.status){
                                getItem(`branch?action=get;format=json`,"code",branch_code,"branch").then(async(id)=>{
                                    let db_response = await req.app.locals.db.query(`UPDATE Px_BranchMst SET TnaBranchId='${id}' WHERE BranchCode='${branch_code}'`);
                                    if(db_response && db_response.rowsAffected[0] > 0){
                                        await controllerLogger(req)
                                        return res.status(200).json({status:"ok",error:""});
                                    }else{
                                        await req.app.locals.db.query(`DELETE Px_BranchMst WHERE BranchCode='${branch_code}'`);
                                        throw{message:"Failed to store in T&A ID in local server"};
                                    }
                                })  
                            }else{
                                await req.app.locals.db.query(`DELETE Px_BranchMst WHERE BranchCode='${branch_code}'`);
                                throw{message:data.message};
                            }

                        })
                        
                    }else{
                        throw{message:"DB Error"};
                    }
                } catch (error) {
                    console.log("Error in addNewBranch function : ",error)
                    await controllerLogger(req, error)
                    return res.status(200).json({status:"failed",error:error.message});
                }
            }
    },
    updateBranch:async (req, res)=>{
        const {branch_name, branch_code} = req.body;
        try {
            let name_exist = await req.app.locals.db.query(`SELECT * FROM Px_BranchMst WHERE BranchName='${req.params.branch_name}'`);
            if(name_exist.recordset[0]){
                let branch_id = name_exist.recordset[0].BranchId;
                let updated_branch_name = branch_name? branch_name:name_exist.recordset[0].BranchName;
                let updated_branch_code = branch_code? branch_code:name_exist.recordset[0].BranchCode;
                let tna_branch_Id = name_exist.recordset[0].TnaBranchID;
                let db_response = await req.app.locals.db.query(`UPDATE Px_BranchMst SET BranchName='${updated_branch_name}',BranchCode='${updated_branch_code}' WHERE BranchId=${branch_id}`);
                if(db_response && db_response.rowsAffected[0] > 0){
                    insertItem(`branch?action=update;id=${tna_branch_Id};code=${updated_branch_code};name=${updated_branch_name}`).then(async data=>{
                        if(data.status){
                            await controllerLogger(req)
                            return res.status(201).json({status:"ok",error:""});
                        } else{
                            throw {message:data.message};
                        }
                    }) 
                }else{
                    throw {message:"Database error; Try agian"};
                }
            }else{
                throw {message:"Branch not found"};
            }    
        } catch (error) {
            console.log("Error in updateBranch function : ",error)
            await controllerLogger(req, res)
            return res.status(400).json({status:"failed",error:error.message});
        } 
    },
    addTnaItemsToProxyDB:async(req, res)=>{
        try {
            await sql.connect(`Server=${process.env.DB_SERVER};Database=${process.env.TNA_DB_NAME};User Id=${process.env.DB_USER};Password=${process.env.DB_PWD};Encrypt=true;TrustServerCertificate=true`)
            let all_branches = await sql.query(`SELECT * FROM Mx_BranchMst`);
            let response_array = []; 
            if(all_branches.recordset[0]){
                for(let i=0; i<all_branches.recordset.length;i++){
                    let db_response = await req.app.locals.db.query(`INSERT INTO Px_BranchMst (BranchName, BranchCode, TnaBranchId) VALUES ('${all_branches.recordset[i].Name}','${all_branches.recordset[i].BRCCODE}',${all_branches.recordset[i].BRCID})`);
                    response_array.push(db_response);
                };
                if(response_array.length >=all_branches.recordset.length){
                    await controllerLogger(req)
                    return res.status(201).json({status:"ok",error:""});
                }
            }
        } catch (error) {
            console.log("Error in addTnaItemsToProxyDB function : ",error)
            await controllerLogger(req,res)
            return res.status(400).json({status:"failed",error:error.message});
        }
    }
}

module.exports = branchController