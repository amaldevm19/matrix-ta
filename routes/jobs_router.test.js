const request = require("supertest");
const app = require("../app");

let cookie;


beforeAll(async () => {
    const response = await request(app)
        .post("/api/users/login")
        .send({
            employeeID: "25002",
            password: "123456"
        }).set('Accept', 'application/json');

    expect(response.statusCode).toBe(200);
    cookie = response.headers['set-cookie']; // Capture the session cookie
});

describe("Testing /jobs/assign-jobs-manually route", () => {
    it("It should respond with Assign Jobs To Employees Using CSV file", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.get("/jobs/assign-jobs-manually");

        expect(response.statusCode).toBe(200);
        expect(response.text).toContain('<title>TNA PROXY SERVER | Assign Jobs To Employees Using CSV file</title>');
        expect(response.text).toContain('<h4 class="mx-auto">Assign Jobs To Employees Using CSV file</h4>');
    });
});

describe("Testing /jobs/assign-jobs-manually-history route", () => {
    it("It should respond with View Job Assignment History Page", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.get("/jobs/assign-jobs-manually-history");

        expect(response.statusCode).toBe(200);
        expect(response.text).toContain('<title>TNA PROXY SERVER | View Job Assignment History</title>');
        expect(response.text).toContain('<h4 class="mx-auto">View Job Assignment History</h4>');
    });
});

describe("Testing /api/jobs/assignment/history route", () => {
    it("It should respond with Jobs Assignment History JSON data", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.get("/api/jobs/assignment/history").query({
            page:1,
            size:10,
            UserID:"",
            CreatedBy:"",
            JobCode:"",
            FromDate:"",
            ToDate:"",
            CreatedAt:"",
            DepartmentId:"",
            Status :""
        });
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe("ok");
        expect(response.headers['content-type']).toMatch(/json/);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        
    });
});

describe("Testing /jobs/jobslist route", () => {
    it("It should respond with Edit Maximum Allowed Job Hours Per Day Page", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.get("/jobs/jobslist");

        expect(response.statusCode).toBe(200);
        expect(response.text).toContain('<title>TNA PROXY SERVER | Edit Maximum Allowed Job Hours Per Day</title>');
        expect(response.text).toContain('<h4 class="mx-auto">Edit Maximum Allowed Job Hours Per Day</h4>');
    });
});

describe("Testing /api/jobs/joblist route", () => {
    it("It should respond with Jobs Assignment History JSON data", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.get("/api/jobs/joblist").query({
            page:1,
            size:10,
            searchField:""
        });
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe("OK");
        expect(response.headers['content-type']).toMatch(/json/);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        
    });
});

describe("Testing /jobs/search-jobs route", () => {
    it("It should respond with Search all users assigned with a given job number Page", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.get("/jobs/search-jobs");

        expect(response.statusCode).toBe(200);
        expect(response.text).toContain('<title>TNA PROXY SERVER | Search all users assigned with a given job number</title>');
        expect(response.text).toContain('<h4 class="mx-auto">Search all users assigned with a given job number</h4>');
    });
});


describe("Testing /jobs/attendance-correction route", () => {
    it("It should respond with Edit Attendance Correction Using CSV file Page", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.get("/jobs/attendance-correction");

        expect(response.statusCode).toBe(200);
        expect(response.text).toContain('<title>TNA PROXY SERVER | Attendance Correction Using CSV file</title>');
        expect(response.text).toContain('<h4 class="mx-auto">Attendance Correction Using CSV file</h4>');
    });
});

describe("Testing /api/jobs/attendance-correction route", () => {
    it("It should respond with Successfully uploaded JSON data", async () => {
        const d = new Date();
        let secondsString = `${d.getSeconds()}`.padStart(2,0);
        let dateString = `${d.getDate()}`.padStart(2,0);
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.post("/api/jobs/attendance-correction").send({
            jsonData : [{UserID:"25002", AttendanceDate:`${dateString}/03/2024`,InTime:`08:${secondsString}`,OutTime:`16:${secondsString}`}],
            CreatedBy:"25002",
            DepartmentId:"17"
        });
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe("ok");
        expect(response.headers['content-type']).toMatch(/json/);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        
    });
});


describe("Testing /jobs/attendance-correction-history route", () => {
    it("It should respond with View Attendance Correction History Page", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.get("/jobs/attendance-correction-history");

        expect(response.statusCode).toBe(200);
        expect(response.text).toContain('<title>TNA PROXY SERVER | View Attendance Correction History</title>');
        expect(response.text).toContain('<h4 class="mx-auto">View Attendance Correction History</h4>');
    });
});

describe("Testing /api/jobs/attendance-correction-history-data route", () => {
    it("It should respond with Jobs Assignment History JSON data", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.get("/api/jobs/attendance-correction-history-data").query({
            page:1,
            size:10,
            UserID:"",
            CreatedBy:"",
            FromDate:"",
            ToDate:"",
            CreatedAt:"",
            DepartmentId:"",
            Status:""
        });
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe("ok");
        expect(response.headers['content-type']).toMatch(/json/);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        
    });
});




describe("Testing /jobs/timesheet-correction route", () => {
    it("It should respond with Exisiting Timesheet Correction Application Page", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.get("/jobs/timesheet-correction");

        expect(response.statusCode).toBe(200);
        expect(response.text).toContain('<title>TNA PROXY SERVER | Exisiting Timesheet Correction Application</title>');
        expect(response.text).toContain('<h4 class="mx-auto">Exisiting Timesheet Correction Application</h4>');
    });
});

describe("Testing /api/jobs/timesheet-correction route", () => {
    it("It should respond with Exisiting Timesheet Correction Application JSON data", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.post("/api/jobs/timesheet-correction").send({
            dateRange:"20240411-20240412",
            section:"2",
            application_status:"1"
        });
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe("ok");
        expect(response.headers['content-type']).toMatch(/json/);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        
    });
});
