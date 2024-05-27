const cron = require('node-cron');
const {postTransactionToERP} = require("./post_transaction");
const {getTimesheetFromTna} = require("./get_timesheet_from_tna");
const {addTimesheetToPxTimesheetMstTable, updatePxTimesheetMstTable} = require("./px_timesheetMst_table");
const {transactionTriggerDate} = require("./transaction_trigger_date_builder");

let transactionForStaff = null;
let transactionForNonStaff = null;
async function transactionForStaffMethod(value) {
    let {triggerDate, dateRange} = await transactionTriggerDate("Staff");
    let employee_category = "2"
    console.log("Staff Trigger Date: "+triggerDate )
    console.log("Staff dateRange Start At: "+dateRange[0] )
    console.log("Staff dateRange End At: "+dateRange[dateRange.length-1] )
    if(value){
        transactionForStaff.stop()
    }
    let schedule_hour = "17";
    let schedule_minute = "10";
    transactionForStaff = cron.schedule(`${schedule_minute} ${schedule_hour} ${triggerDate} * *`, async () => { 
        try {
            let {dateRange} = await transactionTriggerDate("Staff");
            for (let index = 0; index < dateRange.length; index++) {
                const date_range = dateRange[index];
                console.log(`Posting transaction for Staffs for ${date_range}`)
                //Get timesheet from TNA and modify to ERP format
                let transactionMap = await getTimesheetFromTna({employee_category, date_range});
                //Add ERP formatted timesheet to Px_TimesheetMst table
                let statusOfAddTimesheetToPxTimesheetMstTable = await addTimesheetToPxTimesheetMstTable(transactionMap)
                //Post Px_TimesheetMst's UnSync data to ERP
                if(statusOfAddTimesheetToPxTimesheetMstTable.length){
                    let D365_response = await postTransactionToERP({employee_category});
                    if(!D365_response) {
                        throw ({message:`Posting transaction for Staffs for ${date_range} is failed`})
                    }
                    let updatePxTimesheetMstTableStatus = await updatePxTimesheetMstTable(D365_response);
                    if(!updatePxTimesheetMstTableStatus){
                        throw ({message:`Posting transaction for Staffs for ${date_range} is failed`})
                    }
                    console.log(`Posting transaction for Staffs for ${date_range} is successful`)
                }
                
            }
        } catch (error) {
            console.log("Error in transactionForStaffMethod : ", error)
        }
    })
    return transactionForStaff;
}

async function transactionForNonStaffMethod(value) {
    let {triggerDate, dateRange} = await transactionTriggerDate("Non-Staff");
    let employee_category = "3"
    console.log("Staff Trigger Date: "+triggerDate )
    console.log("Staff dateRange Start At: "+dateRange[0] )
    console.log("Staff dateRange End At: "+dateRange[dateRange.length-1] )
    if(value){
        transactionForNonStaff.stop()
    }
    let schedule_hour = "17";
    let schedule_minute = "10";
    transactionForNonStaff = cron.schedule(`${schedule_minute} ${schedule_hour} ${triggerDate} * *`, async () => { 
        try {
            let {dateRange} = await transactionTriggerDate("Staff");
            for (let index = 0; index < dateRange.length; index++) {
                const date_range = dateRange[index];
                console.log(`Posting transaction for Staffs for ${date_range}`)
                //Get timesheet from TNA and modify to ERP format
                let transactionMap = await getTimesheetFromTna({employee_category, date_range});
                //Add ERP formatted timesheet to Px_TimesheetMst table
                let statusOfAddTimesheetToPxTimesheetMstTable = await addTimesheetToPxTimesheetMstTable(transactionMap)
                //Post Px_TimesheetMst's UnSync data to ERP
                if(statusOfAddTimesheetToPxTimesheetMstTable.length){
                    let D365_response = await postTransactionToERP({employee_category});
                    if(!D365_response) {
                        throw ({message:`Posting transaction for Staffs for ${date_range} is failed`})
                    }
                    let updatePxTimesheetMstTableStatus = await updatePxTimesheetMstTable(D365_response);
                    if(!updatePxTimesheetMstTableStatus){
                        throw ({message:`Posting transaction for Staffs for ${date_range} is failed`})
                    }
                    console.log(`Posting transaction for Staffs for ${date_range} is successful`)
                }
                
            }
        } catch (error) {
            console.log("Error in transactionForNonStaffMethod : ", error)
        }
    })
    return transactionForNonStaff;
}


module.exports = {transactionForStaffMethod, transactionForNonStaffMethod};