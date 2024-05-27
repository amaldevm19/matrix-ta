const getTransaction = require("./get_transactions");
const tempgetTransaction = require("./temp_get_transactions");
const getAccessToken = require("./get_access_token");

async function postToErp(accessToken,transactionResponse) {
    try {
        const response = await fetch(process.env.D365_ENDPOINT,
            {
                method: "POST",
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken.access_token}`
                    },
                body:JSON.stringify(transactionResponse)
            }
        )
        let d365_response = await response.json();
        if(d365_response.length > 0){
            return {status:"ok", error:"", data:d365_response}
        }else{
            throw{message:"Something went wrong with D365"}
        }
    } catch (error) {
        return {status:"failed", error:error.message, data:""}
    }

    
}


async function postTransaction(employee_category, date_range, test_data) {
    try {
        let transactionResponse = {};
        let transactionCount = null;
        if(!test_data){
            //transactionResponse = await getTransaction(employee_category, date_range);
            transactionResponse = await tempgetTransaction(employee_category, date_range);

        }else{
            transactionResponse = test_data;
        }
        let accessToken = await getAccessToken();
        if(transactionResponse.message){
            throw {message:transactionResponse.message}
        }
        if(accessToken.message){
            throw {message:accessToken.message}
        }
        let d365_response = await postToErp(accessToken,transactionResponse);
        transactionCount = transactionResponse.TransList.length;
        if(d365_response.status == "ok"){
            console.log("Successfully Posted to ERP")
           console.log(d365_response.data)
            return  {status:"ok",data:d365_response.data, error:""};
        }else{
            throw{message:d365_response.error, transactionCount}
        }
    } catch (error) {
        return {status:"failed",data:error.transactionCount,error:error.message};
    }
}


module.exports = postTransaction;