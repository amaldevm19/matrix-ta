const {sql,ProxyDbPool} = require('../config/db');
const {controllerLogger} = require("../helpers/19_middleware_history_logger");

const bioTimesheetPageController = {
    bioTimesheetHomePage:async (req, res)=>{
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
            return res.render("bioTimesheet", {page_header:"Timesheet for last 34 days",
                Department:Department.recordset,
                UserCategory:UserCategory.recordset,
                Designation:Designation.recordset,
                Section:Section.recordset,
                Category:Category.recordset
            });
        } catch (error) {
            console.log("Error in bioTimesheetHomePage function : ",error)
            await controllerLogger(req,error);
            return res.render("bioTimesheet", {page_header:"Timesheet for last 34 days"});
        }
    },
    bioTimesheetReportHorizontalPage:async(req, res)=>{
        try {
            let db = req.app.locals.db;
            let IsAdmin = req.session.user.IsAdmin;
            let EmployeeBranch = req.session.user.Branch;
            let whereclause=''
            if(!IsAdmin){
                switch (EmployeeBranch) {
                    case '1':
                        whereclause="WHERE Name LIKE 'SRU%'"
                        break;
                    case '5':
                        whereclause="WHERE Name LIKE 'TFO%'"
                        break;
                }
            }
            let Department = await db.query(`
            SELECT DPTID, Name
            FROM [COSEC].[dbo].[Mx_DepartmentMst]
            ${whereclause}
            `);
            let UserCategory = await db.query(`
            SELECT CG1ID, Name
            FROM [COSEC].[dbo].[Mx_CustomGroup1Mst]
            ${whereclause}
            `);
            let Designation = await db.query(`
            SELECT DSGID, Name
            FROM [COSEC].[dbo].[Mx_DesignationMst]
            `);
            let Section = await db.query(`
            SELECT SECID, Name
            FROM [COSEC].[dbo].[Mx_SectionMst]
            ${whereclause}
            `);
            await controllerLogger(req);
            return res.render("bioTimesheet/biotimesheet_horizontal_report", {page_header:"Biometric Timesheet Horizontal Report",
                Department:Department.recordset,
                UserCategory:UserCategory.recordset,
                Designation:Designation.recordset,
                Section:Section.recordset
            });
        } catch (error) {
            console.log("Error in bioTimesheetReportHorizontalPage function : ",error)
            await controllerLogger(req,error);
            return res.render("bioTimesheet/biotimesheet_horizontal_report", {page_header:"Biometric Timesheet Horizontal Report"});
        }
    },
    bioTimesheetComparePage:async(req,res)=>{
        try {
            let db = req.app.locals.db;
            let Department = await db.query(`
            SELECT DPTID, Name
            FROM [COSEC].[dbo].[Mx_DepartmentMst]
            `);
            let UserCategory = await db.query(`
            SELECT CG1ID, Name
            FROM [COSEC].[dbo].[Mx_CustomGroup1Mst]
            `);
            let Designation = await db.query(`
            SELECT DSGID, Name
            FROM [COSEC].[dbo].[Mx_DesignationMst]
            `);
            let Section = await db.query(`
            SELECT SECID, Name
            FROM [COSEC].[dbo].[Mx_SectionMst]
            `);
            let Category = await db.query(`
            SELECT CTGID, Name
            FROM [COSEC].[dbo].[Mx_CategoryMst]
            `);
            await controllerLogger(req);
            return res.render("bioTimesheet/bioTimesheet-compare", {page_header:"Timesheet comparison Table",
                Department:Department.recordset,
                UserCategory:UserCategory.recordset,
                Designation:Designation.recordset,
                Section:Section.recordset,
                Category:Category.recordset
            });
        } catch (error) {
            console.log("Error in bioTimesheetComparePage function : ",error)
            await controllerLogger(req,error);
            return res.render("bioTimesheet-compare", {page_header:"Error in Timesheet comparison Table"});
        }
    }
}

module.exports = {bioTimesheetPageController}