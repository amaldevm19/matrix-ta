const {ProxyDbPool, sql} = require("../config/db");

let {getTimesheetFromERPTransactionMstTable,updateERPTransactionStatus,updateReadForERP} = require("./04_erp_transaction_copier");
const {postTransactionToERP} = require("./09_post_transaction");
const {MiddlewareHistoryLogger,EventCategory,EventType,EventStatus} = require("../helpers/19_middleware_history_logger");
const {updateTriggerSettingToNextMonth} = require("./05_transaction_trigger_date_builder");



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

// let db_lock = false;
// let updateReadForERPQue = []
// async function startERPTransaction(obj) {
//     try {
//         console.log(`Starting getTimesheetFromERPTransactionMstTable for streaming data`);
//         //obj.eventEmitter= eventEmitter;
//         let stream = await getTimesheetFromERPTransactionMstTable(obj);
//         let transactionData = [];
//         let firstRow = true;
//         stream.on('row', async (row) => {
//             if(firstRow){
//                 stream.pause();
//                 firstRow=false;
//                 obj.stream = stream;
//                 await updateReadForERP(obj);
//             }
//             try {
//                 transactionData.push(row)
//                 if(transactionData.length >= 100){
//                     stream.pause()
//                     const postingResult = await postTransactionToERP([...transactionData]);
//                     transactionData.length=0;
//                     stream.resume()
//                     if (postingResult.status == "ok") {
//                         const updateERPTransactionStatusResult = await updateERPTransactionStatus(postingResult.data);
//                         if (updateERPTransactionStatusResult.status === "ok") {
//                             console.log(updateERPTransactionStatusResult.data)
//                             transactionData.length=0;
//                             stream.resume()
//                         }
//                     }
//                 }
                
//             } catch (error) {
//                 const message = `Error processing row in startERPTransaction function : ${error}`;
//                 console.log(message);
//                 await MiddlewareHistoryLogger({EventType:EventType.ERROR, EventCategory:EventCategory.SYSTEM, EventStatus:EventStatus.FAILED, EventText:String(message)});
//             }
//         });
//         let { DepartmentId, UserCategoryId} = obj
//         let result = await handleStreamCompletion(stream,transactionData,DepartmentId,UserCategoryId);
//         if(result?.status == 'ok'){
//             return result
//         }
        
//     } catch (error) {
//         const message = `Error in startERPTransaction function : ${JSON.stringify(error)}`;
//         console.log(message);
//         await MiddlewareHistoryLogger({EventType:EventType.ERROR, EventCategory:EventCategory.SYSTEM, EventStatus:EventStatus.FAILED, EventText:String(message)});
//         return { status: "not ok", data: "", error: error };
//     }
// }

async function startERPTransactionAndUpdateERPTransactionSetting({Id,TriggerDate,DepartmentId,UserCategoryId,FromDate, ToDate}){
    let pendingCountObj = await checkPendingCount({
        DepartmentId,
        UserCategoryId,
        FromDate,
        ToDate,
      });
      if(pendingCountObj.error){
        return false;
      }
      if(pendingCountObj.pendingCount){
        let result = await startERPTransaction({Id,TriggerDate,pendingCount:pendingCountObj.pendingCount,FromDate,ToDate,DepartmentId,UserCategoryId})
        if (result.status == "ok") {
            for(let x in result.data){
                console.log(result.data[x])
            }
          let updateTransactionTriggerSettingsStatus = await updateTransactionTriggerSettings({
            Id,
            TriggerDate,
            FromDate,
            ToDate,
            DepartmentId,
            UserCategoryId
          });
          if(!updateTransactionTriggerSettingsStatus){
            let message = `Failed to update Transaction Trigger Settings for Department:${DepartmentId} and User Category:${UserCategoryId} in erpTransactionScheduler function From ${FromDate} To ${ToDate}`;
            console.log(message)
          }else{
            let message = `Successfully completed ERP synchronization for Department:${DepartmentId} and User Category:${UserCategoryId} in erpTransactionScheduler function From ${FromDate} To ${ToDate}`;
            console.log(message);
            return true;
          }
        } else {
          console.log(`Failed startERPTransaction in erpTransactionScheduler for DepartmentId ${DepartmentId},UserCategoryId ${UserCategoryId}`)
          return false;
        }
      }else{
        console.log(`No Pending Item for DepartmentId ${DepartmentId},UserCategoryId ${UserCategoryId}`)
        let updateTransactionTriggerSettingsStatus = await updateTransactionTriggerSettings({
            Id,
            TriggerDate,
            FromDate,
            ToDate,
            DepartmentId,
            UserCategoryId
          });
          if(!updateTransactionTriggerSettingsStatus){
            let message = `Failed to update Transaction Trigger Settings for Department:${DepartmentId} and User Category:${UserCategoryId} in erpTransactionScheduler function From ${FromDate} To ${ToDate}`;
            console.log(message)
          }else{
            let message = `Successfully completed ERP synchronization for Department:${DepartmentId} and User Category:${UserCategoryId} in erpTransactionScheduler function From ${FromDate} To ${ToDate}`;
            console.log(message);
            return true;
          }
      }
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
        return {pendingCount, error:false};
    } catch (error) {
        const message = `Error in checkPendingCount function : ${error.message}`;
        console.log(message);
        return {pendingCount:0, error:true};
    }
}

async function startERPTransaction({pendingCount,DepartmentId,UserCategoryId,FromDate, ToDate}) {
    try {
        let pendingD365ResponseArray =[]
        let sendingCount = pendingCount < 100 ? pendingCount : 100;
        while (pendingCount > 0) {    
            try {
                console.log(`Starting getTimesheetFromERPTransactionMstTable for ${sendingCount}`);
                let updatingReadForERP = await updateReadForERP({sendingCount,DepartmentId,UserCategoryId,FromDate, ToDate})
                if(updatingReadForERP){
                    let transactionData = await getTimesheetFromERPTransactionMstTable({sendingCount, FromDate, ToDate, DepartmentId,UserCategoryId});
                    if(transactionData?.status == "ok"){
                        let updateERPTransactionStatusResult = await postAndUpdateTransactionStatus([...transactionData.data])
                        pendingD365ResponseArray.push(updateERPTransactionStatusResult)
                        console.log(`Pending Count for Department : ${DepartmentId}`,pendingCount)
                        console.log(`Sending Count for Department : ${DepartmentId}`,sendingCount)
                        pendingCount -= sendingCount;
                        if(pendingCount < sendingCount){
                            sendingCount = pendingCount;
                        }
                    }else{
                        return {status:"not ok",data:"",error: error}
                    }
                }

            } catch (error) {
                let message=`Error in startERPTransaction function : ${error}`;
                console.log(message)
                return {status:"not ok",data:"",error: error};
            } 

        }
        return {status:"ok",data:pendingD365ResponseArray,error:""};
    } catch (error) {
        let message=`Error in startERPTransaction function : ${error}`;
        console.log(message)
        return {status:"not ok",data:"",error: error};
    }

}
const updateTransactionTriggerSettings = async function({Id,TriggerDate,FromDate, ToDate,DepartmentId,UserCategoryId}){
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
            return true;
        }
    } catch (error) {
        let message=`Error in updating Transaction TriggerTime for Department:${DepartmentId} and User Category:${UserCategoryId} in updateTransactionTriggerSettings function: ${error.message}`;
        console.log(message)
        return false; 
    }
}

async function postAndUpdateTransactionStatus(data){
    let postingResult = await postTransactionToERP(data);
    if(postingResult.status == "ok"){
        let updateERPTransactionStatusResult = await updateERPTransactionStatus(postingResult.data)
        if(updateERPTransactionStatusResult.status = "ok"){
            return updateERPTransactionStatusResult.data;
        } 
    }
}
async function checkPendingCountAndStartERPSync({FromDate,ToDate,DepartmentId,UserCategoryId,pendingD365ResponseArray}){
    let newPendingCount = await checkPendingCount({DepartmentId,UserCategoryId,FromDate,ToDate,});
    if(newPendingCount.error){
        setTimeout(async ()=>{
            await checkPendingCountAndStartERPSync({FromDate,ToDate,DepartmentId,UserCategoryId,pendingD365ResponseArray})
        },1000)
    }else{
        if(newPendingCount.pendingCount > 0){
            await startERPTransaction({FromDate,ToDate,DepartmentId,UserCategoryId,pendingCount:newPendingCount,pendingD365ResponseArray});
        }else{
            return pendingD365ResponseArray
        }
    }
}



module.exports = {startERPTransaction,checkPendingCount,startERPTransactionAndUpdateERPTransactionSetting};