const axios = require('axios');

const getTransactionsFromTna = require("../../helpers/get_transactions");
const getAccessToken = require("../../helpers/get_access_token");
const postTransaction = require("../../helpers/post_transaction");
const PushD365ResponseToProxyDB = require("../../helpers/push_to_proxy_db");
const getOrSetFromTna = require("../../helpers/get_or_set_from_tna");


const transactionController = {
    getTransactions:(req, res)=>{
        let {employee_category, test_date} = req.body;
        getTransactionsFromTna(employee_category,test_date).then(data =>{
            if(data.TransList){
                res.status(200).json(data);
            }else{
                res.status(200).json({status:"failed",error:"Failed to fetch"});
            }
        })
        
    },
    getToken: async(req,res)=>{
        let response = await getAccessToken();
        if(response.error){
            res.status(400).json(error);
        }else{
            res.status(200).json(response);
        }
    },
    postTransactionManually: async(req,res)=>{
        try {
            console.log("Request to TNA Started At: "+new Date().toISOString().split("T")[1])
            //let {status, data, error} = await getOrSetFromTna("user?action=get;range=all;format=json;")
            let {status, data, error} = await getOrSetFromTna("user?action=get;id=25002;range=user;format=json;")
            
            let TransListArr = [];
            if(status =="ok"){
                console.log("Response received from TNA At: "+new Date().toISOString().split("T")[1])
                for (let index = 0; index < data.user.length; index++) {
                    const element = data.user[index];
                    for (let index = 1; index < 31; index++) {
                        let userTrans ={
                            HcmWorker_PersonnelNumber : element.id,
                            TransDate:`2023-03-${index.toString().padStart(2,"0")}`,
                            ProjId:"SRU-010985",
                            CategoryId:"Timesheet",
                            TotalHours:9
                        }
                        TransListArr.push(userTrans)
                    }
                    
                }
                console.log("Completed Data Building At: "+new Date().toISOString().split("T")[1])
                let D365_response = await postTransaction("","",{TransList:TransListArr});
                if(D365_response.status == "ok"){
                    console.log("D365 Response received At: "+new Date().toISOString().split("T")[1])
                    let push_response = await PushD365ResponseToProxyDB(D365_response,"2","25032023-25032023");
                    if(push_response.status=="ok"){
                        console.log("D365 Response Saved to TNA Proxy At: "+new Date().toISOString().split("T")[1])
                        res.status(200).json({status:"ok",error:"",data:push_response.data});
                    }else{
                        throw {message:push_response.error}
                    }
                }else{
                    throw {message:D365_response.error}
                }
            } else{
                throw {message:error}
            }
        } catch (error) {
            res.status(400).json({status:"failed", data:"", error:error.message})
        }

    },
    temporaryTest: async(req,res)=>{
        try {
            let test_data = req.body;
            //calling post transaction with test_data received from the request
            let D365_response = await postTransaction("","",test_data);
            if(D365_response.status == "ok"){
                let push_response = await PushD365ResponseToProxyDB(D365_response,"2","25032023-25032023");
                if(push_response.status=="ok"){
                    res.status(200).json({status:"ok",error:"",data:push_response.data});
                }else{
                    throw {message:push_response.error}
                }
            }else{
                throw {message:D365_response.error}
            }
        } catch (error) {
            res.status(400).json({status:"failed",error:error.message, data:""})
        }

    },

}

module.exports=transactionController;