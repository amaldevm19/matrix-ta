const {transactionForNonStaffMethod, transactionForStaffMethod} = require('../../helpers/scheduler');
const postTransaction = require("../../helpers/post_transaction");
const postSingleTransaction = require("../../helpers/post_single_transaction");
const PushD365ResponseToProxyDB = require("../../helpers/push_to_proxy_db");


const transApiController = {
    getTransactionStatus:async(req, res)=>{
        try {
            let transaction_status_response = await req.app.locals.db.query(`SELECT * FROM Px_TransactionMst`);
            if(transaction_status_response?.recordset.length > 0){
                let transactions = transaction_status_response.recordset;
                res.status(200).json({data:transactions,status:"ok",error:""});
            }else{
                throw {message:"Could not find any Transactions"}
            }
        } catch (error) {
            res.status(400).json({data:"",status:"failed",error:error.message});
        }
    },
    getFailedTransaction:async(req, res)=>{
        let TransactionId = req.params.TransactionId;
        try {
            let failed_transaction_response = await req.app.locals.db.query(`SELECT * FROM Px_FailedTransactionMst WHERE TransactionId='${TransactionId}'`);
            if(failed_transaction_response?.recordset.length > 0){
                let transactions = failed_transaction_response.recordset;
                res.status(200).json({data:transactions,status:"ok",error:""});
            }else{
                throw {message:"Could not find any Transactions"}
            }
        } catch (error) {
            res.status(400).json({data:"",status:"failed",error:error.message});
        }
    },
    addTransactionTrigger:async (req, res)=>{
        const {staffTrigger,staffFrom,staffTo,nonstaffTrigger,nonstaffFrom,nonstaffTo} = req.body;
        try {
            let staff_db_response = await req.app.locals.db.query(`UPDATE Px_TransTriggerMst SET TransactionTrigger='${dateCleanerForSqlDateTime(staffTrigger)}', FromDate='${dateCleanerForSqlDateTime(staffFrom)}',ToDate='${dateCleanerForSqlDateTime(staffTo)}' WHERE EmployeeCategory='Staff'`)
            let nonstaff_db_response = await req.app.locals.db.query(`UPDATE Px_TransTriggerMst SET TransactionTrigger='${dateCleanerForSqlDateTime(nonstaffTrigger)}', FromDate='${dateCleanerForSqlDateTime(nonstaffFrom)}',ToDate='${dateCleanerForSqlDateTime(nonstaffTo)}' WHERE EmployeeCategory='Non-Staff'`)
            if(staff_db_response?.rowsAffected[0] > 0 && nonstaff_db_response?.rowsAffected[0] > 0 ){
                let nonStaffTransaction = await transactionForNonStaffMethod(true);
                let staffTransactionForStaff = await transactionForStaffMethod(true);
                res.status(200).json({status:"ok",error:"",data:""})
            }else{
                throw {message:"Failed to update transaction trigger"}
            }
        } catch (error) {
            res.status(400).json({status:"failed",error:error.message,data:""})
        }
    },
    retriggerTrans:async(req, res)=>{
        let id = req.params.id;
        try {
            let last_failed_id = await req.app.locals.db.query(`SELECT * FROM Px_TransactionMst WHERE TransactionId=${id}`)
            if(last_failed_id?.recordset.length){
                let EmployeeCategory = last_failed_id.recordset[0].EmployeeCategory;
                let toDay = new Date().toISOString().replace("T"," ").replace("Z","");
                let FromDate = last_failed_id.recordset[0].FromDate;
                let ToDate = last_failed_id.recordset[0].ToDate;
                let fda = FromDate.toISOString().slice(0,10).split("-");
                let tda = ToDate.toISOString().slice(0,10).split("-");
                let date_range = `${fda[2]}${fda[1]}${fda[0]}-${tda[2]}${tda[1]}${tda[0]}`;
                let D365_response = await postTransaction(EmployeeCategory,date_range);
                if(D365_response.status == "ok"){
                    //Change trsaction row status to success
                    let rsr = await req.app.locals.db.query(`UPDATE Px_TransactionMst SET TransactionStatus=1,TransactionFailCount=0, ErrorText='Reintiated this transaction', TransactionDate='${toDay}' WHERE TransactionId=${id}`)
                    let push_response = await PushD365ResponseToProxyDB(D365_response,EmployeeCategory,date_range);
                    if(push_response.status=="ok"){
                        res.status(200).json({status:"ok",error:"",data:""});
                    }else{
                        throw {message:push_response.error}
                    }
                }else{
                    throw {message:D365_response.error}
                }
            }else{
                throw {message:"Couldn't find the last failed transaction"}
            }
        } catch (error) {
            res.status(400).json({status:"failed",error:error.message,data:""});
        }
    },
    manualTriggerTrans:async(req, res)=>{
        try {
            let {employee_id, from_date,to_date} = req.body;
            let fda = from_date.split("-");
            let tda = to_date.split("-");
            let date_range = `${fda[2]}${fda[1]}${fda[0]}-${tda[2]}${tda[1]}${tda[0]}`;
            let D365_response = await postSingleTransaction(employee_id,date_range);
            if(D365_response.status == "ok"){
                res.status(200).json({status:"ok",error:"",data:D365_response.data})
            }else{
                throw {data:D365_response.data,message:D365_response.error}
            }
        } catch (error) {
            res.status(200).json({status:"failed",error:error.message,data:error.data});
        }
    }
}

module.exports=transApiController;


function dateCleanerForSqlDateTime(date) {
    return new Date(date).toISOString().replace("T"," ").replace("Z","")
}
