var express = require('express');
var router = express.Router();
const departmentController = require("../../controller/api/department_controller")


/* [POST] http://{Tna_Proxy_Server_IP:3000}/department */
router.post("/",departmentController.addNewDepartment);

/* [PATCH] http://{Tna_Proxy_Server_IP:3000}/department/[department_id] */
router.put("/", departmentController.updateDepartment);

//Manually Pull department data from T&A server and store in Proxy Server
router.get("/pull-data",departmentController.addAllDepartmentsFromTnaToProxyDB);


module.exports = router;