const fs = require('fs');
const path = require('path');
const sql = require('mssql');
const ObjectsToCsv = require('objects-to-csv');
const {parse } = require('csv-parse');
const {insertItem, getItem} = require("../../helpers/11_insert_into_tna");
const generateCode = require("../../helpers/12_code_generator");
const {controllerLogger} = require("../../helpers/19_middleware_history_logger");


const designationController = {
    addNewDesignation:async (req, res)=>{
        let {designation_name, position} = req.body;
        if(!designation_name || !position){
            throw({message:"Designation name and Position required"});
        }else{
            try {
                await sql.connect(`Server=${process.env.DB_SERVER};Database=${process.env.TNA_DB_NAME};User Id=${process.env.DB_USER};Password=${process.env.DB_PWD};Encrypt=true;TrustServerCertificate=true`)
                designation_name = designation_name.replace(/[^A-Za-z0-9-_.()\[\] ]/g,'').slice(0,45).trim();
                let get_designation_from_tna_db = await sql.query(`SELECT TOP 1 * FROM Mx_DesignationMst WHERE Name='${designation_name}'`);
                if(get_designation_from_tna_db.recordset[0]){
                    let db_response = await req.app.locals.db.query(`INSERT INTO Px_DesignationMst (Name, Position,TnaDesignationId) VALUES ('${designation_name}','${position}','${get_designation_from_tna_db.recordset[0].DSGID}')`);
                    if(db_response && db_response.rowsAffected[0] > 0){
                        await controllerLogger(req)
                        return res.status(200).json({status:"ok",error:""});
                    }else{
                        throw {message:"Failed to store in database server"};
                    }
                }else{
                    let DSGCODE = generateCode();
                    let get_dsgid_from_tna_db = await sql.query(`SELECT TOP 1 DSGID as last_highest_value FROM Mx_DesignationMst ORDER BY DSGID DESC`);
                    let dsg_id = parseInt(get_dsgid_from_tna_db.recordset[0].last_highest_value)+1;
                    let db_response = await req.app.locals.db.query(`INSERT INTO Px_DesignationMst (Name, Position,TnaDesignationId) VALUES ('${designation_name}','${position}','${dsg_id}')`);
                    if(db_response && db_response.rowsAffected[0] > 0){
                        await sql.query(`INSERT INTO Mx_DesignationMst (Name,DSGCODE,DSGID,DFLTDSG) VALUES ('${designation_name}','${DSGCODE}','${dsg_id}',0)`);
                        await controllerLogger(req)
                        return res.status(200).json({status:"ok",error:""});
                    }else{
                        throw {message:"Failed to store in database server"};
                    }
                }
            } catch (error) {
                console.log("Error in addNewDesignation function : ",error)
                await controllerLogger(req,error)
                return res.status(200).json({status:"failed",error:error.message});
            } 
        }
    },
    addDesignationFromCSVToProxyDB:async(req, res)=>{
        try {
            const data = fs.readFileSync(path.join(__dirname,"..","..","csv",'designation',"designation44.csv"))
            parse(data,async(err, records)=>{
                if(err){
                    throw{ message: err};
                }  else{
                        const columns = records[0];
                        let failed =[];
                        let success = [];
                        const rows = await Promise.all(records.splice(1).map(async (arr)=>{
                            const obj = {};
                            columns.forEach((column, index)=>{
                                obj[column] = arr[index];
                            })
                            obj.designation = obj.designation?obj.designation.replace(/[^A-Za-z0-9-_.()\[\] ]/g,'').slice(0,45).trim():"Default Designation";
                            try {
                                let db_response = await req.app.locals.db.query(`INSERT INTO Px_DesignationMst (Name, Position) VALUES ('${ obj.designation}','${obj.position}')`);
                                if(db_response && db_response.rowsAffected[0] > 0){
                                    success.push({...obj,status:"Success"})
                                    return obj;
                                    
                                }else{
                                    failed.push( {...obj,status:"Failed"})
                                    return obj;
                                }
                            } catch (error) {
                                throw error 
                            }

                        }));

                        if(rows){
                            const failed_csv = new ObjectsToCsv(failed);
                            await failed_csv.toDisk(path.join(__dirname,"..","..","csv",'designation',"failed.csv"));
                            const success_csv = new ObjectsToCsv(success);
                            await success_csv.toDisk(path.join(__dirname,"..","..","csv",'designation',"success.csv"));
                            await controllerLogger(req)
                            return res.status(201).json({status:"ok",error:"",rows});
                        }
                }
            });

        } catch (error) {
            console.log("Error in addDesignationFromCSVToProxyDB function : ",error)
            await controllerLogger(req, error)
            return res.status(400).json({status:"failed",error:error.message});
        }
    },
    addDesignationsFromProxyToTNADB:async(req, res)=>{
        try {
            await sql.connect(`Server=${process.env.DB_SERVER};Database=${process.env.TNA_DB_NAME};User Id=${process.env.DB_USER};Password=${process.env.DB_PWD};Encrypt=true;TrustServerCertificate=true`)
            let all_designation_from_proxy = await req.app.locals.db.query(`SELECT * FROM Px_DesignationMst`);
            let all_designation_from_tna = await sql.query(`SELECT * FROM Mx_DesignationMst`);
            let proxy_designation_array = all_designation_from_proxy.recordset;
            let tna_designation_array = all_designation_from_tna.recordset;
            for(let i = 0; i<proxy_designation_array.length; i++){
                if(parseInt(proxy_designation_array[i].TnaDesignationId)){
                    continue;
                }
                if(tna_designation_array.length == 0){
                    let DSGCODE = generateCode();
                    let DSGID = 1;
                    tna_designation_array.push({Name:proxy_designation_array[i].Name, DSGCODE,DSGID});
                    let tna_db_response = await sql.query(`INSERT INTO Mx_DesignationMst (Name,DSGCODE,DSGID,DFLTDSG) VALUES ('${proxy_designation_array[i].Name}','${DSGCODE}','1',0)`);
                    let proxy_db_response = await req.app.locals.db.query(`UPDATE Px_DesignationMst SET TnaDesignationId='${DSGID}' WHERE Position='${proxy_designation_array[i].Position}'`);
                }else{
                    let item_found = null;
                    tna_designation_array.some(function(tnaItem) {
                        if(tnaItem.Name == proxy_designation_array[i].Name){
                            item_found = tnaItem;
                            return true;
                        }
                    });
                    if(item_found){
                        let proxy_db_response = await req.app.locals.db.query(`UPDATE Px_DesignationMst SET TnaDesignationId='${item_found.DSGID}' WHERE Position='${proxy_designation_array[i].Position}' `);
                    }
                    else{
                        let DSGCODE = generateCode();
                        let get_dsgid_from_tna_db = await sql.query(`SELECT TOP 1 DSGID as last_highest_value FROM Mx_DesignationMst ORDER BY DSGID DESC`);
                        let dsg_id = parseInt(get_dsgid_from_tna_db.recordset[0].last_highest_value)+1;
                        let tna_db_response = await sql.query(`INSERT INTO Mx_DesignationMst (Name,DSGCODE,DSGID,DFLTDSG) VALUES ('${proxy_designation_array[i].Name}','${DSGCODE}',${dsg_id},0)`);
                        let erp_db_response = await req.app.locals.db.query(`UPDATE Px_DesignationMst SET TnaDesignationId='${dsg_id}' WHERE Position='${proxy_designation_array[i].Position}'`);
                        tna_designation_array.push({Name:proxy_designation_array[i].Name, DSGCODE, DSGID:dsg_id});
                    }
                }
            }
            await controllerLogger(req)
            return res.status(201).json({status:"ok",error:""});
        } catch (error) {
            console.log("Error in addDesignationFromCSVToProxyDB function : ",error)
            await controllerLogger(req, error)
            return res.status(400).json({status:"failed",error:error.message});
        }
    },
    getDesignationHomePageData:async(req,res)=>{
        try {
            let db = req.app.locals.db;
            let {Name,Position,TnaDesignationId,page,size} = req.query;
            let firstRow = ((page-1) * size)+1
            let lastRow = page * size;
            let db_response = await db.query(`

                SELECT
                Subquery.*
                FROM(
                SELECT
                    Name,Position,TnaDesignationId, ROW_NUMBER() OVER (ORDER BY Position) AS RowNum
                FROM [TNA_PROXY].[dbo].[Px_DesignationMst]
                WHERE 
                    ('${Name}' IS NULL OR '${Name}'='' OR Name = '${Name}') AND
                    ('${Position}' IS NULL OR '${Position}'='' OR Position = '${Position}') AND
                    ('${TnaDesignationId}' IS NULL OR '${TnaDesignationId}'='' OR TnaDesignationId = '${TnaDesignationId}')
                    
                ) AS Subquery
                WHERE RowNum BETWEEN ${firstRow} AND ${lastRow}
            `)
            let totalCount = await db.query( `
                SELECT COUNT(*) AS TotalRowCount 
                FROM [TNA_PROXY].[dbo].[Px_DesignationMst] 
                WHERE 
                ('${Name}' IS NULL OR '${Name}'='' OR Name = '${Name}') AND
                ('${Position}' IS NULL OR '${Position}'='' OR Position = '${Position}') AND
                ('${TnaDesignationId}' IS NULL OR '${TnaDesignationId}'='' OR TnaDesignationId = '${TnaDesignationId}')
            `)
            let last_page = Math.ceil(totalCount.recordset[0].TotalRowCount / size);
            await controllerLogger(req)
            return res.status(200).json({status:"ok", last_page, data:db_response.recordset});
        } catch (error) {
            console.log("Error in getDesignationHomePageData function : ", error.message)
            await controllerLogger(req, error)
            return res.status(400).json({status:"not ok",error:error, data:""})
        }
    },
    downloadDesignationData:async(req,res)=>{
        try {
            let db = req.app.locals.db;
            let {Name,Position,TnaDesignationId} = req.query;
            let db_response = await db.query(`
                SELECT
                    Name,Position,TnaDesignationId, ROW_NUMBER() OVER (ORDER BY Position) AS RowNum
                FROM [TNA_PROXY].[dbo].[Px_DesignationMst]
                WHERE 
                    ('${Name}' IS NULL OR '${Name}'='' OR Name = '${Name}') AND
                    ('${Position}' IS NULL OR '${Position}'='' OR Position = '${Position}') AND
                    ('${TnaDesignationId}' IS NULL OR '${TnaDesignationId}'='' OR TnaDesignationId = '${TnaDesignationId}')
            `)
            await controllerLogger(req)
            return res.status(200).json({status:"ok", data:db_response.recordset});
        } catch (error) {
            console.log("Error in downloadDesignationData function : ", error.message)
            await controllerLogger(req, error)
            return res.status(400).json({status:"not ok",error:error, data:""})
        }
    },
    linkDesignation:async(req,res)=>{
        try {
            let db = req.app.locals.db;
            let {Position,TnaDesignationId} = req.query;
            let designation_name_response = await db.query(`
                SELECT Name
                FROM [COSEC].[dbo].[Mx_DesignationMst]
                WHERE DSGID=${TnaDesignationId}
            `)
            let position_response = await db.query(`
                SELECT Name
                FROM [TNA_PROXY].[dbo].[Px_DesignationMst]
                WHERE Position = '${Position}';
            `)
            await controllerLogger(req)
            if(position_response.recordset[0]){
                throw{message:"Position Already Linked "};
            }
            if(!designation_name_response.recordset[0]){
                throw{message:"Designation not found in Biometric"};
            }
            let db_response = await db.query(`
                INSERT INTO [TNA_PROXY].[dbo].[Px_DesignationMst]
                (Name, Position,TnaDesignationId) 
                VALUES ('${designation_name_response.recordset[0].Name}','${Position}','${TnaDesignationId}');
            `)
           
            return res.status(200).json({status:"ok", data:"Linked successfully"});
           
        } catch (error) {
            console.log("Error in linkDesignation function : ", error.message)
            await controllerLogger(req, error)
            return res.status(200).json({status:"not ok",error:error, data:""})
        }
    }
}

module.exports = designationController
