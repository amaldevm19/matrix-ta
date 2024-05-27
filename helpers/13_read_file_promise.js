const {parse } = require('csv-parse');

const readFilePromise = (fileData) => {
    return new Promise((resolve, reject) => {
        parse(fileData,(err, records)=>{
            if(err){
                reject({err,records:""})
            } else{
                resolve({records,err:""})
            }
        })
    })
  }

module.exports = readFilePromise