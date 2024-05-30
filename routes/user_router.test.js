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

describe("Testing /users/admin route", () => {
    it("It should respond with Admin Dashboard Page", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });

        const response = await agent.get("/users/admin");
        expect(response.statusCode).toBe(200);
        expect(response.text).toContain('<title>TNA PROXY SERVER | Admin Dashboard</title>');
        expect(response.text).toContain('<h4 class="mx-auto">Admin Dashboard</h4>');
    });
});

describe("Testing /api/users/admin/get-new-users route", () => {
    it("It should respond with  Admin Dashboard JSON data", async () => {
        const agent = request.agent(app);
        await agent.post('/api/users/login').send({ employeeID: '25002', password: '123456' });
        const response = await agent.get("/api/users/admin/get-new-users");
        expect(response.statusCode).toBe(200);
        expect(response.body.status).toBe("ok");
        expect(response.headers['content-type']).toMatch(/json/);
        expect(Array.isArray(response.body.data)).toBe(true);
        expect(response.body.data.length).toBeGreaterThan(0);
        
    });
});