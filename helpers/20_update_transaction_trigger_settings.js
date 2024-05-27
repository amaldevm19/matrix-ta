const {ProxyDbPool, sql} = require("../config/db")
const {MiddlewareHistoryLogger,EventCategory,EventType,EventStatus} = require("../helpers/19_middleware_history_logger");
const {updateTriggerSettingToNextMonth} = require("./05_transaction_trigger_date_builder");

const updateTransactionTriggerSettings = async function({Id,TriggerDate,FromDate, ToDate,DepartmentId,UserCategoryId, request}){
    try {
        //await ProxyDbPool.connect();
        //const request = new sql.Request(ProxyDbPool);
        try {
            let{updatedTriggerDate,updatedFromDate,updatedToDate} = updateTriggerSettingToNextMonth({TriggerDate,FromDate, ToDate})
            let db_response = await request.query(`
            UPDATE [TNA_PROXY].[dbo].[Px_TransTriggerMst] 
            SET TriggerDate='${updatedTriggerDate}', FromDate='${updatedFromDate}', ToDate='${updatedToDate}'
            WHERE Id=${Id} AND DepartmentId='${DepartmentId}' AND UserCategoryId = '${UserCategoryId}'
            `);
            if(db_response?.rowsAffected){
                let message=`Successfully Updated Transaction TriggerTime for Department:${DepartmentId} and User Category:${UserCategoryId} in updateTransactionTriggerSettings function TriggerDate:${updatedTriggerDate} From:${updatedFromDate} To:${updatedToDate}`;
                console.log(message)
                await MiddlewareHistoryLogger({EventType:EventType.INFORMATION,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.COMPLETED,EventText:String(message)});
                return;
            }
        } catch (error) {
            let message=`Error in updating Transaction TriggerTime for Department:${DepartmentId} and User Category:${UserCategoryId} in updateTransactionTriggerSettings function: ${error.message}`;
            console.log(message)
            await MiddlewareHistoryLogger({EventType:EventType.ERROR,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.FAILED,EventText:String(message)})
            return; 
        }
    } catch (error) {
        let message=`Failed to connect DB in erpTransactionScheduler function : ${error.message}`;
        console.log(message)
        await MiddlewareHistoryLogger({EventType:EventType.ERROR,EventCategory:EventCategory.DB,EventStatus:EventStatus.FAILED,EventText:String(message)})
        return;
    }
}
module.exports = {updateTransactionTriggerSettings}