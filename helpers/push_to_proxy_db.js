
const {ProxyDbPool} = require("../config/db");


async function PushD365ResponseToProxyDB(D365_response,employee_category, date_range) {

    try {
        let proxy_db = await ProxyDbPool.connect()
        let failed_employees = [];
        const date = new Date();
        const offsetMs = date.getTimezoneOffset() * 60 * 1000;
        const localTime = date.getTime() - offsetMs;
        const localDate = new Date(localTime);
        let TransactionDate = localDate.toISOString().replace('T', ' ').replace('Z', '');
        let FromDate = date_range.split("-")[0];
        let ToDate = date_range.split("-")[1];
        FromDate = FromDate.substr(4, 4) + '-' + FromDate.substr(2, 2) + '-' + FromDate.substr(0, 2) + ' 00:00:00';
        ToDate = ToDate.substr(4, 4) + '-' + ToDate.substr(2, 2) + '-' + ToDate.substr(0, 2) + ' 00:00:00';
        if(D365_response.status =="ok"){
            for (let index = 0; index < D365_response.data.length; index++) {
                const element = D365_response.data[index];
                if(element.Error == true){
                    failed_employees.push(element);
                }
            }
        }else{
            let db_response = await proxy_db.query(`INSERT INTO Px_TransactionMst (TransactionDate, TransactionStatus,TransactionCount, TransactionFailCount, ErrorText, EmployeeCategory, FromDate, ToDate) VALUES ('${TransactionDate}','0','${D365_response.data}','${D365_response.data}','${D365_response.error}','${employee_category}','${FromDate}','${ToDate}')`);
            throw {message:"Failed to Post transaction to D365"}
        }
        if(Array.isArray(D365_response.data) && failed_employees.length > 0){
            try {
                let db_response = await proxy_db.query(`INSERT INTO Px_TransactionMst (TransactionDate, TransactionStatus,TransactionFailCount, EmployeeCategory, FromDate, ToDate, TransactionCount,ErrorText) VALUES ('${TransactionDate}','0','${failed_employees.length}','${employee_category}','${FromDate}','${ToDate}','${D365_response.data.length}','Transaction for some employees failed')`);
                if(!db_response && db_response.rowsAffected[0] == 0){
                    throw {message:"Failed to store the current transaction status to Px_TransactionMst"}
                }else{
                    let response = await proxy_db.query(`SELECT TOP 1 TransactionId as TransactionId FROM Px_TransactionMst ORDER BY TransactionId DESC`)
                    for (let index = 0; index < failed_employees.length; index++) {
                        const element = failed_employees[index];
                        await proxy_db.query(`INSERT INTO Px_FailedTransactionMst (EmployeeId, TransDate,ProjId, CategoryId, TotalHours, Error, ErrorTxt, TransactionId) VALUES ('${element.HcmWorker_PersonnelNumber}','${element.TransDate}','${element.ProjId}','${element.CategoryId}','${element.TotalHours}','${element.Error}','${element.ErrorTxt}','${response.recordset[0].TransactionId}')`);
                    }
                    return {status:"ok", error:"", data:failed_employees}
                }
            } catch (error) {
                return {status:"failed",data:"", error:error.message}
            }
        
        }else{
            try {
                let db_response = await proxy_db.query(`INSERT INTO Px_TransactionMst (TransactionDate, TransactionStatus,TransactionFailCount, EmployeeCategory, FromDate, ToDate, TransactionCount,ErrorText) VALUES ('${TransactionDate}','1','${failed_employees.length}','${employee_category}','${FromDate}','${ToDate}','${D365_response.data.length}','No Failed Transaction')`);
                if(!db_response && db_response.rowsAffected[0] == 0){
                    throw {message:"Failed to store the current transaction status to Px_TransactionMst"}
                }else{
                    return {status:"ok", error:"", data:D365_response.data}
                }
            } catch (error) {
                return {status:"failed",data:"", error:error.message}
            }
        
        }
    } catch (error) {
        return {status:"failed",data:"", error:error.message}
    }
    
}

module.exports = PushD365ResponseToProxyDB;