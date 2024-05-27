const fs = require('fs');

const path = require('node:path');

const clearTemp = (req, res, next)=>{
    fs.readdir(path.join(__dirname,'..','public','uploads', 'temp'), (err, files) => {
        if (err) throw err;
        for (const file of files) {
            fs.unlinkSync(path.join(__dirname,'..','public','uploads', 'temp', file));
        } 
    });
    next();
}

module.exports = clearTemp;
   
