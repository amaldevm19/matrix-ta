const {sql,ProxyDbPool} = require('../config/db');
const {controllerLogger} = require("../helpers/19_middleware_history_logger");
const path = require('path');

const userController = {
    getLoginPage: async (req, res) => {
        try {
            req.session.requestedUrl = req.query.url
            await controllerLogger(req);
            return res.render('users/login',{layout: 'login'});
        } catch (error) {
            console.log("Error in getLoginPage function : ",error)
            await controllerLogger(req,error);
        }

    },
    getSignupPage: async (req, res) => {
        try {
            let db = req.app.locals.db;
            try {
                let DepartmentData = await db.query(`
                SELECT DPTID, Name
                FROM [COSEC].[dbo].[Mx_DepartmentMst]
                `);
                let BranchData = await db.query(`
                SELECT BRCID, Name
                FROM [COSEC].[dbo].[Mx_BranchMst]
                `);
                await controllerLogger(req);
                return res.render('users/signup',{layout: 'login',Department:DepartmentData.recordset, Branch:BranchData.recordset});
            } catch (error) {
                throw error
            }
        } catch (error) {
            console.log("Error in getSignupPage function : ",error)
            await controllerLogger(req,error);
        }
        
    }, 
    getLogoutFunction: async(req,res)=>{
        req.session.user = null;
        await controllerLogger(req);
        return res.redirect('/users/login')
    },
    getAdminPge:async(req, res)=>{
        return res.render("users/admin",{page_header:"Admin Dashboard"})
    },
    getResetPasswordPage:async(req,res)=>{
        return res.render("users/passwordreset",{page_header:"Reset your password"})
    }
}

module.exports = userController