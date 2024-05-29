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

describe("Testing /bio-timesheet route", () => {
    it("It should respond with Timesheet for last 34 days Page", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.get("/designation/");

        expect(response.statusCode).toBe(200);
        expect(response.text).toContain('<title>TNA PROXY SERVER | Timesheet for last 34 days</title>');
        expect(response.text).toContain('<h4 class="mx-auto">Timesheet for last 34 days</h4>');
    });
});

describe("Testing /api/bio-timesheet route", () => {
    it("It should respond with Timesheet for last 34 days JSON data", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.get("/api/bio-timesheet").query({
            page:1,
            size:10,
            EmployeeId :"",
            FromDate :"",
            ToDate :"",
            JobCode :"",
            DepartmentId :"",
            UserCategoryId :"",
            EmployeeCategoryId :"",
            DesignationId :"",
            SectionId :"",
        });

        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe("ok");
        expect(response.headers['content-type']).toMatch(/json/);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
    });
});