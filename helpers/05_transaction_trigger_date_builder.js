
// Function to generate trigger date, from date, and to date for a given month
function ERPTransactionTriggerDateBuilder(sqlData) {
    // Extract day values from SQL data
    let triggerDay = new Date(sqlData.TriggerDate).getDate();
    let actualTriggerHour = new Date(sqlData.TriggerDate).getHours();
    let triggerHour = actualTriggerHour
    if(actualTriggerHour >= 4){
      triggerHour = new Date(sqlData.TriggerDate).getHours()-4;
    } else if(actualTriggerHour == 3){
      triggerHour = 24-1;
    }else if(actualTriggerHour == 2){
      triggerHour = 24-2;
    }else if(actualTriggerHour == 1){
      triggerHour = 24-3;
    }
    //console.log("TriggerHour is ",triggerHour)
    let triggerMinute = new Date(sqlData.TriggerDate).getMinutes();
    var fromDay = new Date(sqlData.FromDate).getDate();
    var toDay = new Date(sqlData.ToDate).getDate();
    var triggerMonth = new Date(sqlData.TriggerDate).getMonth();
    var toMonth = new Date(sqlData.ToDate).getMonth();
  
    // Calculate trigger date for the current month
    var currentTriggerDate = new Date();
    currentTriggerDate.setDate(triggerDay);
  
    // Calculate from date for the current month
    var currentFromDate = new Date();
    currentFromDate.setDate(fromDay);
    currentFromDate.setMonth(currentFromDate.getMonth() - 1);
  
    // Calculate to date for the current month
    var currentToDate = new Date();
    currentToDate.setDate(toDay);

    var currentMonth = new Date().getMonth();
    
   

  
    // If the calculated to date is greater than the number of days in the month, set it to the last day
    var lastDayOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate();
    if(currentTriggerDate.getMonth != currentToDate.getMonth() ){
        
    }
    if (currentToDate.getDate() > lastDayOfMonth) {
      currentToDate.setDate(lastDayOfMonth);
    }

    if(triggerMonth != toMonth){
        currentToDate.setMonth(currentMonth-1);
        var lastDayOfMonth = new Date(currentToDate.getFullYear(), currentToDate.getMonth()+1 , 0).getDate();
        currentToDate.setDate(lastDayOfMonth);
    }
    return {
      TriggerDate: triggerDay,
      TriggerHour: triggerHour,
      TriggerMinute:triggerMinute,
      //FromDate: formatSQLDatetime(currentFromDate),
      //ToDate: formatSQLDatetime(currentToDate),
      FromDate: formatSQLDatetime(new Date(sqlData.FromDate)),
      ToDate: formatSQLDatetime(new Date(sqlData.ToDate)),
    };
}

// Function to format date in SQL datetime format with '00:00:000' time
function formatSQLDatetime(date) {
var year = date.getFullYear();
var month = ('0' + (date.getMonth() + 1)).slice(-2);
var day = ('0' + date.getDate()).slice(-2);
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
    // const updatedFromDate = fromDateObj.toISOString().replace("T"," ").replace("Z","");
    // const updatedToDate = toDateObj.toISOString().replace("T"," ").replace("Z","");
  
    return {
      updatedTriggerDate,
      updatedFromDate,
      updatedToDate,
    };
  }

module.exports={ERPTransactionTriggerDateBuilder, timesheetCopyDatesBuilder, updateTriggerSettingToNextMonth}
