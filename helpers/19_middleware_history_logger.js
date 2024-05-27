
const {ProxyDbPool, sql} = require("../config/db")

let MiddlewareHistoryLogger = async({EventType,EventCategory,EventText='',EventMethod='',EventUrl='',EventStatus='',EventIp='',EventCreatedBy=''})=>{
    try {
        await ProxyDbPool.connect();
        try {
            if(EventText.length > 1000 ){
                EventText = EventText.slice(0, 1000)
            };
            await ProxyDbPool.request()
                .input('EventType', EventType)
                .input('EventCategory', EventCategory)
                .input('EventMethod', EventMethod)
                .input('EventUrl', EventUrl)
                .input('EventStatus', EventStatus)
                .input('EventIp', EventIp)
                .input('EventText', EventText)
                .input('EventCreatedBy', EventCreatedBy)
                .query(`
                    INSERT INTO [TNA_PROXY].[dbo].[Px_MiddlewareHistory]
                    (EventType, EventCategory, EventMethod, EventUrl, EventStatus, EventIp, EventText, EventCreatedBy)
                    VALUES (@EventType, @EventCategory, @EventMethod, @EventUrl, @EventStatus, @EventIp, @EventText, @EventCreatedBy)
                `);
        }catch(error){
            throw error
        }
    } catch (error) {
        console.log("Error in MiddlewareHistoryLogger function",error)
    }
}

const EventType ={
    ERROR:"Error",
    WARNING:"Warning",
    INFORMATION:"Information"
}

const EventCategory = {
    SYSTEM:"System",
    HTTP:"Http",
    USER:"User",
    DB:"Database"
}
const EventStatus = {
    PENDING:"Pending",
    COMPLETED:"Completed",
    SUCCESS:"Success",
    FAILED:"Failed",
    STARTED:"Started"
}

const EventMethod ={
    GET:"GET",
    POST:"POST",
    PUT:"PUT",
    PATCH:"PATCH",
    DELETE:"DELETE"
}

let controllerLogger = async(req, error)=>{
    const lastIndex = req.clientIp.lastIndexOf(":");
    const ipv4Address = req.clientIp.slice(lastIndex + 1);
    try {
        if(error){
            await MiddlewareHistoryLogger({
                EventType:EventType.ERROR,
                EventCategory:EventCategory.HTTP,
                EventMethod:req.method,
                EventUrl:req.originalUrl,
                EventStatus:EventStatus.FAILED,
                EventIp:ipv4Address,
                EventText:`Error in the request : ${String(error)}`,
                EventCreatedBy:req.session.user?.EmployeeId
            })
        }else{
            await MiddlewareHistoryLogger({
                EventType:EventType.INFORMATION,
                EventCategory:EventCategory.HTTP,
                EventMethod:req.method,
                EventUrl:req.originalUrl,
                EventStatus:EventStatus.SUCCESS,
                EventIp:ipv4Address,
                EventText:`Request Body : ${JSON.stringify(req.body)} ; Query string : ${JSON.stringify(req.query)} ; Request Params : ${JSON.stringify(req.params)}`,
                EventCreatedBy:req.session.user?.EmployeeId
            })
        }
        
    } catch (error) {
        console.log("Failed logging event : ",error)
    }
    
}


module.exports ={MiddlewareHistoryLogger,controllerLogger,EventType,EventCategory,EventStatus,EventMethod}