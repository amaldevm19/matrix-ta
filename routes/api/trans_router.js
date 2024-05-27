var express = require('express');
var router = express.Router();
const transApiController = require("../../controller/api/trans_controller")

//Get Transaction status from TNA_Proxy DB
router.get("/retriger/:id",transApiController.retriggerTrans)
router.get("/", transApiController.getTransactionStatus)
router.get("/:TransactionId/", transApiController.getFailedTransaction)
router.post("/", transApiController.addTransactionTrigger)
router.post("/push-single-trans", transApiController.manualTriggerTrans)





module.exports = router;