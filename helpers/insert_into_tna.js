

async function insertItem(query) {
    
    let url = process.env.TNA_URL + query;
    let tna_username = process.env.TNA_USERNAME;
    let tna_password = process.env.TNA_PASSWORD;
    let headers = new Headers();
    headers.set('Authorization', 'Basic ' + Buffer.from(tna_username + ":" + tna_password).toString('base64'));
    
    let response = await fetch(url,{method:'GET',headers:headers});
    const json = await response.text();
    if(json.includes("successful")){
        return {status:true, message:json};
    }else {
        return {status:false, message:json};
    }
    //const data = JSON.parse(json);
    //return data;
}
async function getItem(query,parameter,parameter_value,item) {
    let url = process.env.TNA_URL + query;
    let tna_username = process.env.TNA_USERNAME;
    let tna_password = process.env.TNA_PASSWORD;
    let headers = new Headers();
    headers.set('Authorization', 'Basic ' + Buffer.from(tna_username + ":" + tna_password).toString('base64'));
    
    let response = await fetch(url,{method:'GET',headers:headers});
    const json = await response.text();
    let id = "";
    if(json.includes("failed")){
        return id;
    }
    const data = JSON.parse(json);
    data[item].forEach(value=>{
        if(value[parameter] == parameter_value){
            id = value.id;
        }
    });
    return id;
}

module.exports = {insertItem,getItem};