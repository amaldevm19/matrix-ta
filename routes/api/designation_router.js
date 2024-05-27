var express = require('express');
var router = express.Router();
const designationController = require("../../controller/api/designation_controller")


/* [POST] http://{Tna_Proxy_Server_IP:3000}/designation */
router.post("/",designationController.addNewDesignation);

/* [PATCH] http://{Tna_Proxy_Server_IP:3000}/designation/[designation_id] */
// router.patch("/:designation_name", designationController.updateDesignation);

//Manually Pull data from CSV and store in Proxy Server
router.get("/push-to-proxy",designationController.addDesignationFromCSVToProxyDB);

//Manually add all designations from Proxy server to TnaDB without overwriting the exisiting
router.get("/push-to-tna",designationController.addDesignationsFromProxyToTNADB);

//Get initial data for designation home page
router.get("/designation-data",designationController.getDesignationHomePageData);

//Download designation data
router.get("/download-designation",designationController.downloadDesignationData);

//Link position with designation
router.get("/link-designation",designationController.linkDesignation);

module.exports = router;