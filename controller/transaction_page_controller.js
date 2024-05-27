

const transactionPageController = {
    transactionPage:async(req, res)=>{
        try {
            let db_response = await req.app.locals.db.query(`SELECT * FROM Px_TransTriggerMst`);
            if(db_response?.recordset.length){
                let transTriggerData = db_response.recordset;
                let modifiedData = transTriggerData.map((element)=>{
                    //console.log(ele.TransactionTrigger.toISOString().slice(0,10))
                    element.TransactionTrigger = element.TransactionTrigger.toISOString().slice(0,10);
                    element.FromDate=element.FromDate.toISOString().slice(0,10);
                    element.ToDate=element.ToDate.toISOString().slice(0,10);
                    return element;
                })
                res.render("transaction", {modifiedData});
            }else{
                res.render("transaction");
            }
            
        } catch (error) {
            
        }
        
    }
}

module.exports=transactionPageController;