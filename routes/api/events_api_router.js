var express = require('express');
var router = express.Router();
const {eventsApiController} = require("../../controller/api/events_api_controller");

router.get('/',eventsApiController.getEventsHomePageData );
router.get('/download',eventsApiController.downloadEventsData );

module.exports = router;