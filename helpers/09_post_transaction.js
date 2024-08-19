
const getAccessToken = require("./10_get_access_token");


async function postTransactionToERP(transactionData) {
    try {
        let accessToken = await getAccessToken();
        console.log("Called postTransactionToERP")
        let d365_end_point;
        switch (global.d365_server) {
            case "dev":
                d365_end_point = process.env.D365_DEV_ENDPOINT
                break;
            case "uat":
                d365_end_point = process.env.D365_UAT_ENDPOINT
                break;
            case "prod":
                d365_end_point = process.env.D365_PROD_ENDPOINT
                break;
            default:
                break;
        }
        const response = await fetch(d365_end_point,
            {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken.access_token}`
                    },
                body:JSON.stringify({TransList:transactionData})
            }
        )
        let d365_response = await response.json();
        if(d365_response?.ExceptionType){
            throw new Error(d365_response)
        }
       // console.log('d365_response',d365_response)
        if(d365_response?.length > 0){
            console.log("Finished postTransactionToERP")
            return {data:d365_response, error:"", status:"ok"};
        }
    } catch (error) {
        let message=`Error in postTimesheetToERP function : ${error.message}`;
        console.log(message)
        //await MiddlewareHistoryLogger({EventType:EventType.ERROR,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.FAILED,EventText:String(message)})
        return {data:"", error:error.message, status:"not ok"};
    }

}



module.exports = {postTransactionToERP};