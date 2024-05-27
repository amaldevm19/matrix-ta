
const atdController = {
    getAtdAttendancePage:async (req, res)=>{
        return res.render('atd',{page_header:"Autodrome Attendance Page"} )
    }
}

module.exports = {atdController};