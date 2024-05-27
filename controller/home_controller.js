const {controllerLogger} = require("../helpers/19_middleware_history_logger");
const path = require('path');

const homeController = {
    getHome: async (req, res) => {
        try {
            await controllerLogger(req)
            return res.render('home',{page_header:"Home"});
        } catch (error) {
            console.log("Error in getHome function : ",error)
            await controllerLogger(req,error);
        }

    }
}


module.exports = homeController