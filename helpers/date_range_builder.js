function dateRangeBuilder(employee_category) {
    let date_range = ``;
    let date = new Date();
    let thisMonth = date.getMonth()+1;
    let thisYear = date.getFullYear();
    let previousYear = (thisMonth > 1)?thisYear:thisYear-1;
    let lastDay = new Date(thisYear, thisMonth, 0).getDate();
    switch(employee_category){
        case "2":
            thisMonth = thisMonth >= 10?thisMonth:"0"+thisMonth.toString();
            date_range=`01${thisMonth}${thisYear}-${lastDay}${thisMonth}${thisYear}`;
            break;
        case "3":
            let previousMonth;
            if(thisMonth > 10){
                previousMonth = thisMonth-1
            }else if (thisMonth==1){
                previousMonth = 12
            } else {
                previousMonth = "0"+(thisMonth-1).toString();
            }
            //Construct the date format send to TNA server
            date_range=`26${previousMonth}${previousYear}-25${thisMonth >= 10?thisMonth:"0"+thisMonth.toString()}${thisYear}`;
            break;
    }
    return date_range;
}

module.exports = dateRangeBuilder;
