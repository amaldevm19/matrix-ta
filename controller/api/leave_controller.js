const getOrSetFromTna = require("../../helpers/15_get_or_set_from_tna");
const {controllerLogger} = require("../../helpers/19_middleware_history_logger");

const leaveApiController = {
    applyLeave:async(req, res)=>{
        try {
            let {employee_id,start_date,end_date} = req.body;
            if(!employee_id ||!start_date || !end_date){
                throw{message:"Values must not be empty"}
            }
            employee_id = employee_id.replace(/[^A-Za-z0-9]/g,'');
            start_date = start_date.split("-");
            start_date = `${start_date[2]}${start_date[1]}${start_date[0]}`;
            end_date = end_date.split("-");
            end_date = `${end_date[2]}${end_date[1]}${end_date[0]}`
            const {status, data, error} = await getOrSetFromTna(`leave-application?action=set;userid=${employee_id};start-date=${start_date};end-date=${end_date};leave-code=L;`)
            if(status == "ok"){
                await controllerLogger(req);
                return res.status(200).json({status:"ok",error:"",data:data})
            }else{
                throw{message:error}
            }
        } catch (error) {
            console.log("Error in applyLeave function : ",error);
            await controllerLogger(req,error)
            return res.status(200).json({status:"failed", error:error.message, data:""})
        }
    },
    updateLeave:async (req, res)=>{
        try {
            let {employee_id,start_date,new_end_date, new_start_date} = req.body;
            let modified_start_date= null;
            let modified_end_date= null;
            if(!employee_id ||!start_date){
                throw{message:"Employee ID with leave applied start date is must"}
            }
            employee_id = employee_id.replace(/[^A-Za-z0-9]/g,'');
            start_date = start_date.split("-");
            start_date = `${start_date[1]}/${start_date[2]}/${start_date[0]}`;
            if(new_end_date){
                new_end_date = new_end_date.split("-");
                modified_end_date = `${new_end_date[2]}${new_end_date[1]}${new_end_date[0]}`;
            }
            if(new_start_date){
                new_start_date = new_start_date.split("-");
                modified_start_date = `${new_start_date[2]}${new_start_date[1]}${new_start_date[0]}`;
            }
            const {status, data, error} = await getOrSetFromTna(`leave-application?action=get;userid=${employee_id};format=json`)
            if(status=="ok"){
                let tid = null;
                for (let index = 0; index < data["leave-application"].length; index++) {
                    const element = data["leave-application"][index];
                    if(element["start-date"] == start_date){
                        tid = element.tid;
                        break;
                    }
                }
                let leave_update_response = await getOrSetFromTna(`leave-application?action=update;request-type=0;userid=${employee_id};tid=${tid};${modified_start_date?'start-date='+modified_start_date:""};${modified_end_date?'end-date='+modified_end_date:""}`);
                if(leave_update_response.status == "ok"){
                    await controllerLogger(req)
                    return res.status(200).json({status:"ok",error:"",data:leave_update_response.data})
                }else{
                    throw{message:leave_update_response.error}
                }            
            }else{
                throw{message:error}
            }
        } catch (error) {
            console.log("Error in updateLeave function : ",error);
            await controllerLogger(req,error)
            return res.status(200).json({status:"failed", error:error.message, data:""});
        }
    },
    cancelLeave:async (req, res)=>{
        try {
            let {employee_id,start_date} = req.body;
            if(!employee_id ||!start_date){
                throw{message:"Employee ID with leave applied start date is must"}
            }
            employee_id = employee_id.replace(/[^A-Za-z0-9]/g,'');
            start_date = start_date.split("-");
            const {status, data, error} = await getOrSetFromTna(`leave-application?action=get;userid=${employee_id};format=json`)
            if(status=="ok"){
                let tid = null;
                let start_date_for_compare = `${start_date[1]}/${start_date[2]}/${start_date[0]}`;
                for (let index = 0; index < data["leave-application"].length; index++) {
                    const element = data["leave-application"][index];
                    if(element["start-date"] == start_date_for_compare){
                        tid = element.tid;
                        break;
                    }
                }
                let date=(parseInt((Math.random()*100)%29)+1).toString().padStart(2,"0");
                let month = (parseInt((Math.random()*100)%11)+1).toString().padStart(2,"0");
                let leave_update_response = await getOrSetFromTna(`leave-application?action=update;request-type=0;userid=${employee_id};tid=${tid};start-date=${date}${month}2010;end-date=${date}${month}2010; leave-code=XL;`);
                if(leave_update_response.status == "ok"){
                    await controllerLogger(req);
                    return res.status(200).json({status:"ok",error:"",data:leave_update_response.data})
                }else{
                    throw{message:leave_update_response.error}
                }            
            }else{
                throw{message:error}
            }
        } catch (error) {
            console.log("Error in cancelLeave function : ",error);
            await controllerLogger(req,error)
            return res.status(200).json({status:"failed", error:error.message, data:""});
        }
    }

}

module.exports = leaveApiController;