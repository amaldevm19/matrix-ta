
async function getAccessToken(params) {
    let d365_resource_url;
    switch (global.d365_server) {
        case "dev":
            d365_resource_url = process.env.DEV_RESOURCE_URL
            break;
        case "uat":
            d365_resource_url = process.env.UAT_RESOURCE_URL
            break;
        case "prod":
            d365_resource_url = process.env.PROD_RESOURCE_URL
            break;
        default:
            break;
    }
    try {
        const response = await fetch(process.env.TOKEN_ENDPOINT,
            {
                method: "POST",
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                    },
                body:new URLSearchParams({
                    grant_type:'client_credentials',
                    client_id: process.env.CLIENT_ID,
                    client_secret: process.env.CLIENT_SECRET,
                    resource: d365_resource_url
                })
            }
        )
        const accessToken = await response.json();
        //console.log("accessToken",accessToken);
        return accessToken;
    } catch (error) {
        return error;
    }    
}

module.exports= getAccessToken;
