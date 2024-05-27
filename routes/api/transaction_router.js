var express = require('express');
var router = express.Router();
const transactionController = require("../../controller/api/transaction_controller")


 
router.get("/post-transaction",transactionController.postTransactionManually);
router.post("/post-transaction/test",transactionController.temporaryTest);
router.get("/get-token",transactionController.getToken);

/* [GET] http://{Tna_Proxy_Server_IP:3000}/transaction/2 */ 
router.post("/",transactionController.getTransactions);


module.exports = router;