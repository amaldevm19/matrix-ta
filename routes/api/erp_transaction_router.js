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
router.post("/clear-selected", transactionController.clearSelectedErpTimesheet)
router.post("/server-selected", transactionController.selectServer)

router.post("/settings", transactionController.postErpSettings)
router.put("/settings/:Id", transactionController.updateErpSettings)
router.delete("/settings/:Id", transactionController.deleteErpSettings)

router.get("/horizontal-report/pending-data", transactionController.getErpTransactionPendingHorizontalData)
router.get("/horizontal-report/download-erptimesheet", transactionController.downloadErpTransactionPendingHorizontalData)
router.get("/horizontal-report/download-exception", transactionController.downloadExceptionHorizontal)
router.get("/horizontal-report/completed-data", transactionController.getErpTransactionCompletedHorizontalData)
router.get("/horizontal-report/download-erptimesheet-completed", transactionController.downloadErpTransactionCompletedHorizontalData)

module.exports = router;