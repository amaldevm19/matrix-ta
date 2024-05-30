
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



describe("Testing /erp-transactions/pending-data route", () => {
    it("It should respond with ERP Timesheet Data Pending Page", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.get("/erp-transactions/pending-data");

        expect(response.statusCode).toBe(200);
        expect(response.text).toContain('<title>TNA PROXY SERVER | ERP Timesheet Data Pending</title>');
        expect(response.text).toContain('<h4 class="mx-auto">ERP Timesheet Data Pending</h4>');
    });
});

describe("Testing /api/erp-transaction/pending-data route", () => {
    it("It should respond with ERP Timesheet Data Pending JSON data", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.get("/api/erp-transaction/pending-data").query({
            page:1,
            size:10,
            EmployeeId:"",
            FromDate:"",
            ToDate:"",
            JobCode:"",
            DepartmentId:"",
            UserCategoryId:"",
            EmployeeCategoryId:"",
            DesignationId:"",
            SectionId:"",
            Error:""
        });
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe("ok");
        expect(response.headers['content-type']).toMatch(/json/);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        
    });
});



describe("Testing /erp-transactions/status route", () => {
    it("It should respond with ERP Timesheet Sync Completed Page", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.get("/erp-transactions/status");

        expect(response.statusCode).toBe(200);
        expect(response.text).toContain('<title>TNA PROXY SERVER | ERP Timesheet Sync Completed</title>');
        expect(response.text).toContain('<h4 class="mx-auto">ERP Timesheet Sync Completed</h4>');
    });
});

describe("Testing /api/erp-transaction/status route", () => {
    it("It should respond with ERP Timesheet Sync Completed JSON data", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.get("/api/erp-transaction/status").query({
            page:1,
            size:10,
            EmployeeId:"",
            FromDate:"",
            ToDate:"",
            JobCode:"",
            DepartmentId:"",
            UserCategoryId:"",
            EmployeeCategoryId:"",
            DesignationId:"",
            SectionId:""
        });
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe("ok");
        expect(response.headers['content-type']).toMatch(/json/);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        
    });
});v