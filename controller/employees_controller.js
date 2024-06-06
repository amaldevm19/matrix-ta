
const employeesController = {
    getHourDeductionPage:async(req,res)=>{
        return res.render("employees/hourDedudctionPage",{page_header:"Employee Hour Deduction Settings Page"})
    }
}

module.exports = employeesController