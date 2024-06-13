const cron = require('node-cron');

const {ProxyDbPool, sql} = require("../config/db");
const {PxERPTransactionTableBuilder} = require("./04_erp_transaction_copier");
const {ERPTransactionTriggerDateBuilder} = require("./05_transaction_trigger_date_builder");
const {MiddlewareHistoryLogger,EventCategory,EventType,EventStatus} = require("../helpers/19_middleware_history_logger");


async function PxERPTransactionTableBuilderScheduler() {
    try {
        await ProxyDbPool.connect();
        const request = new sql.Request(ProxyDbPool);
        let PxERPTransactionTableBuilderScheduler = cron.schedule('10,30,50 * * * *',async function (request) {
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
        
                let { FromDate, ToDate } = ERPTransactionTriggerDateBuilder(sqlData);
                let message=`Started copying timesheet from [COSEC].[dbo].[Px_TimesheetMst] to [TNA_PROXY].[dbo].[Px_ERPTransactionMst] for Department:${DepartmentId} and User Category:${UserCategoryId} in PxERPTransactionTableBuilder function From ${FromDate} To ${ToDate}`;
                console.log(message);
                await MiddlewareHistoryLogger({EventType:EventType.INFORMATION,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.STARTED,EventText:String(message)})
                let result = await PxERPTransactionTableBuilder({FromDate, ToDate,DepartmentId,UserCategoryId});
                if(result.status == 'ok'){
                    let message=`Successfully copied timesheet from [COSEC].[dbo].[Px_TimesheetMst] to [TNA_PROXY].[dbo].[Px_ERPTransactionMst] for Department:${DepartmentId} and User Category:${UserCategoryId} in PxERPTransactionTableBuilder function From ${FromDate} To ${ToDate}`;
                    console.log(message)
                    await MiddlewareHistoryLogger({EventType:EventType.INFORMATION,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.COMPLETED,EventText:String(message)}) 
                    return;
                }else{
                    throw result.error;
                }
            }
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