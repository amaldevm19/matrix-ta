
const {MiddlewareHistoryLogger,EventType,EventCategory,EventStatus} = require("../helpers/19_middleware_history_logger");

function historyLogger(req, res, next) {
    const lastIndex = req.clientIp.lastIndexOf(":");
    const ipv4Address = req.clientIp.slice(lastIndex + 1);
    MiddlewareHistoryLogger({
        EventType:EventType.INFORMATION,
        EventCategory:EventCategory.HTTP,
        EventMethod:req.method,
        EventUrl:req.originalUrl,
        EventStatus:EventStatus.PENDING,
        EventIp:ipv4Address,
        EventText:`Request Body : ${JSON.stringify(req.body)} ; Query string : ${JSON.stringify(req.query)} ; Request Params : ${JSON.stringify(req.params)}`,
        EventCreatedBy:req.session.user?.EmployeeId
    })
    next();
}

module.exports = {historyLogger};