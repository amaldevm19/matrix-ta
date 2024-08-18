
const EventEmitter = require('node:events');
const dbEventEmitter = new EventEmitter();
const {ProxyDbPool, sql} = require("../config/db");
const {postTransactionToERP} = require("./09_post_transaction");
const {updateTriggerSettingToNextMonth} = require("./05_transaction_trigger_date_builder");

let updateReadForERP_lock = {status:false};
let updateERPTransactionStatus_lock = {status:false};
let updateTransactionTriggerSettings_lock = {status:false};

let updateERPTransactionStatus_array = [];
let updateTransactionTriggerSettings_array = [];

/*
    Transaction process first check 
    await checkPendingCount({DepartmentId,UserCategoryId, FromDate, ToDate}) pendingCount
    await startERPTransaction({pendingCount,DepartmentId,UserCategoryId,FromDate, ToDate})
    updateTransactionTriggerSettings({Id,TriggerDate,FromDate, ToDate,DepartmentId,UserCategoryId})
*/
async function erp_transaction_process({
    Id,
    TriggerDate,
    DepartmentId,
    UserCategoryId,
    FromDate, 
    ToDate
}){
    let pendingCountObj = await checkPendingCount({
        DepartmentId, 
        UserCategoryId, 
        FromDate, 
        ToDate
    });
    if(pendingCountObj.pendingCount){
        let result = await startERPTransaction({
            Id,
            TriggerDate,
            pendingCount:pendingCountObj.pendingCount,
            FromDate,
            ToDate,
            DepartmentId,
            UserCategoryId
        })
        if (result.status == "ok") {
            invokeUpdateTransactionTriggerSettings({
                Id,
                TriggerDate,
                FromDate,
                ToDate,
                DepartmentId,
                UserCategoryId
            })
           
        } else {
          console.log(`Failed startERPTransaction in erpTransactionScheduler for DepartmentId ${DepartmentId},UserCategoryId ${UserCategoryId}`)
          return false;
        }
    }else{
        invokeUpdateTransactionTriggerSettings({
            Id,
            TriggerDate,
            FromDate,
            ToDate,
            DepartmentId,
            UserCategoryId
        })
    }
}
// Checks Pending Transaction count for a Department, Usercatgory, FromDate and ToDate
async function checkPendingCount({DepartmentId,UserCategoryId, FromDate, ToDate}) {
    try {
        await ProxyDbPool.connect();
        const request = new sql.Request(ProxyDbPool);
        const result = await request.query(`
        SELECT 
            COUNT(*) AS TotalCount
        FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
        WHERE 
        ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
        ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
        (('${FromDate}'='' AND '${ToDate}'='') OR TransDate BETWEEN '${FromDate}' AND '${ToDate}') AND
        SyncCompleted=0 AND Error=0 AND readForERP=0;
        `);
        let pendingCount = result.recordset[0].TotalCount;
        if(pendingCount){
            console.log("Pending count: ",pendingCount)
        }else{
            console.log(`No Pending Item for DepartmentId ${DepartmentId},UserCategoryId ${UserCategoryId}`)
        }
        return {pendingCount, error:false};
    } catch (error) {
        const message = `Error in checkPendingCount function : ${error.message}`;
        console.log(message);
    }
}

//Check DB Lock status and call updateTransactionTriggerSettings
function invokeUpdateTransactionTriggerSettings(data){
    if(check_db_lock_status(updateTransactionTriggerSettings_lock)) {
        updateTransactionTriggerSettings_array.push(data);
    }else{
        updateTransactionTriggerSettings(data);
    }
}

/*
    await getTimesheetFromERPTransactionMstTable({sendingCount, FromDate, ToDate, DepartmentId,UserCategoryId}
    postAndUpdateTransactionStatus(transactionData.data)
    awiat updateReadForERP({sendingCount,DepartmentId,UserCategoryId,FromDate, ToDate})
*/
async function startERPTransaction({pendingCount,DepartmentId,UserCategoryId,FromDate, ToDate}) {
    try {
        let sendingCount = pendingCount < 100 ? pendingCount : 100;
        while (pendingCount > 0) {    
            try {
                console.log(`Starting getTimesheetFromERPTransactionMstTable for ${sendingCount}`);
                let transactionData = await getTimesheetFromERPTransactionMstTable({sendingCount, FromDate, ToDate, DepartmentId,UserCategoryId});
                if(transactionData?.status == "ok"){
                    postAndUpdateTransactionStatus(transactionData.data)
                    // Wait for the lock to be released if it's currently locked
                    while (check_db_lock_status(updateReadForERP_lock)) {
                        await new Promise(resolve => setTimeout(resolve, 100)); // Polling every 100ms
                    }
                    await updateReadForERP({sendingCount, DepartmentId, UserCategoryId, FromDate, ToDate});
                    console.log(`Sending Count for Department : ${DepartmentId}`,sendingCount)
                    pendingCount -= sendingCount;
                    console.log(`New Pending Count for Department : ${DepartmentId}`,pendingCount)
                    if(pendingCount < sendingCount){
                        sendingCount = pendingCount;
                    }
                }else{
                    return {status:"not ok",data:"",error: transactionData.error}
                }
            } catch (error) {
                let message=`Error in startERPTransaction function : ${error.message}`;
                console.log(message)
                return {status:"not ok",data:"",error: error.message};
            } 

        }
        return {status:"ok",data:"",error:""};
    } catch (error) {
        let message=`Error in startERPTransaction function : ${error}`;
        console.log(message)
        return {status:"not ok",data:"",error: error};
    }

}

// getTimesheetFromERPTransactionMstTable gets the transaction 
async function getTimesheetFromERPTransactionMstTable({sendingCount,DepartmentId,UserCategoryId,FromDate, ToDate}){
    try {
        await ProxyDbPool.connect();
        const request = new sql.Request(ProxyDbPool);
        try {
            let result = await request.query(`
                SELECT TOP (${sendingCount})[HcmWorker_PersonnelNumber]
                ,CONVERT(NVARCHAR(10), TransDate, 120) AS TransDate
                ,[projId]
                ,[TotalHours]
                ,[CategoryId]
                FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
                WHERE 
                ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
                ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
                (('${FromDate}'='' AND '${ToDate}'='') OR TransDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                (SyncCompleted = 0 AND Error=0 AND readForERP = 0 );
            `);
            if(result?.recordset){
                let message = `Completed getting Transaction DepartmentId: ${DepartmentId},UserCategoryId: ${UserCategoryId}`;
                console.log(message)
                return {data:result.recordset, error:"",status:"ok", request}
            }else{
                let message = `No records found for DepartmentId: ${DepartmentId},UserCategoryId: ${UserCategoryId}`;
                console.log(message)
                return {data:"", error:message,status:"not ok"}
            }
        } catch (error) {
            let message =`Error in getTimesheetFromERPTransactionMstTable function : ${error}`;
            console.log(message)
            return {data:"", error:message,status:"not ok"}
        }
    } catch (error) {
        let message =`Error connecting to the database in getTimesheetFromERPTransactionMstTable function : ${error}`;
        console.log(message)
        return {data:"", error:message,status:"not ok"}
    }
}

// updateReadForERP updates DB rows ## DB-1 Write
async function updateReadForERP({sendingCount,DepartmentId,UserCategoryId,FromDate, ToDate}){
    updateReadForERP_lock.status = true;
    try {
        await ProxyDbPool.connect();
        const request = new sql.Request(ProxyDbPool);
        try {
            const db_response = await request.query(`
                UPDATE TOP (${sendingCount})
                [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
                SET readForERP = 1, SyncCompleted = 1
                WHERE 
                    ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId ? DepartmentId : 0}) AND
                    ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId ? UserCategoryId : 0}) AND
                    (('${FromDate}'='' AND '${ToDate}'='') OR TransDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                    (SyncCompleted = 0 AND Error = 0 AND readForERP = 0);
            `);
            if(db_response?.rowsAffected[0]){
                updateReadForERP_lock.status = false;
               return true
            }else{
                return false
            }
        } catch (error) {
            console.log(error.message)
            return false
           
        }
        
    } catch (error) {
        console.log(error.message)
        return false
    }

}

/*
    await postTransactionToERP(data);
    updateERPTransactionStatus(postingResult.data) 
*/
async function postAndUpdateTransactionStatus(data){
    let postingResult = await postTransactionToERP(data);
    if(postingResult.status == "ok"){
        if(check_db_lock_status(updateERPTransactionStatus_lock)) {
            updateERPTransactionStatus_array.push(postingResult.data);
        }else{
            updateERPTransactionStatus(postingResult.data);
        }
    }else{
        // Revert updateReadForERP 
    }
}


// Checked function ## DB-2 Write
async function updateERPTransactionStatus(postingResult) {
    updateERPTransactionStatus_lock.status = true;
    
    try {
        await ProxyDbPool.connect();
        let results = [];
        const message = `Starting updating [TNA_PROXY].[dbo].[Px_ERPTransactionStatusMst] with D365_response in updateERPTransactionStatus function`;
        console.log(message);
        const request = new sql.Request(ProxyDbPool);
        for (let index = 0; index < postingResult.length;) {
            const element = postingResult[index];
            let query = "";
            let updatedQuery = {}
            if (element.Error) {
                query = `
                    INSERT INTO [TNA_PROXY].[dbo].[Px_ERPTransactionStatusMst]
                    (HcmWorker_PersonnelNumber,TransDate,TotalHours,projId,Error,ErrorText, SyncCompleted) 
                    VALUES (
                        '${sanitizeInput(element.HcmWorker_PersonnelNumber)}',
                        '${element.TransDate.slice(0, 10)}',
                        '${element.TotalHours}',
                        '${sanitizeInput(element.ProjId)}',
                        1,
                        '${sanitizeInput(element.ErrorTxt)}',
                        0
                    )`;
                updatedQuery = {...element, SyncCompleted: 0}
            } else {
                query = `
                    INSERT INTO [TNA_PROXY].[dbo].[Px_ERPTransactionStatusMst]
                    (HcmWorker_PersonnelNumber,TransDate,TotalHours,projId,Error,ErrorText, SyncCompleted) 
                    VALUES (
                        '${sanitizeInput(element.HcmWorker_PersonnelNumber)}',
                        '${element.TransDate.slice(0, 10)}',
                        '${element.TotalHours}',
                        '${sanitizeInput(element.ProjId)}',
                        0,
                        '',
                        1
                    )`;
                updatedQuery = {...element, SyncCompleted: 1}
            }
            try {
                let db_response = await request.query(query);
                if(db_response?.rowsAffected[0]){
                    results.push(updatedQuery);
                    index++;
                }
            } catch (error) {
                let message = `Error in updating status for HcmWorker_PersonnelNumber: ${element.HcmWorker_PersonnelNumber} and Message: ${error.message}`;
                console.log(message);
            }
           
        }

        if(results){
            const completionMessage = `Completed updating [TNA_PROXY].[dbo].[Px_ERPTransactionStatusMst] with D365_response in updateERPTransactionStatus function`;
            console.log(completionMessage);
            console.log(results);
            dbEventEmitter.emit("updateERPTransactionStatus_unlock")
            return { data: results, error: "", status: "ok" };
        }
    
    } catch (error) {
        const connectionErrorMessage = `Error connecting to the database in updateERPTransactionStatus function: ${error}`;
        console.log(connectionErrorMessage);
        return { data: "", error: error, status: "not ok" };
    }
    
}

// updateTransactionTriggerSettings Updates TransactionTriggerSettings ## DB-3 Write
async function updateTransactionTriggerSettings({Id,TriggerDate,FromDate, ToDate,DepartmentId,UserCategoryId}){
    updateTransactionTriggerSettings_lock.status = true;
    try {
        await ProxyDbPool.connect();
        const request = new sql.Request(ProxyDbPool);
        let{updatedTriggerDate,updatedFromDate,updatedToDate} = updateTriggerSettingToNextMonth({TriggerDate,FromDate, ToDate})
        let db_response = await request.query(`
        UPDATE [TNA_PROXY].[dbo].[Px_TransTriggerMst] 
        SET TriggerDate='${updatedTriggerDate}', FromDate='${updatedFromDate}', ToDate='${updatedToDate}'
        WHERE Id=${Id} AND DepartmentId='${DepartmentId}' AND UserCategoryId = '${UserCategoryId}'
        `);
        if(db_response?.rowsAffected){
            let message=`Successfully Updated Transaction TriggerTime for Department:${DepartmentId} and User Category:${UserCategoryId} in updateTransactionTriggerSettings function TriggerDate:${updatedTriggerDate} From:${updatedFromDate} To:${updatedToDate}`;
            console.log(message)
            dbEventEmitter.emit('updateTransactionTriggerSettings_unlock')
            return true;
        }
    } catch (error) {
        let message=`Error in updating Transaction TriggerTime for Department:${DepartmentId} and User Category:${UserCategoryId} in updateTransactionTriggerSettings function: ${error.message}`;
        console.log(message)
        return false; 
    }
}

function sanitizeInput(input) {
    if(!input){
        return '';
    }
    // Use a regular expression to remove characters other than a-zA-Z0-9 and hyphen (-)
    return input.trim().replace(/[^a-zA-Z0-9-]/g, '');
}


const check_db_lock_status = function(dblock){
    return dblock.status;
}

dbEventEmitter.on('updateERPTransactionStatus_unlock',()=>{
    updateERPTransactionStatus_lock.status = false;
    if(updateERPTransactionStatus_array.length > 0){
        let data = updateERPTransactionStatus_array.shift()
        updateERPTransactionStatus(data);
    }else{
        console.log(`Done All updateERPTransactionStatus(postingResult.data) pending jobs`)
    }
})

dbEventEmitter.on('updateTransactionTriggerSettings_unlock',()=>{
    updateTransactionTriggerSettings_lock.status = false;
    if(updateTransactionTriggerSettings_array.length > 0){
        let data = updateTransactionTriggerSettings_array.shift()
        updateTransactionTriggerSettings(data);
    }else{
        console.log(`Done All updateTransactionTriggerSettings(data) pending jobs`)
    }
})

module.exports = {erp_transaction_process};