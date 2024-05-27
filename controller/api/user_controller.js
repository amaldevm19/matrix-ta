const bcrypt = require('bcryptjs');
const {controllerLogger} = require("../../helpers/19_middleware_history_logger");

const userApiController = {
    loginFunction: async (req, res) => {
        const {employeeID, password} = req.body;
        const url = req.session.requestedUrl;
        let db = req.app.locals.db;
        if(!employeeID || !password){
            return res.status(200).json({data:"",status:"not ok",error:"Please provide valid EmployeeID and Password"});
        }
        try {
            const result = await db.query(
                `SELECT EmployeeId, Email, Department, Password, IsValid,IsCoordinator, IsAdmin, IsSuperAdmin FROM [TNA_PROXY].[dbo].[Px_Users] WHERE EmployeeId = '${employeeID}'`
            );
          
            if (result.recordset.length === 0) {
            throw {message:'Invalid username or password'};
            }
            const user = result.recordset[0];
            if(!user.Password){
                req.session.user = user;
                return res.status(200).json({data:'/users/passwordreset',status:"ok",error:""});
            }
            const isPasswordValid = await bcrypt.compare(password, user.Password);

            if (!isPasswordValid) {
                throw {message:'Invalid username or password'};
            }
            if(!user.IsValid){
                throw {message:'Waiting for admin approval'};
            }
            req.session.user = user;
            req.session.requestedUrl = null;
            await controllerLogger(req)
            return res.status(200).json({data:url,status:"ok",error:""});
        } catch (error) {
            await controllerLogger(req, error)
            return res.status(200).json({data:"",status:"not ok",error:error.message});
        }
        
    },
    signupFunction: async (req, res) => {
        const {employeeID,employeeEmail, password, departmentId} = req.body;
        if(!employeeID || !password || !employeeEmail || !departmentId){
            throw ({message:"Please provide valid EmployeeID, employeeEmail, and Password"})
        }
        let db = req.app.locals.db;
        try {
            let validUser = await db.query(`
            SELECT 1
                FROM [COSEC].[dbo].[Mx_UserMst]
                WHERE UserID = '${employeeID}'
            `)
            if(!validUser?.recordset[0]){
                throw ({message:"EmployeeID is not present in Biometric"})
            }
            const hashedPassword = await bcrypt.hash(password, 10);
            let db_response = await db.query(`
            INSERT INTO [TNA_PROXY].[dbo].[Px_Users] (EmployeeId,Email, Password, Department) 
            VALUES ('${employeeID}','${employeeEmail}', '${hashedPassword}', '${departmentId}')
            `);
            if(db_response.rowsAffected > 0){
                await controllerLogger(req)
                return res.status(200).json({data:"Successfully registered, wait for admin approval",status:"ok",error:""})
            }
        } catch (error) {
            console.log(error)
            await controllerLogger(req, error)
            return res.status(200).json({data:"",status:"not ok",error:error.message});
        }
        
    },
    resetPasswordFunction:async(req,res)=>{
        const {employeeID, password} = req.body;
        console.log()
        if(!employeeID || !password ){
            throw ({message:"Please provide valid EmployeeID, employeeEmail, and Password"})
        }
        let db = req.app.locals.db;
        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            let db_response = await db.query(`
            UPDATE [TNA_PROXY].[dbo].[Px_Users] 
            SET Password='${hashedPassword}'
            WHERE EmployeeId='${employeeID}'
            `);
            if(db_response.rowsAffected > 0){
                await controllerLogger(req)
                return res.status(200).json({data:"Successfully changed password",status:"ok",error:""})
            }
        } catch (error) {
            console.log(error)
            await controllerLogger(req, error)
            return res.status(200).json({data:"",status:"not ok",error:error.message});
        }
    },
    getAdminPgeData:async(req,res)=>{
        try {
            let db = req.app.locals.db;
            let db_response = await db.query(`
            SELECT 
            Subquery.*,
            DepartmentMst.Name AS DepartmentName
            FROM (
                SELECT *
                FROM [TNA_PROXY].[dbo].[Px_Users]
            ) AS Subquery
            JOIN [COSEC].[dbo].[Mx_DepartmentMst] AS DepartmentMst ON Subquery.Department = DepartmentMst.DPTID
            `);

            if(db_response?.recordset){
                await controllerLogger(req)
                return  res.status(200).json({data:db_response.recordset,status:"ok",error:""})
            }

        } catch (error) {
            console.log(error)
            await controllerLogger(req, error)
            return res.status(200).json({data:"",status:"not ok",error:error.message});
        }
    },
    changeUserStatus:async(req, res)=>{
        try {
            let {id,IsAdmin,IsValid,IsCoordinator,IsSuperAdmin} = req.body
            let db = req.app.locals.db;
            let db_response = await db.query(`
                UPDATE [TNA_PROXY].[dbo].[Px_Users]
                SET
                IsAdmin = ${IsAdmin !== undefined ? (IsAdmin ? '1' : '0') : 'IsAdmin'},
                IsValid = ${IsValid !== undefined ? (IsValid ? '1' : '0') : 'IsValid'},
                IsCoordinator = ${IsCoordinator !== undefined ? (IsCoordinator ? '1' : '0') : 'IsCoordinator'},
                IsSuperAdmin = ${IsSuperAdmin !== undefined ? (IsSuperAdmin ? '1' : '0') : 'IsSuperAdmin'}
                WHERE Id=${id}
            `)
            if(db_response?.rowsAffected){
                await controllerLogger(req)
                return  res.status(200).json({data:true,status:"ok",error:""})
            }
            
        } catch (error) {
            console.log(error)
            await controllerLogger(req, error)
            return res.status(200).json({data:"",status:"not ok",error:error.message});
        }
    },
    passwordReset:async(req,res)=>{
        try {
            let {id,EmployeeId} = req.body
            let db = req.app.locals.db;
            let db_response = await db.query(`
                UPDATE [TNA_PROXY].[dbo].[Px_Users]
                SET
                Password = ''
                WHERE id=${id} AND employeeId='${EmployeeId}'
            `)
            if(db_response?.rowsAffected){
                await controllerLogger(req)
                return  res.status(200).json({data:true,status:"ok",error:""})
            }
        } catch (error) {
            console.log(error)
            await controllerLogger(req, error)
            return res.status(200).json({data:"",status:"not ok",error:error.message});
        }
    }
}

module.exports = userApiController