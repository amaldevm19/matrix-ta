var express = require('express');
var router = express.Router();
const transactionController = require("../../controller/api/erp_transaction_controller")


router.get("/pending-data", transactionController.getErpPendingData)
router.get("/status", transactionController.getErpStatusData)
router.get("/download-status", transactionController.downloadErpStatusData)
router.get("/settings", transactionController.getErpSettings)
router.get("/all-timesheet", transactionController.getAllErpTimesheet)
router.get("/copy-timesheet", transactionController.copyTimesheetToErpTable)
router.get("/download-erptimesheet", transactionController.downloadERPTimesheet)
router.get("/download-exception", transactionController.downloadException)
router.post("/post-selected", transactionController.postSelectedErpTimesheet)

router.post("/settings", transactionController.postErpSettings)
router.put("/settings/:Id", transactionController.updateErpSettings)
router.delete("/settings/:Id", transactionController.deleteErpSettings)


module.exports = router;