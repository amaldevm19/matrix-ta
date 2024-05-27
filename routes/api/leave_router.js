const express = require('express');
const router = express.Router();
const leaveApiController = require("../../controller/api/leave_controller")

//Get Transaction status from TNA_Proxy DB

router.post("/apply-leave", leaveApiController.applyLeave)
router.post("/update-leave", leaveApiController.updateLeave)
router.post("/cancel-leave", leaveApiController.cancelLeave)





module.exports = router;