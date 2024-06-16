const cron = require('node-cron');

const {ProxyDbPool, sql} = require("../config/db");
const {PxERPTransactionTableBuilder} = require("./04_erp_transaction_copier");
const {ERPTransactionTriggerDateBuilder} = require("./05_transaction_trigger_date_builder");
const {MiddlewareHistoryLogger,EventCategory,EventType,EventStatus} = require("../helpers/19_middleware_history_logger");


async function PxERPTransactionTableBuilderScheduler() {
    try {
        let PxERPTransactionTableBuilderScheduler = cron.schedule(process.env.ERP_TIMESHEET_CRON_STRING,async function () {
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
            
                    let { TriggerDate, TriggerHour, TriggerMinute, FromDate, ToDate, CurrentDate, CurrentHour } = ERPTransactionTriggerDateBuilder(sqlData);
                    if((TriggerDate==CurrentDate) && (TriggerHour==CurrentHour)){
                      continue;
                    }
                    let result = await PxERPTransactionTableBuilder({DepartmentId,UserCategoryId});
                    if(result.status == 'ok'){
                        //console.log(result.message)
                        await MiddlewareHistoryLogger({EventType:EventType.INFORMATION,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.COMPLETED,EventText:String(result.message)}) 
                    }
                }
              }
              let message = `Completed all PxERPTransactionTableBuilderScheduler`;
              console.log(message);
          } catch (error) {
            let message = `Error in PxERPTransactionTableBuilderScheduler function : ${error.message}`;
            console.log(message);
          }
        })
        let message = `Successfully Scheduled PxERPTransactionTableBuilderScheduler`;
        console.log(message);
        await MiddlewareHistoryLogger({
          EventType: EventType.INFORMATION,
          EventCategory: EventCategory.SYSTEM,
          EventStatus: EventStatus.SUCCESS,
          EventText: String(message),
        });
        return PxERPTransactionTableBuilderScheduler;
      }catch(error){
        let message = `Error in PxERPTransactionTableBuilderScheduler function : ${error.message}`;
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


module.exports = {PxERPTransactionTableBuilderScheduler};