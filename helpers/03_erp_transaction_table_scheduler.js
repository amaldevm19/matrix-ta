const cron = require('node-cron');

const {ProxyDbPool, sql} = require("../config/db");
const {PxERPTransactionTableBuilder} = require("./04_erp_transaction_copier");
const {ERPTransactionTriggerDateBuilder} = require("./05_transaction_trigger_date_builder");
const {MiddlewareHistoryLogger,EventCategory,EventType,EventStatus} = require("../helpers/19_middleware_history_logger");

let PxERPTransactionTableBuilderScheduleHandleArray = [];

async function PxERPTransactionTableBuilderScheduler(isRunning) {
    try {
        await ProxyDbPool.connect();
        const request = new sql.Request(ProxyDbPool);
        if(isRunning){
            PxERPTransactionTableBuilderScheduleHandleArray = []
        }
        try {
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
                        ToDate: element.ToDate
                    }
                    let {TriggerDate,TriggerHour,TriggerMinute, FromDate, ToDate} = ERPTransactionTriggerDateBuilder(sqlData);

                    TriggerDate = TriggerHour < 2 ? TriggerDate-1:TriggerDate
                    TriggerHour = TriggerHour < 2 ? 23:TriggerHour-2;
                    
                    let PxERPTransactionTableBuilderScheduleHandle = cron.schedule(`${TriggerMinute} ${TriggerHour} ${TriggerDate} * *`, async () => {
                        try {
                            await ProxyDbPool.connect();
                            const request = new sql.Request(ProxyDbPool);
                            let db_response = await request.query(`
                            SELECT TOP (1) *
                            FROM [TNA_PROXY].[dbo].[Px_TransTriggerMst] 
                            WHERE Status=1 AND DepartmentId='${element.DepartmentId}' AND UserCategoryId = '${element.UserCategoryId}'
                            `);
                            if(db_response?.recordset){
                                let {FromDate, ToDate,DepartmentId,UserCategoryId } = db_response.recordset[0];
                                FromDate = new Date(FromDate).toISOString().replace("T"," ").replace("Z","");
                                ToDate = new Date(ToDate).toISOString().replace("T"," ").replace("Z","");
                                let message=`Started copying timesheet from [COSEC].[dbo].[Px_TimesheetMst] to [TNA_PROXY].[dbo].[Px_ERPTransactionMst] for Department:${DepartmentId} and User Category:${UserCategoryId} in PxERPTransactionTableBuilder function From ${FromDate} To ${ToDate}`;
                                console.log(message);
                                await MiddlewareHistoryLogger({EventType:EventType.INFORMATION,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.STARTED,EventText:String(message)})
                                let result = await PxERPTransactionTableBuilder({FromDate, ToDate,DepartmentId,UserCategoryId,request});
                                if(result.status == 'ok'){
                                    let message=`Successfully copied timesheet from [COSEC].[dbo].[Px_TimesheetMst] to [TNA_PROXY].[dbo].[Px_ERPTransactionMst] for Department:${DepartmentId} and User Category:${UserCategoryId} in PxERPTransactionTableBuilder function From ${FromDate} To ${ToDate}`;
                                    console.log(message)
                                    await MiddlewareHistoryLogger({EventType:EventType.INFORMATION,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.COMPLETED,EventText:String(message)}) 
                                    return;
                                }else{
                                    throw result.error;
                                }
                            }
                        } catch (error) {
                            let message=`Error in copying timesheet from [COSEC].[dbo].[Px_TimesheetMst] to [TNA_PROXY].[dbo].[Px_ERPTransactionMst] for Department:${element.DepartmentId} and User Category:${element.UserCategoryId} From ${FromDate} To ${ToDate}; Error in PxERPTransactionTableBuilder : ${error.message}`;
                            console.log(message)
                            await MiddlewareHistoryLogger({EventType:EventType.ERROR,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.FAILED,EventText:String(message)})
                            return; 
                        }
                    })
                    let message = `Successfully Scheduled PxERPTransactionTableBuilder to copy timesheet from [COSEC].[dbo].[Px_TimesheetMst] to [TNA_PROXY].[dbo].[Px_ERPTransactionMst] for Department:${element.DepartmentId} and User Category:${element.UserCategoryId}; 
                    The batch job will run on Every month ${TriggerDate}th at ${TriggerHour}:${TriggerMinute} ${TriggerHour<12?"AM":"PM"} for FromDate : ${FromDate} to ToDate : ${ToDate};
                    `
                    console.log(message)
                    await MiddlewareHistoryLogger({EventType:EventType.INFORMATION,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.SUCCESS,EventText:String(message)}) 
                    PxERPTransactionTableBuilderScheduleHandleArray.push(PxERPTransactionTableBuilderScheduleHandle)
                }
                return PxERPTransactionTableBuilderScheduleHandleArray;
            }
        } catch (error) {
            let message=`Error in PxERPTransactionTableBuilderScheduler function : ${error.message}`;
            console.log(message)
            await MiddlewareHistoryLogger({EventType:EventType.ERROR,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.FAILED,EventText:String(message)})
            return;
        }
    } catch (error) {
        let message=`Failed to connect DB in PxERPTransactionTableBuilderScheduler : ${error.message}`;
        console.log(message)
        await MiddlewareHistoryLogger({EventType:EventType.ERROR,EventCategory:EventCategory.DB,EventStatus:EventStatus.FAILED,EventText:String(message)})
        return;
    }
}


module.exports = {PxERPTransactionTableBuilderScheduler, PxERPTransactionTableBuilderScheduleHandleArray};