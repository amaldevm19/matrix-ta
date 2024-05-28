const request = require("supertest");
const app = require("../app");
describe("Test the root path", () => {
    test("It should response the GET method", async () => {
        const response = await request(app).get("/");
        expect(response.statusCode).toBe(200);
        expect(response.text).toContain('<title>TNA PROXY SERVER | Home</title>');
        expect(response.text).not.toContain('<a class="nav-link" href="/users/logout">Logout</a>');
        expect(response.text).toContain('<a class="nav-link disabled" href="/users/admin" tabindex="-1" aria-disabled="true">Admin Page</a>');
    });
});
