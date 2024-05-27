
// function hasAllRequiredKeys(obj, requiredKeys) {
// for (let key of requiredKeys) {
//     if (!obj.hasOwnProperty(key)) {
//     return false;
//     }
// }
// return true;
// }


let fetchHandler = async(url,data,method)=>{
    const response = await fetch(url, {
        method: `${method}`,
        mode: "cors", 
        cache: "no-cache",
        credentials: "same-origin",
        headers: {"Content-Type": "application/json",},
        redirect: "follow",
        referrerPolicy: "no-referrer",
        body: JSON.stringify(data),
     });
    return response.json(); // parses J
}

let deleteIcon = function(cell, formatterParams, onRendered){
    return "<i class='bi bi-trash3' style='color: red;''></i>";
};
let editIcon = function(cell, formatterParams, onRendered){
    return "<i class='bi bi-pencil-square' style='color: green;''></i>";
};

let sendIcon = function(cell, formatterParams, onRendered){
    let status = cell.getData().Status;
    return `<button type=button" class="btn btn-primary" ${status?"":"disabled"}>Start ERP Sync</button>`;
};


function showLoadingIndicator() {
    $("#loading-indicator").fadeIn();
}

// Hide loading indicator
function hideLoadingIndicator() {
    $("#loading-indicator").fadeOut();
}

async function parseCSV(file,schema) {
    let errorRows=[];
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function (e) {
            Papa.parse(e.target.result, {
                header: true,
                skipEmptyLines: true,
                complete: function (result) {
                    const jsonData = result.data
                    .map((row,index)=>{
                        const validationResult = schema.validate(row);
                        if (validationResult.error) {
                            errorRows.push({...row,Index:++index,Status:"Failed",Message:`Failed validation ${validationResult.error.message} `})
                            return {};
                        }
                        //Only for attendance correction application
                        if(row.AttendanceDate){
                            const inputDate = luxon.DateTime.fromFormat(row.AttendanceDate, 'dd/MM/yyyy');
                            const currentDate = luxon.DateTime.local();
                            if (inputDate > currentDate) {
                                errorRows.push({...row,Index:++index,Status:"Failed",Message:`Attendance date must not be greater than Today`})
                                console.log('Attendance date must not be greater than Today')
                                return {};
                            }
                        }
                        return row;
                    })
                    resolve( {jsonData:jsonData,errorData:errorRows});
                },
                error: function (error) {
                    reject(error);
                },
            });
        };

        reader.readAsText(file);
    });
}

function hasAllRequiredKeys(row, requiredKeys) {
    return requiredKeys.every(key => Object.prototype.hasOwnProperty.call(row, key));
}








