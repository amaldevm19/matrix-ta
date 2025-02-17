const {ProxyDbPool, sql} = require("../config/db");

const {getTimesheetFromERPTransactionMstTable,updateERPTransactionStatus} = require("./04_erp_transaction_copier");
const {postTransactionToERP} = require("./09_post_transaction");
const {MiddlewareHistoryLogger,EventCategory,EventType,EventStatus} = require("../helpers/19_middleware_history_logger");

async function startERPTransaction({
    FromDate='', 
    ToDate='',
    EmployeeId='',
    JobCode='',
    DepartmentId='',
    UserCategoryId='',
    EmployeeCategoryId='',
    DesignationId='',
    SectionId='', 
    SyncCompleted=0,
    pendingCount,
    pendingD365ResponseArray=[]
}) {

    try {
        let sendingCount = pendingCount < 100 ? pendingCount : 100;
        while (pendingCount > 0) {    
            try {
                console.log(`Starting getTimesheetFromERPTransactionMstTable for ${sendingCount}`);
                let transactionData = await getTimesheetFromERPTransactionMstTable({
                    sendingCount, 
                    FromDate, 
                    ToDate, 
                    EmployeeId, 
                    JobCode,
                    DepartmentId,
                    UserCategoryId,
                    EmployeeCategoryId,
                    DesignationId,
                    SectionId,
                    SyncCompleted 
                });
                if(transactionData.status == "ok"){
                    let postingResult = await postTransactionToERP(transactionData.data);
                    if(postingResult.status == "ok"){
                        let updateERPTransactionStatusResult = await updateERPTransactionStatus(postingResult.data)
                        if(updateERPTransactionStatusResult.status = "ok"){
                            pendingD365ResponseArray.push(updateERPTransactionStatusResult.data)
                            console.log(`Pending Count for Department : ${DepartmentId}`,pendingCount)
                            console.log(`Sending Count for Department : ${DepartmentId}`,sendingCount)
                            pendingCount -= sendingCount;
                            if(pendingCount < sendingCount){
                                sendingCount = pendingCount;
                            }
                        } 
                    }  
                }
                
            } catch (error) {
                let message=`Error in startERPTransaction function : ${error}`;
                console.log(message)
                await MiddlewareHistoryLogger({EventType:EventType.ERROR,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.FAILED,EventText:String(message)})
            } 

        }
        let newPendingCount = await checkPendingCount({
            DepartmentId,
            UserCategoryId,
            FromDate,
            ToDate,
        });
        if(newPendingCount > 0){
            await startERPTransaction({
                FromDate,
                ToDate,
                DepartmentId,
                UserCategoryId,
                pendingCount:newPendingCount,
                pendingD365ResponseArray
              });
        }
        return {status:"ok",data:pendingD365ResponseArray,error:""};
    } catch (error) {
        let message=`Error in startERPTransaction function : ${error}`;
        console.log(message)
        await MiddlewareHistoryLogger({EventType:EventType.ERROR,EventCategory:EventCategory.SYSTEM,EventStatus:EventStatus.FAILED,EventText:String(message)})
        return {status:"not ok",data:"",error: error};
    }

}

async function checkPendingCount({DepartmentId,UserCategoryId, FromDate, ToDate}) {
    try {
        await ProxyDbPool.connect();
        const request = new sql.Request(ProxyDbPool);
        const result = await request.query(`
        SELECT 
            COUNT(*) AS TotalCount
        FROM [TNA_PROXY].[dbo].[Px_ERPTransactionMst]
        WHERE 
        ('${DepartmentId}' IS NULL OR '${DepartmentId}'='' OR DepartmentId = ${DepartmentId?DepartmentId:0}) AND
        ('${UserCategoryId}' IS NULL OR '${UserCategoryId}'='' OR UserCategoryId = ${UserCategoryId?UserCategoryId:0}) AND
        (('${FromDate}'='' AND '${ToDate}'='') OR TransDate BETWEEN '${FromDate}' AND '${ToDate}') AND
        SyncCompleted = 0 AND Error=0;
        `);
        let pendingCount = result.recordset[0].TotalCount;
        console.log("Pending count: ",pendingCount)
        return pendingCount;
    } catch (error) {
        
    }
}

module.exports = {startERPTransaction,checkPendingCount};