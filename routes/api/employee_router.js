var express = require('express');
var router = express.Router();
const employeeController = require("../../controller/api/employee_controller")


/* [POST] http://{Tna_Proxy_Server_IP:3000}/employee */ 
router.post("/",employeeController.addNewEmployee);


/* Manually upload Employee via CSV file*/ 
router.get("/csvupload",employeeController.addEmployeesViaCSV);

/* [PATCH] http://{Tna_Proxy_Server_IP:3000}/employee/[employee_id] */
router.put("/", employeeController.updateEmployee);

/* [DELETE] http://{Tna_Proxy_Server_IP:3000}/employee/[employee_id] */
//router.post("/:employee_id", employeeController.deleteEmployee);




module.exports = router;