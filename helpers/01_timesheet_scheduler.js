const cron = require('node-cron');
const {copyTimesheetFromCosecToProxyDbFunction} = require("./02_timesheet_copier")
const {timesheetCopyDatesBuilder} = require("./05_transaction_trigger_date_builder");
const {MiddlewareHistoryLogger,EventCategory,EventType,EventStatus} = require("../helpers/19_middleware_history_logger");

async function copyTimesheetFromCosecToProxyDbSchedule() {
    try {
        let copyTimesheetFromCosecToProxyDbScheduleHandle = cron.schedule(`0 * * * *`, async () => { 
            let backDate = 34;
            const { fromDate, toDate } = timesheetCopyDatesBuilder(backDate);
            let message = `${new Date().toLocaleString()} : Running batchjob copyTimesheetFromCosecToProxyDbSchedule;
            Job will copy Timesheet from Cosec to Proxy DB from FromDate : ${fromDate} to ToDate : ${toDate};`
            console.log(message)
            MiddlewareHistoryLogger({EventType:EventType.INFORMATION,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.STARTED,EventText:String(message)})
            await copyTimesheetFromCosecToProxyDbFunction({fromDate, toDate})
        })
        let message = `Successfully Scheduled copyTimesheetFromCosecToProxyDbSchedule`
        console.log(message)
        MiddlewareHistoryLogger({EventType:EventType.INFORMATION,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.COMPLETED,EventText:message})
        return copyTimesheetFromCosecToProxyDbScheduleHandle;
        
    } catch (error) {
        console.log("Error in copyTimesheetFromCosecToProxyDbSchedule function : ", error)
        MiddlewareHistoryLogger({EventType:EventType.ERROR,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.FAILED,EventText:String(error)})
    }
}


module.exports = {copyTimesheetFromCosecToProxyDbSchedule};