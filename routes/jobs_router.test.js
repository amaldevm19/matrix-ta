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

describe("Testing /api/job/jobslist route", () => {
    it("It should respond with Jobs Assignment History JSON data", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.get("/api/job/jobslist").query({
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