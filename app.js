// node modules

const path = require('path');
const dotenvAbsolutePath = path.join(__dirname, './.env');
const requestIp = require('request-ip');
//external modules
const express = require('express');
const cookieParser = require('cookie-parser');
const logger = require('morgan');
const rfs = require('rotating-file-stream');
const dotenv = require('dotenv').config({
    path: dotenvAbsolutePath
  });
  if (dotenv.error) {
    throw dotenv.error;
  }


const { engine } =require('express-handlebars');
const session = require('express-session');
const timeout = require('connect-timeout')





// Project specifc modules

const {CosecDbPool,initializeConnectionPool} = require("./config/db");
const auth = require("./middlewares/auth");
const {isAuthenticated, isAdmin} = require("./middlewares/isAuthenticated")


const { copyTimesheetFromCosecToProxyDbSchedule } = require("./helpers/01_timesheet_scheduler")
let {PxERPTransactionTableBuilderScheduler, PxERPTransactionTableBuilderScheduleHandleArray} = require("./helpers/03_erp_transaction_table_scheduler");
let {erpTransactionScheduler} = require("./helpers/06_erp_transaction_scheduler");

//API Routes
const atdApiRouter = require('./routes/api/atd_timesheet_api_router');
const jobsApiRouter = require('./routes/api/jobs_router');
const employeeApiRouter = require('./routes/api/employee_router');
const branchApiRouter = require('./routes/api/branch_router');
const departmentApiRouter = require('./routes/api/department_router');
const designationApiRouter = require('./routes/api/designation_router');
const erpTransactionApiRouter = require('./routes/api/erp_transaction_router');
const leaveApiRouter = require('./routes/api/leave_router');
const userApiRouter = require('./routes/api/user_router')
const bioTimesheetApiRouter = require("./routes/api/bio_timesheet_api_router")
const eventsApiRouter = require('./routes/api/events_api_router');
const employeesApiRouter = require('./routes/api/employees_router');

//Page routes
const designationPageRouter = require('./routes/designation_page_router');
const atdRouter = require('./routes/atd_router');
const eventsRouter = require('./routes/events_router');
const homeRouter = require('./routes/home_router');
const jobsRouter = require('./routes/jobs_router');
const erpTransactionPageRouter = require("./routes/erp_transaction_page_router");
const bioTimesheetRouter = require("./routes/bio_timesheet_page_router")
const userRouter = require('./routes/user_router');
const employeesRouter = require('./routes/employees_router');

const {historyLogger} = require("./middlewares/historyLoggerMiddleware")



const app = express();


app.use(
  session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } 
  })
);
app.use(express.static(path.join(__dirname, 'views'))) 
app.use(express.static(path.join(__dirname, 'public'))) 

app.use(requestIp.mw());
app.engine('.hbs', engine({extname: '.hbs'}));
app.set('view engine', '.hbs');
app.set('views', path.join(__dirname,'views'));

app.use(express.json({limit: '5mb'}));
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(process.cwd(), 'public')));
app.use(timeout('600s'))


CosecDbPool.connect().then(function(pool) {
    app.locals.db = pool;
    console.log("DB Connected")
}).catch(function(err) {
    console.error('Error creating connection pool', err)
});

app.use((req, res, next) => {
  res.locals.session = req.session;
  next();
});


//ERP API Routes
app.use('/api/branch',historyLogger,auth, branchApiRouter);
app.use('/api/department',historyLogger,auth, departmentApiRouter);
app.use('/api/designation',historyLogger,auth, designationApiRouter);
app.use('/api/leave',historyLogger,auth,leaveApiRouter);
app.use('/api/projects',historyLogger,auth, jobsApiRouter);
app.use('/api/employee',historyLogger,auth, employeeApiRouter);


//Other API routed
app.use('/api/designations',historyLogger,isAuthenticated, designationApiRouter);
app.use('/api/atd-timesheet',atdApiRouter)
app.use('/api/events',historyLogger,isAuthenticated,eventsApiRouter);
app.use('/api/bio-timesheet',historyLogger,isAuthenticated, bioTimesheetApiRouter);
app.use('/api/erp-transaction',historyLogger,isAuthenticated, erpTransactionApiRouter);
app.use('/api/jobs',historyLogger,isAuthenticated,jobsApiRouter);
app.use('/api/users',historyLogger,userApiRouter);
app.use('/api/employees',historyLogger,employeesApiRouter)

//Pages Routes
app.use('/designation',historyLogger,isAuthenticated,designationPageRouter)
app.use('/atd',atdRouter)
app.use('/events',historyLogger,isAuthenticated,eventsRouter);
app.use('/bio-timesheet',historyLogger,isAuthenticated, bioTimesheetRouter);
app.use('/erp-transactions',historyLogger,isAuthenticated,erpTransactionPageRouter);
app.use('/users',historyLogger,userRouter);
app.use('/jobs',historyLogger,isAuthenticated, jobsRouter);
app.use('/employees',historyLogger,isAuthenticated, employeesRouter);
app.use('/', homeRouter);


async function ScheduleCreator() {
  let erpTransactionSchedulerHandle = await erpTransactionScheduler();
  let PxERPTransactionTableBuilderSchedulerHandle = await PxERPTransactionTableBuilderScheduler();
  let copyTimesheetFromCosecToProxyDbScheduleHandle = await copyTimesheetFromCosecToProxyDbSchedule();
  PxERPTransactionTableBuilderSchedulerHandle?.start();
  erpTransactionSchedulerHandle?.start();
  copyTimesheetFromCosecToProxyDbScheduleHandle?.start();
}

console.log( "Current DateTime: ",new Date().toLocaleString())

ScheduleCreator();

module.exports = app;
