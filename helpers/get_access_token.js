
async function getAccessToken(params) {
    const tokenEndpoint = process.env.TOKEN_ENDPOINT;
    const clientId = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    const resourceUrl = process.env.RESOURCE_URL;
    try {
        const response = await fetch(tokenEndpoint,
            {
                method: "POST",
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                    },
                body:new URLSearchParams({
                    grant_type:'client_credentials',
                    client_id: clientId,
                    client_secret: clientSecret,
                    resource: resourceUrl
                })
            }
        )
        const accessToken = await response.json();
        return accessToken;
    } catch (error) {
        return error;
    }    
}

module.exports= getAccessToken;
