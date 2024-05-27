const cron = require("node-cron");
const EventEmitter = require("node:events");
const callBackDoneEvent = new EventEmitter();

const { ProxyDbPool, sql } = require("../config/db");
const {
  ERPTransactionTriggerDateBuilder,
} = require("./05_transaction_trigger_date_builder");
const {
  startERPTransaction,
  checkPendingCount,
} = require("./08_erp_transaction_process");
const {
  MiddlewareHistoryLogger,
  EventCategory,
  EventType,
  EventStatus,
} = require("../helpers/19_middleware_history_logger");
const {
  updateTransactionTriggerSettings,
} = require("../helpers/20_update_transaction_trigger_settings");


let erpTransactionScheduleHandleArray = [];
// let callBackDoneArray = null;
// let totalCallback = 0;
// let cronJobStarted = false;
async function erpTransactionScheduler(isRunning) {
  try {
    await ProxyDbPool.connect();
    const request = new sql.Request(ProxyDbPool);
    if (isRunning) {
      erpTransactionScheduleHandleArray = [];
    }
    try {
      let db_response = await request.query(`
            SELECT * 
            FROM [TNA_PROXY].[dbo].[Px_TransTriggerMst] 
            WHERE Status=1
            `);
      if (db_response?.recordset) {
        // totalCallback = db_response.recordset.length;
        // callBackDoneArray = [];
        for (let index = 0; index < db_response.recordset.length; index++) {
          const element = db_response.recordset[index];
          let sqlData = {
            TriggerDate: element.TriggerDate,
            FromDate: element.FromDate,
            ToDate: element.ToDate,
          };
          let { TriggerDate, TriggerHour, TriggerMinute, FromDate, ToDate } = ERPTransactionTriggerDateBuilder(sqlData);
          let erpTransactionScheduleHandle = cron.schedule(
            `${TriggerMinute} ${TriggerHour} ${TriggerDate} * *`,
            async () => {
                /*
                let thisJob = false;
                while(!thisJob){
                    if(!cronJobStarted){
                        callBackDoneEvent.emit("cron job started");
                        cronJobStarted = true;
                        thisJob = true;
                    }
                }
                callBackDoneEvent.on("cron job started", async ()=>{
                    if(thisJob){
                        
                    }
                });
                */
                try {
                    await ProxyDbPool.connect();
                    const request = new sql.Request(ProxyDbPool);
                    let db_response = await request.query(`
                                SELECT TOP (1) *
                                FROM [TNA_PROXY].[dbo].[Px_TransTriggerMst] 
                                WHERE Status=1 AND DepartmentId='${element.DepartmentId}' AND UserCategoryId = '${element.UserCategoryId}'
                                `);
                    if (db_response?.recordset) {
                      let {
                        Id,
                        TriggerDate,
                        FromDate,
                        ToDate,
                        DepartmentId,
                        UserCategoryId,
                      } = db_response.recordset[0];
                      FromDate = new Date(FromDate)
                        .toISOString()
                        .replace("T", " ")
                        .replace("Z", "");
                      ToDate = new Date(ToDate)
                        .toISOString()
                        .replace("T", " ")
                        .replace("Z", "");
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
                        // cronJobStarted = false;
                        await updateTransactionTriggerSettings({
                          Id,
                          TriggerDate,
                          FromDate,
                          ToDate,
                          DepartmentId,
                          UserCategoryId,
                          request,
                        });
                        // callBackDoneArray.push(element.DepartmentId);
                        let message = `Successfully completed ERP synchronization for Department:${DepartmentId} and User Category:${UserCategoryId} in erpTransactionScheduler function From ${FromDate} To ${ToDate}`;
                        console.log(message);
                        // console.log(
                        // // //   `callBackDoneArray: ${callBackDoneArray.length}`
                        // );
                        // console.log(`totalCallback : ${totalCallback}`);
                        await MiddlewareHistoryLogger({
                          EventType: EventType.INFORMATION,
                          EventCategory: EventCategory.SYSTEM,
                          EventStatus: EventStatus.COMPLETED,
                          EventText: String(message),
                        });
                        // // if (callBackDoneArray.length == totalCallback) {
                        //   callBackDoneEvent.emit("callBackDoneEvent");
                        // }
                      } else {
                        throw result.error;
                      }
                    }
                } catch (error) {
                let message = `Error in Synchronising ERP for Department:${element.DepartmentId} and User Category:${element.UserCategoryId} From ${FromDate} To ${ToDate}; Error in erpTransactionScheduler : ${error.message}`;
                console.log(message);
                await MiddlewareHistoryLogger({
                    EventType: EventType.ERROR,
                    EventCategory: EventCategory.SYSTEM,
                    EventStatus: EventStatus.FAILED,
                    EventText: String(message),
                });
                return;
                }

              
            }
          );
          let message = `Successfully Scheduled Erp Transaction for Department : ${
            element.DepartmentId
          } and User Category : ${element.UserCategoryId}; 
                    The batch job will run on Every month ${TriggerDate}th at ${TriggerHour}:${TriggerMinute} ${
            TriggerHour < 12 ? "AM" : "PM"
          } for FromDate : ${FromDate} to ToDate : ${ToDate};
                    `;
          console.log(message);
          await MiddlewareHistoryLogger({
            EventType: EventType.INFORMATION,
            EventCategory: EventCategory.SYSTEM,
            EventStatus: EventStatus.SUCCESS,
            EventText: String(message),
          });
          if (erpTransactionScheduleHandle) {
            erpTransactionScheduleHandleArray.push(
              erpTransactionScheduleHandle
            );
          }
        }
      }
      return erpTransactionScheduleHandleArray;
    } catch (error) {
      let message = `Error in erpTransactionScheduler function : ${error.message}`;
      console.log(message);
      await MiddlewareHistoryLogger({
        EventType: EventType.ERROR,
        EventCategory: EventCategory.SYSTEM,
        EventStatus: EventStatus.FAILED,
        EventText: String(message),
      });
      return;
    }
  } catch (error) {
    let message = `Failed to connect DB in erpTransactionScheduler function : ${error.message}`;
    console.log(message);
    await MiddlewareHistoryLogger({
      EventType: EventType.ERROR,
      EventCategory: EventCategory.DB,
      EventStatus: EventStatus.FAILED,
      EventText: String(message),
    });
    return;
  }
}

module.exports = { erpTransactionScheduler, erpTransactionScheduleHandleArray,callBackDoneEvent };
