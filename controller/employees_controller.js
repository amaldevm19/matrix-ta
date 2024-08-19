
const employeesController = {
    getHourDeductionPage:async(req,res)=>{
        console.log(global.d365_server);
        return res.render("employees/hourDedudctionPage",{page_header:"Employee Hour Deduction Settings Page"})
    },
    getMaxWorkHourSettingPage:async (req, res)=>{
        return res.render("employees/maxWorkHourSettingPage",{page_header:"Employee Max Workhour Settings Page"})
    }
}

module.exports = employeesController