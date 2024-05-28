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
            size:100,
            UserID:"",
            CreatedBy:"",
            JobCode:"",
            FromDate:"",
            ToDate:"",
            CreatedAt:"",
            DepartmentId:"",
            Status :""
        });
        console.log(response.headers)
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe("ok");
        expect(response.headers['content-type']).toMatch(/json/);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        
    });
});