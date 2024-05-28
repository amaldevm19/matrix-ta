const request = require("supertest");
const app = require("../app");

let cookie;

beforeAll(async () => {
    const response = await request(app)
        .post("/api/users/login")
        .send({
            employeeID: "25002",
            password: "123456"
        });

    expect(response.statusCode).toBe(200);
    cookie = response.headers['set-cookie']; // Capture the session cookie
});

describe("Testing /jobs/ route", () => {
    test("It should respond with Assign Jobs To Employees Using CSV file", async () => {
        const response = await request(app)
            .get("/jobs/assign-jobs-manually")
            .set("Cookie", cookie);

        expect(response.statusCode).toBe(200);
        expect(response.text).toContain('<title>TNA PROXY SERVER | Assign Jobs To Employees Using CSV file</title>');
        expect(response.text).toContain('<h4 class="mx-auto">Assign Jobs To Employees Using CSV file</h4>');
    });
});