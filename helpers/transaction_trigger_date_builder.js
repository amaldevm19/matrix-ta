const {ProxyDbPool} = require("../config/db");
async function transactionTriggerDate(employee_category) {
    try {
        let proxy_db = await ProxyDbPool.connect()
        let db_response = await proxy_db.query(`SELECT * FROM Px_TransTriggerMst`);
        let triggerDate = null;
        let dateRange=null;
        if(db_response?.recordset.length){
            for (let index = 0; index < db_response.recordset.length; index++) {
                const element = db_response.recordset[index];
                if(element.EmployeeCategory == employee_category){
                    let trigger_date = element.TransactionTrigger.toISOString().slice(0,10);
                    triggerDate = triggerDateMaker(trigger_date);
                    let FromDate = element.FromDate.toISOString().slice(0,10);
                    let ToDate = element.ToDate.toISOString().slice(0,10);  
                    dateRange = dateRangeBuilder(FromDate, ToDate)
                }
            }
            return {triggerDate,dateRange};
        }else{
            triggerDate = triggerDateMaker();
            dateRange = dateRangeBuilder();
            return {triggerDate,dateRange};
        }  
    } catch (error) {
        console.log(error)
    }
}

module.exports={transactionTriggerDate}

function triggerDateMaker(trigger_date) {
    if(!trigger_date){
        return "01";
    }
    let t_date = trigger_date.substr(trigger_date.length-2, 2);
    if(t_date == "31"){
        let todayArr = new Date().toISOString().slice(0,10).split('-');
        return new Date(todayArr[0],todayArr[1],0).getDate();
    }else 
    return t_date
}

function dateRangeBuilder(fromDateTime, ToDateTime) {
    if(!fromDateTime || !ToDateTime){
        let today = new Date().toISOString().slice(0,10);
        fromDateTime = "2023-01-01";
        ToDateTime = "2023-01-30";
    }
    let today = new Date();
    let thisDate = new Date().getDate();
    let thisMonth = today.getMonth()+1;
    let thisYear = today.getFullYear();
    let lastMonth = thisMonth == 1?12:thisMonth-1;
    let lastYear = thisMonth == 1?thisYear-1:thisYear;
    let fromDate = parseInt(fromDateTime.split('-')[2]);
    let fromMonth =  parseInt(fromDateTime.split('-')[1]);
    let fromYear =  parseInt(fromDateTime.split('-')[0]);
    let ToDate =  parseInt(ToDateTime.split('-')[2]);
    let ToMonth =  parseInt(ToDateTime.split('-')[1]);
    let ToYear =  parseInt(ToDateTime.split('-')[0]);
    let dateRange = [];
    if(fromMonth != ToMonth){
        let lastMonthEnd = new Date(lastYear,lastMonth,0).getDate();
        for(let i = fromDate; i <= lastMonthEnd;i++){
            dateRange.push(`${i.toString().padStart(2,"0")}${(lastMonth).toString().padStart(2,"0")}${lastYear}-${i.toString().padStart(2,"0")}${(lastMonth).toString().padStart(2,"0")}${lastYear}`)
        }
        for(let i=1; i<=ToDate;i++){
            dateRange.push(`${i.toString().padStart(2,"0")}${(thisMonth).toString().padStart(2,"0")}${thisYear}-${i.toString().padStart(2,"0")}${(thisMonth).toString().padStart(2,"0")}${thisYear}`)
        }
    }else{
        //this to be removed in production, use this code only if the triggerdate is in same month
        lastMonth +=1;
        let lastMonthEnd = new Date(lastYear,lastMonth,0).getDate();
        for(let i = fromDate; i <= lastMonthEnd;i++){
            dateRange.push(`${i.toString().padStart(2,"0")}${lastMonth.toString().padStart(2,"0")}${lastYear}-${i.toString().padStart(2,"0")}${lastMonth.toString().padStart(2,"0")}${lastYear}`)
        }
    }
    return dateRange;
}

/*
    function dateRangeMaker(FromDate, ToDate) {
        if(!FromDate || !ToDate){
            let today = new Date().toISOString().slice(0,10).split('-');
            let date_range = `01${today[1]}${today[0]}-${new Date(today[2],today[1],0).getDate()}${today[1]}${today[0]}`
            return date_range
        }
        let fromDateArr = FromDate.split('-');
        let toDateArr = ToDate.split('-');
        let todayArr = new Date().toISOString().slice(0,10).split('-');

        if(parseInt(fromDateArr[2])<parseInt(toDateArr[2])){
            if( toDateArr[2] == "31"){
                toDateArr[2] = new Date(todayArr[0],todayArr[1],0).getDate();
            }
            return fromDateArr[2] + todayArr[1] + todayArr[0]+'-'+ toDateArr[2] + todayArr[1] + todayArr[0];
        }else{
            let fmonth, fyear;
            let month = todayArr[1];
            let year = todayArr[0];
            if(month == "01"){
                fmonth = "12";
                fyear = (parseInt(year)-1).toString();
            }else{
                fmonth = (parseInt(month)-1).toString().padStart(2,'0');
                fyear = todayArr[0];
            }
            return fromDateArr[2]+fmonth+fyear+'-'+toDateArr[2] + todayArr[1] + todayArr[0];
        }
    }
*/