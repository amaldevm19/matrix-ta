

async function getOrSetFromTna(params) {
    //console.log("Call to getOrSetFromTna")
    try {
        let tna_username = process.env.TNA_USERNAME;
        let tna_password = process.env.TNA_PASSWORD;
        let tna_url = process.env.TNA_URL+params;
        let headers = new Headers();
        headers.set('Authorization', 'Basic ' + Buffer.from(tna_username + ":" + tna_password).toString('base64'));
        //console.log("TNA Url is : "+tna_url)
        let response = await fetch(tna_url,{method:'GET',headers:headers});
        // console.log("Awaiting Response")
        const json = await response.text();
        if(json.includes("success")){
            // console.log("inside success = ",json)
            return {status:"ok",error:"",data:json}
        }else if(json.includes("fail")){
            // console.log("inside fail = ",json)
            return {status:"failed",error:json,data:""}
        }else{
            // console.log("inside nothing json= ",json)
            const data = JSON.parse(json);
            // console.log("inside nothing data= ",data)
            return {status:"ok",error:"",data:data}
        }
        
    } catch (error) {
        console.log("Error in getOrSetFromTna function : ",error);
    }
}

module.exports = getOrSetFromTna;