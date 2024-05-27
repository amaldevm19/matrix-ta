let message = `#### - ${req.socket.remoteAddress} has send ${req.body} ### \n`
fs.appendFile(path.join(__dirname, 'logs','addNewBranch.txt'), message, function (err) {
    if (err) throw err;
    console.log('Saved!');
    
});