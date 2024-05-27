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
            await ProxyDbPool.connect();
            const transaction = new sql.Transaction(ProxyDbPool);
            try {
                await transaction.begin();
                let Department = await ProxyDbPool.request().query(`
                SELECT DPTID, Name
                FROM [COSEC].[dbo].[Mx_DepartmentMst]
                `);
                await transaction.commit();
                await controllerLogger(req);
                return res.render('users/signup',{layout: 'login',Department:Department.recordset});
            } catch (error) {
                await transaction.rollback()
                throw error
            }
        } catch (error) {
            console.log("Error in erpTransactionPendingDataPage function : ",error)
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