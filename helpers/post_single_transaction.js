const getSingleTransactionsFromTna = require("./get_single_transactions");
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


async function postSingleTransaction(employee_id, date_range) {
    try {
        let transactionResponse = await getSingleTransactionsFromTna(employee_id, date_range);
        let transactionCount = null;
        let accessToken = await getAccessToken();
        if(accessToken.message){
            throw {transactionCount:0,message:accessToken.message}
        }
        if(transactionResponse.TransList){
            let d365_response = await postToErp(accessToken,transactionResponse);
            transactionCount = transactionResponse.TransList.length;
            if(d365_response.status == "ok"){
                console.log("Successfully Posted to ERP")
                return  {status:"ok",data:d365_response.data, error:""};
            }else{
                throw{message:d365_response.error, transactionCount}
            }
        }else{
            throw {transactionCount:0,message:transactionResponse.error}
        }
    } catch (error) {
        return {status:"failed",data:error.transactionCount,error:error.message};
    }
}


module.exports = postSingleTransaction;