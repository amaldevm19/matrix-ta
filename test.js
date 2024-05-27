const EventEmitter = require("node:events");
const dataBaseReadWriteEvents = new EventEmitter();

let enabled =false;

dataBaseReadWriteEvents.on("on",()=>{
    console.log("Called ON")
    enabled = true
})
dataBaseReadWriteEvents.on("off",()=>{
    console.log("Called OFF")
    enabled = false
})
function call1(){
    console.log("called")
    dataBaseReadWriteEvents.emit("on")
}
 function call2(){
    dataBaseReadWriteEvents.emit("off")
}
setTimeout(call1,2000)
setTimeout(call2,10000)
while(1){
    
    while(enabled){
        
    }
   
}




