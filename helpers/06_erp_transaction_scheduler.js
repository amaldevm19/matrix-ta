const cron = require("node-cron");
const { ProxyDbPool, sql } = require("../config/db");
const { ERPTransactionTriggerDateBuilder} = require("./05_transaction_trigger_date_builder");
const { startERPTransaction, checkPendingCount} = require("./08_erp_transaction_process");
const {MiddlewareHistoryLogger,  EventCategory, EventType, EventStatus} = require("../helpers/19_middleware_history_logger");
const { updateTransactionTriggerSettings } = require("../helpers/20_update_transaction_trigger_settings");
  
async function erpTransactionScheduler() {
  try {
    let erpTransSchedule = cron.schedule('0 * * * *',async function () {
      try {
        await ProxyDbPool.connect();
        const request = new sql.Request(ProxyDbPool);
        let db_response = await request.query(`
          SELECT * 
          FROM [TNA_PROXY].[dbo].[Px_TransTriggerMst] 
          WHERE Status=1
        `);
        if(db_response?.recordset){
          for (let index = 0; index < db_response.recordset.length; index++) {
            const element = db_response.recordset[index];
            let sqlData = {
              TriggerDate: element.TriggerDate,
              FromDate: element.FromDate,
              ToDate: element.ToDate,
            };
            let DepartmentId=element.DepartmentId
            let UserCategoryId = element.UserCategoryId
            let Id = element.Id

            let { TriggerDate, TriggerHour, TriggerMinute, FromDate, ToDate, CurrentDate, CurrentHour } = ERPTransactionTriggerDateBuilder(sqlData);
            if((TriggerDate==CurrentDate) && (TriggerHour==CurrentHour)){
              let message = `Starting ERP Synchronization for Department:${DepartmentId} and User Category:${UserCategoryId} in erpTransactionScheduler function From ${FromDate} To ${ToDate}`;
              console.log(message);
              await MiddlewareHistoryLogger({
                EventType: EventType.INFORMATION,
                EventCategory: EventCategory.SYSTEM,
                EventStatus: EventStatus.STARTED,
                EventText: String(message),
              });
              let pendingCount = await checkPendingCount({
                DepartmentId,
                UserCategoryId,
                FromDate,
                ToDate,
              });
              let result = await startERPTransaction({
                FromDate,
                ToDate,
                DepartmentId,
                UserCategoryId,
                pendingCount,
              });
              if (result.status == "ok") {
                let updateTransactionTriggerSettingsStatus = await updateTransactionTriggerSettings({
                  Id,
                  TriggerDate,
                  FromDate,
                  ToDate,
                  DepartmentId,
                  UserCategoryId
                });
                if(updateTransactionTriggerSettingsStatus){
                  let message = `Failed to update Transaction Trigger Settings for Department:${DepartmentId} and User Category:${UserCategoryId} in erpTransactionScheduler function From ${FromDate} To ${ToDate}`;
                  console.log(message)
                }
                let message = `Successfully completed ERP synchronization for Department:${DepartmentId} and User Category:${UserCategoryId} in erpTransactionScheduler function From ${FromDate} To ${ToDate}`;
                console.log(message);
                await MiddlewareHistoryLogger({
                  EventType: EventType.INFORMATION,
                  EventCategory: EventCategory.SYSTEM,
                  EventStatus: EventStatus.COMPLETED,
                  EventText: String(message),
                });
                return;
              } else {
                throw result.error;
              }
            }
          }
        }
      } catch (error) {
        let message = `Error in erpTransactionScheduler function : ${error.message}`;
        console.log(message)
      }
    })
    let message = `Successfully Scheduled Erp Transaction`;
    console.log(message);
    await MiddlewareHistoryLogger({
      EventType: EventType.INFORMATION,
      EventCategory: EventCategory.SYSTEM,
      EventStatus: EventStatus.SUCCESS,
      EventText: String(message),
    });
    return erpTransSchedule;
  }catch(error){
    let message = `Error in erpTransactionScheduler function : ${error.message}`;
    console.log(message);
    await MiddlewareHistoryLogger({
      EventType: EventType.ERROR,
      EventCategory: EventCategory.SYSTEM,
      EventStatus: EventStatus.FAILED,
      EventText: String(message),
    });
    return null;
  }
}

module.exports = { erpTransactionScheduler};
