
const {controllerLogger,EventType,EventCategory,EventStatus,EventMethod} = require("../helpers/19_middleware_history_logger");

const eventsController = {
    getEventsHomePage: async (req, res) => {
        try {
            let db = req.app.locals.db;
            const EventTypeArray = Object.values(EventType);
            const EventCategoryArray = Object.values(EventCategory);
            const EventStatusArray = Object.values(EventStatus);
            const EventMethodArray = Object.values(EventMethod);
            let Users = await db.query(`
            SELECT [EmployeeId]
            FROM [TNA_PROXY].[dbo].[Px_Users]
            `);
            await controllerLogger(req)
            return res.render('events',{page_header:"ServeU Attendance Management Middleware History Log Page",UsersArray:Users.recordset,EventTypeArray,EventCategoryArray,EventStatusArray,EventMethodArray});
        } catch (error) {
            console.log("Error in loading getEventsHomePage : ",error)
            await controllerLogger(req);
            return res.redirect("/")
        }
        
    }
}

module.exports = {eventsController}