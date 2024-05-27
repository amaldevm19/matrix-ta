const express = require('express');
const router = express.Router();

const transactionPageController = require("../controller/transaction_page_controller");

router.get("/",transactionPageController.transactionPage)

module.exports = router;