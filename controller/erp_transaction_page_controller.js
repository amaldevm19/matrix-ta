const {sql,ProxyDbPool} = require('../config/db');
const {controllerLogger} = require("../helpers/19_middleware_history_logger");

const erpTransactionPageController = {
    erpTransactionHomePage:async(req, res)=>{
        try {
            await controllerLogger(req);
            return res.render("erpTransaction", {page_header:"ERP Timesheet Transaction History and Settings"});
        } catch (error) {
            console.log("Error in erpTransactionHomePage function : ",error);
            await controllerLogger(req,error);
            return res.redirect("/");
        }
    },
    erpTransactionPendingDataPage:async(req, res)=>{
        try {
            await ProxyDbPool.connect();
            const transaction = new sql.Transaction(ProxyDbPool);
            try {
                await transaction.begin();
                let Department = await ProxyDbPool.request().query(`
                SELECT DPTID, Name
                FROM [COSEC].[dbo].[Mx_DepartmentMst]
                `);
                await transaction.commit();
                await transaction.begin();
                let UserCategory = await ProxyDbPool.request().query(`
                SELECT CG1ID, Name
                FROM [COSEC].[dbo].[Mx_CustomGroup1Mst]
                `);
                await transaction.commit();
                await transaction.begin();
                let Designation = await ProxyDbPool.request().query(`
                SELECT DSGID, Name
                FROM [COSEC].[dbo].[Mx_DesignationMst]
                `);
                await transaction.commit();
                await transaction.begin();
                let Section = await ProxyDbPool.request().query(`
                SELECT SECID, Name
                FROM [COSEC].[dbo].[Mx_SectionMst]
                `);
                await transaction.commit();
                await transaction.begin();
                let Category = await ProxyDbPool.request().query(`
                SELECT CTGID, Name
                FROM [COSEC].[dbo].[Mx_CategoryMst]
                `);
                await transaction.commit();
                await transaction.begin();
                await controllerLogger(req);
                return res.render("erpTransaction/pending_page", {page_header:"ERP Timesheet Data Pending",
                    Department:Department.recordset,
                    UserCategory:UserCategory.recordset,
                    Designation:Designation.recordset,
                    Section:Section.recordset,
                    Category:Category.recordset
                });
            } catch (error) {
                await transaction.rollback()
                throw error
            }
            
        } catch (error) {
            console.log("Error in erpTransactionPendingDataPage function : ",error)
            await controllerLogger(req,error);
            return res.render("erpTransaction/pending_page", {page_header:"ERP Timesheet Data Pending"});
        }
    },
    erpTransactionStatusPage:async(req, res)=>{
        try {
            await ProxyDbPool.connect();
            const transaction = new sql.Transaction(ProxyDbPool);
            await transaction.begin();
            let Department = await ProxyDbPool.request().query(`
            SELECT DPTID, Name
            FROM [COSEC].[dbo].[Mx_DepartmentMst]
            `);
            let UserCategory = await ProxyDbPool.request().query(`
            SELECT CG1ID, Name
            FROM [COSEC].[dbo].[Mx_CustomGroup1Mst]
            `);
            let Designation = await ProxyDbPool.request().query(`
            SELECT DSGID, Name
            FROM [COSEC].[dbo].[Mx_DesignationMst]
            `);
            let Section = await ProxyDbPool.request().query(`
            SELECT SECID, Name
            FROM [COSEC].[dbo].[Mx_SectionMst]
            `);
            let Category = await ProxyDbPool.request().query(`
            SELECT CTGID, Name
            FROM [COSEC].[dbo].[Mx_CategoryMst]
            `);
            await controllerLogger(req);
            return res.render("erpTransaction/status_page", {page_header:"ERP Timesheet Sync Completed",
                Department:Department.recordset,
                UserCategory:UserCategory.recordset,
                Designation:Designation.recordset,
                Section:Section.recordset,
                Category:Category.recordset
            });
           
        } catch (error) {
            console.log("Error in erpTransactionStatusPage function : ",error);
            await controllerLogger(req,error);
            return res.render("erpTransaction/status_page", {page_header:"ERP Timesheet Sync Completed"});
        }
    },
    erpTransactionSettingsPage:async(req, res)=>{
        try {
            await ProxyDbPool.connect();
            const transaction = new sql.Transaction(ProxyDbPool);
            await transaction.begin();
            let department = await ProxyDbPool.request().query(`
            SELECT DPTID, Name
            FROM [COSEC].[dbo].[Mx_DepartmentMst]
            `);
            let userCategory = await ProxyDbPool.request().query(`
            SELECT CG1ID, Name
            FROM [COSEC].[dbo].[Mx_CustomGroup1Mst]
            `);
            await controllerLogger(req);
            return res.render("erpTransaction/settings_page", {page_header:"ERP Sync Setting",department:department.recordset, userCategory:userCategory.recordset});
        } catch (error) {
            console.log("Error in erpTransactionSettingsPage function : ",error)
            await controllerLogger(req,error);
            return res.redirect("/")
        }
    },
    pushSelectedTimesheetPage:async(req, res)=>{
        try {
            await controllerLogger(req);
            return res.render("erpTransaction/selection_page", {page_header:"Push Selected Timesheet to ERP"});
        } catch (error) {
            console.log("Error in pushSelectedTimesheetPage function : ",error);
            await controllerLogger(req,error);
            return res.redirect("/")
        }
    },
    erpTransactionPendingHorizontalPage:async(req, res)=>{
        try {
            let db = req.app.locals.db;
            // await ProxyDbPool.connect();
            // const transaction = new sql.Transaction(ProxyDbPool);
            try {
                // await transaction.begin();
                let Department = await db.query(`
                SELECT DPTID, Name
                FROM [COSEC].[dbo].[Mx_DepartmentMst]
                `);
                // await transaction.commit();
                // await transaction.begin();
                let UserCategory = await db.query(`
                SELECT CG1ID, Name
                FROM [COSEC].[dbo].[Mx_CustomGroup1Mst]
                `);
                // await transaction.commit();
                // await transaction.begin();
                let Designation = await db.query(`
                SELECT DSGID, Name
                FROM [COSEC].[dbo].[Mx_DesignationMst]
                `);
                // await transaction.commit();
                // await transaction.begin();
                let Section = await db.query(`
                SELECT SECID, Name
                FROM [COSEC].[dbo].[Mx_SectionMst]
                `);
                // await transaction.commit();
                // await transaction.begin();
                let Category = await db.query(`
                SELECT CTGID, Name
                FROM [COSEC].[dbo].[Mx_CategoryMst]
                `);
                // await transaction.commit();
                // await transaction.begin();
                await controllerLogger(req);
                return res.render("erpTransaction/horizontal_report", {page_header:"ERP Timesheet Data for Sync",
                    Department:Department.recordset,
                    UserCategory:UserCategory.recordset,
                    Designation:Designation.recordset,
                    Section:Section.recordset,
                    Category:Category.recordset
                });
            } catch (error) {
                await transaction.rollback()
                throw error
            }
            
        } catch (error) {
            console.log("Error in erpTransactionPendingDataPage function : ",error)
            await controllerLogger(req,error);
            return res.render("erpTransaction/pending_page", {page_header:"ERP Timesheet Data Pending"});
        }
    }

}

module.exports={erpTransactionPageController};