
// Function to generate trigger date, from date, and to date for a given month
function ERPTransactionTriggerDateBuilder(sqlData) {
    // Extract day values from SQL data
    let CurrentDate = new Date().getDate();
    let CurrentHour = new Date().getHours();
    let triggerDay = new Date(sqlData.TriggerDate).toISOString().split("T")[0].split("-")[2];
    let triggerHour = new Date(sqlData.TriggerDate).toISOString().split("T")[1].split(":")[0];
    let triggerMinute = new Date(sqlData.TriggerDate).toISOString().split("T")[1].split(":")[1];
    return {
      TriggerDate: triggerDay,
      TriggerHour: triggerHour,
      TriggerMinute:triggerMinute,
      FromDate: formatSQLDatetime(new Date(sqlData.FromDate)),
      ToDate: formatSQLDatetime(new Date(sqlData.ToDate)),
      CurrentDate,
      CurrentHour
    };
}

// Function to format date in SQL datetime format with '00:00:000' time
function formatSQLDatetime(date) {
  let year = date.getFullYear();
  let month = ('0' + (date.getMonth() + 1)).slice(-2);
  let day = ('0' + date.getDate()).slice(-2);
  return `${year}-${month}-${day} 00:00:00.000`;
}
function timesheetCopyDatesBuilder(backDate) {
    const today = new Date();
    const fromDate = new Date(today);
    fromDate.setDate(today.getDate() - backDate);
  
    const formattedFromDate = formatSQLDatetime(fromDate);
    const formattedToDate = formatSQLDatetime(today);
  
    return {
      fromDate: formattedFromDate,
      toDate: formattedToDate
    };
}
function updateTriggerSettingToNextMonth({ TriggerDate, FromDate, ToDate }) {
    FromDate = FromDate.split(" ")[0];
    ToDate = ToDate.split(" ")[0];
    // Convert string dates to Date objects
    const triggerDateObj = new Date(TriggerDate);
    const fromDateObj = new Date(FromDate);
    const toDateObj = new Date(ToDate);
    // Add one month to each date
    triggerDateObj.setMonth(triggerDateObj.getMonth() + 1);
    fromDateObj.setMonth(fromDateObj.getMonth() + 1);
    toDateObj.setMonth(toDateObj.getMonth() + 1);
  
    // Convert back to string and return the updated values
    const updatedTriggerDate = triggerDateObj.toISOString().replace("T"," ").replace("Z","");
    const updatedFromDate = fromDateObj.toISOString().split("T")[0] + " 00:00:00.000";
    const updatedToDate = toDateObj.toISOString().split("T")[0] + " 00:00:00.000";
  
    return {
      updatedTriggerDate,
      updatedFromDate,
      updatedToDate,
    };
}

module.exports={ERPTransactionTriggerDateBuilder, timesheetCopyDatesBuilder, updateTriggerSettingToNextMonth}
