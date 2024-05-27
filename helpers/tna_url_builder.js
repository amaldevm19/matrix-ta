
const tnaUrlBuilder ={
    timesheetUrl:({tna_username,tna_password,tna_url, date_range,employee_category})=>{
        tna_username = tna_username ? tna_username: process.env.TNA_USERNAME;
        tna_password = tna_password ? tna_password:process.env.TNA_PASSWORD;
        tna_url      = tna_url ? tna_url:"https://tna.up.ae/cosec/api.svc/v2/timesheet?action=get;";
        let url = `${tna_url}range=custom-group-3;id=${employee_category};date-range=${date_range};format=json`;
        let headers = new Headers();
        headers.set('Authorization', 'Basic ' + Buffer.from(tna_username + ":" + tna_password).toString('base64'));
        return {url, headers}
    }
}

module.exports ={tnaUrlBuilder}