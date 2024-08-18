const cron = require("node-cron");
const { ProxyDbPool, sql } = require("../config/db");
const { ERPTransactionTriggerDateBuilder} = require("./05_transaction_trigger_date_builder");
const {erp_transaction_process} = require("./08_erp_transaction_process");

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
            const promises = db_response.recordset.map((element) => {
              let sqlData = {
                TriggerDate: element.TriggerDate,
                FromDate: element.FromDate,
                ToDate: element.ToDate,
              };
              let DepartmentId=element.DepartmentId
              let UserCategoryId = element.UserCategoryId
              let Id = element.Id
  
              let { triggerMonth, TriggerDate, TriggerHour, TriggerMinute, FromDate, ToDate, CurrentDate, CurrentHour,CurrentMonth, CurrentMinute  } = ERPTransactionTriggerDateBuilder(sqlData);
              if((TriggerDate==CurrentDate) && (triggerMonth == CurrentMonth) && (TriggerHour==CurrentHour) && (TriggerMinute==CurrentMinute)){
                if(started.indexOf(Id)>=0){
                  console.log("startERPTransaction Already started")
                  return;
                }else{
                  started.push(Id)
                  return erp_transaction_process({Id,TriggerDate:element.TriggerDate,DepartmentId,UserCategoryId,FromDate, ToDate}); 
                }
              }
            });
            if(promises.length > 0) await Promise.all(promises);  
          } catch (error) {
            console.log(error.message)
          } finally{
            started.length = 0;
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
