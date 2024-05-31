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

describe("Testing /atd/ route", () => {
    it("It should respond with Autodrome Attendance Page", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.get("/atd/");

        expect(response.statusCode).toBe(200);
        expect(response.text).toContain('<title>TNA PROXY SERVER | Autodrome Attendance Page</title>');
        expect(response.text).toContain('<h4 class="mx-auto">Autodrome Attendance Page</h4>');
    });
});

describe("Testing /api/atd-timesheet route", () => {
    it("It should respond with Autodrome Attendance Page JSON data", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.get("/api/atd-timesheet").query({
            page:1,
            size:10,
            UserID:"",
            FromDate:"",
            ToDate:""
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe("OK");
        expect(response.headers['content-type']).toMatch(/json/);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
    });
});