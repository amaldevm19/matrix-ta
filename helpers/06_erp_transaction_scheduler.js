const cron = require("node-cron");
const { ProxyDbPool, sql } = require("../config/db");
const { ERPTransactionTriggerDateBuilder} = require("./05_transaction_trigger_date_builder");
const {MiddlewareHistoryLogger,  EventCategory, EventType, EventStatus} = require("../helpers/19_middleware_history_logger");
const {startERPTransactionAndUpdateERPTransactionSetting} = require("./08_erp_transaction_process");
async function erpTransactionScheduler() {
  let started = []
  try {
    let erpTransSchedule = cron.schedule(process.env.ERP_TRANSACTION_CRON_STRING,async function () {
      try {
        let message = `Starting ERP Synchronization`
        console.log(message)
        await ProxyDbPool.connect();
        const request = new sql.Request(ProxyDbPool);
        let db_response = await request.query(`
          SELECT * 
          FROM [TNA_PROXY].[dbo].[Px_TransTriggerMst] 
          WHERE Status=1
        `);
        if (db_response?.recordset) {
          try {
            const promises = db_response.recordset.map(async (element) => {
              let sqlData = {
                TriggerDate: element.TriggerDate,
                FromDate: element.FromDate,
                ToDate: element.ToDate,
              };
              let DepartmentId=element.DepartmentId
              let UserCategoryId = element.UserCategoryId
              let Id = element.Id
  
              let { triggerMonth, TriggerDate, TriggerHour, TriggerMinute, FromDate, ToDate, CurrentDate, CurrentHour,CurrentMonth } = ERPTransactionTriggerDateBuilder(sqlData);
              //console.log(triggerMonth, TriggerDate, TriggerHour, TriggerMinute, FromDate, ToDate, CurrentMonth, CurrentDate, CurrentHour )
              if((TriggerDate==CurrentDate) && (triggerMonth == CurrentMonth) && (TriggerHour<=CurrentHour)){
                if(started.indexOf(Id)>=0){
                  console.log("startERPTransaction Already started")
                  return;
                }else{
                  started.push(Id)
                  let result = await startERPTransactionAndUpdateERPTransactionSetting({Id,TriggerDate,DepartmentId,UserCategoryId,FromDate, ToDate}); 
                  if(result){
                    started.splice(started.indexOf(Id),1)
                  }else{
                    started.splice(started.indexOf(Id),1)
                  }
                  
                }
              }
            });
            await Promise.all(promises);
          } catch (error) {
            console.log(error.message)
          }
         
        }
        
      } catch (error) {
        let message = `Error in erpTransactionScheduler function : ${error.message}`;
        console.log(message)
      }
    })
    let message = `Successfully Scheduled Erp Transaction`;
    console.log(message);
    return erpTransSchedule;
  }catch(error){
    let message = `Error in erpTransactionScheduler function : ${error.message}`;
    console.log(message);
    return null;
  }
}


module.exports = { erpTransactionScheduler};
