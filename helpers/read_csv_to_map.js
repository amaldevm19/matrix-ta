const fs = require('fs');
const path = require('path');
const readFilePromise = require("./read_file_promise")


async function readCSVToMap(employee_category) {
    const dateMap = new Map();
    let fileName = null;
    console.log(employee_category)
    if(employee_category == 3){
        fileName = "timesheet.csv"
    }else{
        fileName = "staff-timesheet.csv"
    }
    console.log(fileName)
    const fileData = fs.readFileSync(path.join(__dirname,"..","csv",'assignedjobs',fileName))
    
    let {records, err} = await readFilePromise(fileData)
    const columns = records[0];
    records.splice(1).map(async (arr)=>{
        columns.forEach((column, index)=>{
            if(!(index == 0 ||index == 1) ){
                if(arr[index]){
                    dateMap.set(arr[0]+"#"+column,arr[1])
                }
            }
        })
    })
   return dateMap;
}


module.exports = readCSVToMap