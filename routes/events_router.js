var express = require('express');
var router = express.Router();
const {eventsController} = require("../controller/events_controller");

router.get('/',eventsController.getEventsHomePage );

module.exports = router;