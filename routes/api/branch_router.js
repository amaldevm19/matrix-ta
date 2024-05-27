var express = require('express');
var router = express.Router();
const branchController = require("../../controller/api/branch_controller")


/* [POST] http://{Tna_Proxy_Server_IP:3000}/branch */ 
router.post("/",branchController.addNewBranch);

/* [PATCH] http://{Tna_Proxy_Server_IP:3000}/branch/[branch_id] */
//router.patch("/:branch_name", branchController.updateBranch);

//Manually Pull data from T&A server and store in Proxy Server
router.get("/pull-data",branchController.addTnaItemsToProxyDB);


module.exports = router;