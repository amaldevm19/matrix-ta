const {sql,ProxyDbPool} = require('../../config/db');
const {controllerLogger} = require("../../helpers/19_middleware_history_logger");

const eventsApiController = {
    getEventsHomePageData: async (req, res) => {
        try {
            await ProxyDbPool.connect();
            const transaction = new sql.Transaction(ProxyDbPool);
            try {
                let {page,size,EventIp,EventType,EventCategory,FromDate,ToDate,EventMethod,EventStatus,CreatedBy} = req.query;
                let firstRow = ((page-1) * size)+1
                let lastRow = page * size;
                await transaction.begin();
                let whereClause = `
                    WHERE 
                    (@EventType IS NULL OR @EventType='' OR EventType = @EventType)AND
                    (@EventIp IS NULL OR @EventIp='' OR EventIp = @EventIp) AND
                    (@EventCategory IS NULL OR @EventCategory ='' OR EventCategory = @EventCategory)    AND
                    (@EventMethod IS NULL OR @EventMethod='' OR EventMethod = @EventMethod) AND
                    (@EventCreatedBy IS NULL OR @EventCreatedBy='' OR EventCreatedBy = @EventCreatedBy)  AND 
                    (@EventStatus IS NULL OR @EventStatus='' OR EventStatus = @EventStatus) AND
                    ((@FromDate='' AND @ToDate='') OR (EventCreatedAt BETWEEN @FromDate AND  @ToDate)) 
                `
                let result = await ProxyDbPool.request()
                .input('EventType', EventType)
                .input('EventCategory', EventCategory)
                .input('EventMethod', EventMethod)
                .input('EventStatus', EventStatus)
                .input('EventIp', EventIp)
                .input('EventCreatedBy', CreatedBy)
                .input('FromDate',FromDate)
                .input('ToDate',ToDate)
                .query(`
                WITH NumberedRows AS (
                    SELECT
                        id, EventCreatedAt, EventType, EventCategory, EventMethod, EventStatus, EventUrl, EventIp, EventText, EventCreatedBy,
                        ROW_NUMBER() OVER (ORDER BY EventCreatedAt DESC) AS RowNum 
                    FROM [TNA_PROXY].[dbo].[Px_MiddlewareHistory]
                   ${whereClause}
                )
                SELECT
                    id, EventCreatedAt, EventType, EventCategory, EventMethod, EventStatus, EventUrl, EventIp, EventText, EventCreatedBy, RowNum
                FROM NumberedRows
                WHERE RowNum BETWEEN ${firstRow} AND ${lastRow}
                ORDER BY EventCreatedAt DESC;
                `);
                await transaction.commit();
                await transaction.begin();
                let totalCount = await ProxyDbPool.request()
                .input('EventType',sql.NVarChar, EventType)
                .input('EventCategory', EventCategory )
                .input('EventMethod', EventMethod )
                .input('EventStatus', EventStatus )
                .input('EventIp', EventIp )
                .input('EventCreatedBy', CreatedBy )
                .input('FromDate',FromDate )
                .input('ToDate',ToDate )
                .query( `
                    SELECT COUNT(*) AS TotalRowCount 
                    FROM [TNA_PROXY].[dbo].[Px_MiddlewareHistory]  
                    ${whereClause}
                `)
                await transaction.commit();
                let last_page = Math.ceil(totalCount.recordset[0].TotalRowCount / size);
                await controllerLogger(req);
                return res.status(200).json({status:"ok", last_page,data:result.recordset});
            } catch (error) {
                await transaction.rollback();
                throw error;
            }
        } catch (error) {
            console.log("Error in getEventsHomePageData function : ", error)
            console.log(error)
            await controllerLogger(req, error);
            return res.status(400).json({status:"not ok",error:error, data:""})
        }
        
    },
    downloadEventsData:async(req,res)=>{
        try {
            const{EventIp,EventType,EventCategory,FromDate,ToDate,EventMethod,EventStatus,CreatedBy} = req.query;
            let db = req.app.locals.db;
            let whereClause = `
            WHERE 
            (@EventType IS NULL OR @EventType='' OR EventType = @EventType)AND
            (@EventIp IS NULL OR @EventIp='' OR EventIp = @EventIp) AND
            (@EventCategory IS NULL OR @EventCategory ='' OR EventCategory = @EventCategory)    AND
            (@EventMethod IS NULL OR @EventMethod='' OR EventMethod = @EventMethod) AND
            (@EventCreatedBy IS NULL OR @EventCreatedBy='' OR EventCreatedBy = @EventCreatedBy)  AND 
            (@EventStatus IS NULL OR @EventStatus='' OR EventStatus = @EventStatus) AND
            ((@FromDate='' AND @ToDate='') OR (EventCreatedAt BETWEEN @FromDate AND  @ToDate)) `

            let result = await db.request()
            .input('EventType', EventType)
            .input('EventCategory', EventCategory)
            .input('EventMethod', EventMethod)
            .input('EventStatus', EventStatus)
            .input('EventIp', EventIp)
            .input('EventCreatedBy', CreatedBy)
            .input('FromDate',FromDate)
            .input('ToDate',ToDate)
            .query(`
            WITH NumberedRows AS (
                SELECT
                    id, EventCreatedAt, EventType, EventCategory, EventMethod, EventStatus, EventUrl, EventIp, EventText, EventCreatedBy,
                    ROW_NUMBER() OVER (ORDER BY EventCreatedAt DESC) AS RowNum 
                FROM [TNA_PROXY].[dbo].[Px_MiddlewareHistory]
                ${whereClause}
            )
            SELECT
                id, EventCreatedAt, EventType, EventCategory, EventMethod, EventStatus, EventUrl, EventIp, EventText, EventCreatedBy, RowNum
            FROM NumberedRows
            ORDER BY EventCreatedAt DESC;
            `);
            await controllerLogger(req);
            return res.status(200).json({status:"ok",data:result.recordset});
        } catch (error) {
            console.log("Error in downloadEventsData function : ", error)
            await controllerLogger(req, error)
            return res.status(200).json({status:"not ok",error:error, data:""})
        }
    }
}

module.exports = {eventsApiController}