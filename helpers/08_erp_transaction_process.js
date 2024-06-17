const {ProxyDbPool, sql} = require("../config/db");

let {getTimesheetFromERPTransactionMstTable,updateERPTransactionStatus} = require("./04_erp_transaction_copier");
const {postTransactionToERP} = require("./09_post_transaction");
const {MiddlewareHistoryLogger,EventCategory,EventType,EventStatus} = require("../helpers/19_middleware_history_logger");
const events = require('events');
const eventEmitter = new events.EventEmitter();


/*
async function startERPTransaction({
    FromDate='', 
    ToDate='',
    EmployeeId='',
    JobCode='',
    DepartmentId='',
    UserCategoryId='',
    EmployeeCategoryId='',
    DesignationId='',
    SectionId='', 
    SyncCompleted=0,
    pendingCount,
    pendingD365ResponseArray=[]
}) {

    try {
        let sendingCount = pendingCount < 100 ? pendingCount : 100;
        while (pendingCount > 0) {    
            try {
                console.log(`Starting getTimesheetFromERPTransactionMstTable for ${sendingCount}`);
                let transactionData = await getTimesheetFromERPTransactionMstTable({
                    sendingCount, 
                    FromDate, 
                    ToDate, 
                    EmployeeId, 
                    JobCode,
                    DepartmentId,
                    UserCategoryId,
                    EmployeeCategoryId,
                    DesignationId,
                    SectionId,
                    SyncCompleted 
                });
                if(transactionData.status == "ok"){
                    let postingResult = await postTransactionToERP(transactionData.data);
                    if(postingResult.status == "ok"){
                        let updateERPTransactionStatusResult = await updateERPTransactionStatus(postingResult.data)
                        if(updateERPTransactionStatusResult.status = "ok"){
                            pendingD365ResponseArray.push(updateERPTransactionStatusResult.data)
                            console.log(`Pending Count for Department : ${DepartmentId}`,pendingCount)
                            console.log(`Sending Count for Department : ${DepartmentId}`,sendingCount)
                            pendingCount -= sendingCount;
                            if(pendingCount < sendingCount){
                                sendingCount = pendingCount;
                            }
                        } 
                    }  
                }
                
            } catch (error) {
                let message=`Error in startERPTransaction function : ${error}`;
                console.log(message)
                await MiddlewareHistoryLogger({EventType:EventType.ERROR,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.FAILED,EventText:String(message)})
            } 

        }
        let newPendingCount = await checkPendingCount({
            DepartmentId,
            UserCategoryId,
            FromDate,
            ToDate,
        });
        if(newPendingCount > 0){
            await startERPTransaction({
                FromDate,
                ToDate,
                DepartmentId,
                UserCategoryId,
                pendingCount:newPendingCount,
                pendingD365ResponseArray
              });
        }
        return {status:"ok",data:pendingD365ResponseArray,error:""};
    } catch (error) {
        let message=`Error in startERPTransaction function : ${error}`;
        console.log(message)
        await MiddlewareHistoryLogger({EventType:EventType.ERROR,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.FAILED,EventText:String(message)})
        return {status:"not ok",data:"",error: error};
    }

}
*/

let db_lock = false;
let updateReadForERPQue = []
async function startERPTransaction(obj) {
    try {
        console.log(`Starting getTimesheetFromERPTransactionMstTable for streaming data`);
        //obj.eventEmitter= eventEmitter;
        let stream = await getTimesheetFromERPTransactionMstTable(obj);
        let transactionData = [];
        let firstRow = true;
        stream.on('row', async (row) => {
            if(firstRow){
                stream.pause();
                firstRow=false;
                obj.stream = stream;
                await updateReadForERP(obj);
            }
            try {
                transactionData.push(row)
                if(transactionData.length >= 100){
                    stream.pause()
                    const postingResult = await postTransactionToERP([...transactionData]);
                    transactionData.length=0;
                    stream.resume()
                    if (postingResult.status == "ok") {
                        const updateERPTransactionStatusResult = await updateERPTransactionStatus(postingResult.data);
                        if (updateERPTransactionStatusResult.status === "ok") {
                            console.log(updateERPTransactionStatusResult.data)
                            transactionData.length=0;
                            stream.resume()
                        }
                    }
                }
                
            } catch (error) {
                const message = `Error processing row in startERPTransaction function : ${error}`;
                console.log(message);
                await MiddlewareHistoryLogger({EventType:EventType.ERROR, EventCategory:EventCategory.SYSTEM, EventStatus:EventStatus.FAILED, EventText:String(message)});
            }
        });
        let { DepartmentId, UserCategoryId} = obj
        let result = await handleStreamCompletion(stream,transactionData,DepartmentId,UserCategoryId);
        if(result?.status == 'ok'){
            return result
        }
        
    } catch (error) {
        const message = `Error in startERPTransaction function : ${JSON.stringify(error)}`;
        console.log(message);
        await MiddlewareHistoryLogger({EventType:EventType.ERROR, EventCategory:EventCategory.SYSTEM, EventStatus:EventStatus.FAILED, EventText:String(message)});
        return { status: "not ok", data: "", error: error };
    }
}

async function handleStreamCompletion(stream,transactionData,DepartmentId,UserCategoryId) {
    return new Promise((resolve, reject) => {
        stream.on('done', async () => {
            try {
                if(transactionData.length==0){
                    console.log(`Completed streaming data for Department ${DepartmentId} CategoryId ${UserCategoryId}`);
                    resolve({ status: "ok", data: "", error: "" });
                }
                const postingResult = await postTransactionToERP(transactionData);
                if (postingResult.status == "ok") {
                    const updateERPTransactionStatusResult = await updateERPTransactionStatus(postingResult.data);
                    if (updateERPTransactionStatusResult.status === "ok") {
                        console.log(updateERPTransactionStatusResult.data)
                        transactionData.length=0;
                        console.log(`Completed streaming data for Department ${DepartmentId} CategoryId ${UserCategoryId}`);
                        resolve({ status: "ok", data: "", error: "" });
                    }
                }
            } catch (error) {
                reject({ status: "not ok", data: null, error: error.message });
            }
        });
    });
}


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
        console.log("Pending count: ",pendingCount)
        return pendingCount;
    } catch (error) {
        const message = `Error in checkPendingCount function : ${error}`;
        console.log(message);
        await MiddlewareHistoryLogger({EventType:EventType.ERROR, EventCategory:EventCategory.SYSTEM, EventStatus:EventStatus.FAILED, EventText:String(message)});
    }
}

// eventEmitter.on("db-lock",()=>{
//     console.log("db locked for updateReadForERP")
//     db_lock = true
// })
// eventEmitter.on("db-unlock",async ()=>{
//     console.log("db unlocked for updateReadForERP")
//     if(!db_lock){
//         if(updateReadForERPQue.length > 0){
//             let obj = updateReadForERPQue.pop()
//             await updateReadForERP(obj);
//         }
//     }
    

// })

async function updateReadForERP({FromDate, ToDate, UserCategoryId, DepartmentId, stream}){
    try {
        // eventEmitter.emit("db-lock");
        await ProxyDbPool.connect();
        let request = new sql.Request(ProxyDbPool);
        let query = `
            UPDATE [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
            SET readForERP = 1
            WHERE 
                ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId ? DepartmentId : 0}) AND
                ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId ? UserCategoryId : 0}) AND
                (('${FromDate}'='' AND '${ToDate}'='') OR TransDate BETWEEN '${FromDate}' AND '${ToDate}') AND
                (SyncCompleted = 0 AND Error = 0 AND readForERP = 0);
        `
        let db_response = await request.query(query);
        // console.log(db_response)
        if(db_response?.rowsAffected[0]){
            // eventEmitter.emit("db-unlock");
            stream.resume();
        }
    } catch (error) {
        console.log(error)
    }

}

module.exports = {startERPTransaction,checkPendingCount,eventEmitter,db_lock};