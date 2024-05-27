const multer  = require('multer');
const path = require('node:path');

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname,'..','public','uploads'));
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9)
      cb(null, uniqueSuffix+"-"+file.originalname)
    }
  })
  const csvstorage = multer.diskStorage({
    destination: function (req, file, cb) {
      cb(null, path.join(__dirname,'..','public','uploads','temp'))
    },
    filename: function (req, file, cb) {
      const uniqueSuffix = 'tempFile.csv'
      cb(null, uniqueSuffix)
    }
  })
  
  const upload = multer({ storage: storage })
  const csvupload = multer({ storage: csvstorage })

  module.exports={upload, csvupload};