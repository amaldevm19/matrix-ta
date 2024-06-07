const express = require('express');
const router = express.Router();

const {erpTransactionPageController} = require("../controller/erp_transaction_page_controller");
const {isAdmin} = require("../middlewares/isAuthenticated")

router.get("/",erpTransactionPageController.erpTransactionHomePage)
router.get("/pending-data",erpTransactionPageController.erpTransactionPendingDataPage)
router.get("/status",erpTransactionPageController.erpTransactionStatusPage)
router.get("/settings",isAdmin,erpTransactionPageController.erpTransactionSettingsPage)
router.get("/push-selected",isAdmin,erpTransactionPageController.pushSelectedTimesheetPage)
router.get("/horizontal-report/pending-data",erpTransactionPageController.erpTransactionPendingHorizontalPage)

module.exports = router;