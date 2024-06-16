
const getAccessToken = require("./10_get_access_token");
const {MiddlewareHistoryLogger,EventCategory,EventType,EventStatus} = require("../helpers/19_middleware_history_logger");

async function postTransactionToERP(transactionData) {
    try {
        let accessToken = await getAccessToken();
        console.log("Called postTransactionToERP")
        const response = await fetch(process.env.D365_ENDPOINT,
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
            throw(d365_response)
        }
       // console.log('d365_response',d365_response)
        if(d365_response?.length > 0){
            console.log("Finished postTransactionToERP")
            return {data:d365_response, error:"", status:"ok"};
        }
    } catch (error) {
        let message=`Error in postTimesheetToERP function : ${error.Message}`;
        console.log(message)
        await MiddlewareHistoryLogger({EventType:EventType.ERROR,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.FAILED,EventText:String(message)})
        return {data:"", error:error.Message, status:"not ok"};
    }

}



module.exports = {postTransactionToERP};