const basicAuth = require('express-basic-auth');

const auth = basicAuth({
    users: { 'admin': 'P@ssw0rd' }
});

module.exports = auth;