const {sql,ProxyDbPool} = require('../config/db');
const {controllerLogger} = require("../helpers/19_middleware_history_logger");

const designationPageController = {
    designationHomePage:async(req, res)=>{
        try {
            await controllerLogger(req);
            return res.render("designation", {page_header:"Position to Designation Mapping List"});
        } catch (error) {
            console.log("Error in designationHomePage function : ",error);
            await controllerLogger(req,error);
            return res.redirect("/");
        }
    },
}

module.exports={designationPageController};