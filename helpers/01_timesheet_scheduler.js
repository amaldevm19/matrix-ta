const cron = require('node-cron');
const {copyTimesheetFromCosecToProxyDbFunction} = require("./02_timesheet_copier")
const {timesheetCopyDatesBuilder} = require("./05_transaction_trigger_date_builder");
const {MiddlewareHistoryLogger,EventCategory,EventType,EventStatus} = require("../helpers/19_middleware_history_logger");

let copyTimesheetFromCosecToProxyDbScheduleHandle=null;

async function copyTimesheetFromCosecToProxyDbSchedule(isRunning) {
    try {
        let schedule_hour = "20";
        let schedule_minute = "25";
        if(isRunning){
            copyTimesheetFromCosecToProxyDbScheduleHandle.stop();
        }
        copyTimesheetFromCosecToProxyDbScheduleHandle = cron.schedule(`${schedule_minute} ${schedule_hour} * * *`, async () => { 
            try {
                let backDate = 34;
                const { fromDate, toDate } = timesheetCopyDatesBuilder(backDate);
                let message = `${new Date().toISOString()} : Running batchjob copyTimesheetFromCosecToProxyDbSchedule;
                Job will copy Timesheet from Cosec to Proxy DB from FromDate : ${fromDate} to ToDate : ${toDate};`
                console.log(message)
                MiddlewareHistoryLogger({EventType:EventType.INFORMATION,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.STARTED,EventText:String(message)})
                await copyTimesheetFromCosecToProxyDbFunction({fromDate, toDate})
            } catch (error) {
                let message = `Error in copyTimesheetFromCosecToProxyDbFunction function : ${error.message}`
                console.log(message)
                MiddlewareHistoryLogger({EventType:EventType.ERROR,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.FAILED,EventText:String(message)})
            }
        })
        let message = `Successfully registered copyTimesheetFromCosecToProxyDbSchedule; The batch job will run everyday at ${schedule_hour}:${schedule_minute};`
        console.log(message)
        MiddlewareHistoryLogger({EventType:EventType.INFORMATION,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.COMPLETED,EventText:message})
        return copyTimesheetFromCosecToProxyDbScheduleHandle;
        
    } catch (error) {
        console.log("Error in copyTimesheetFromCosecToProxyDbSchedule function : ", error)
        MiddlewareHistoryLogger({EventType:EventType.ERROR,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.FAILED,EventText:String(error)})
    }
}


module.exports = {copyTimesheetFromCosecToProxyDbSchedule};