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



describe("Testing /events/ route", () => {
    it("It should respond with ServeU Attendance Management Middleware History Log Page", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.get("/events/");

        expect(response.statusCode).toBe(200);
        expect(response.text).toContain('<title>TNA PROXY SERVER | ServeU Attendance Management Middleware History Log Page</title>');
        expect(response.text).toContain('<h4 class="mx-auto">ServeU Attendance Management Middleware History Log Page</h4>');
    });
});

describe("Testing /api/events route", () => {
    it("It should respond with ServeU Attendance Management Middleware History Log JSON data", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.get("/api/events").query({
            page:1,
            size:10,
            EventIp:"",
            EventType:"",
            EventCategory:"",
            FromDate:"",
            ToDate:"",
            EventMethod:"",
            EventStatus:"",
            CreatedBy:""
        });
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe("ok");
        expect(response.headers['content-type']).toMatch(/json/);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        
    });
});