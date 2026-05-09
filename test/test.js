var assert = require("assert");
const fs = require("fs");
const path = require("path");

const API_URL = "http://localhost:8788";
const PASSWORD = "123456";

describe("API Endpoints", function () {
  this.timeout(10000); // Increase timeout for network requests

  it("should login successfully", async function () {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password: PASSWORD,
      }),
    });

    const data = await response.json();
    console.log("Login response:", data);

    assert.strictEqual(response.status, 200, "Expected status code 200");
    assert.ok(data.success, "Expected success to be true");
    assert.ok(data.data.token, "Expected token to be present");

    // Check cookie
    const cookie = response.headers.get("set-cookie");
    assert.ok(
      cookie && cookie.includes("auth="),
      "Expected auth cookie to be set"
    );
  });

  it("should fail with incorrect password", async function () {
    const response = await fetch(`${API_URL}/auth/login`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password: "wrong_password",
      }),
    });

    const data = await response.json();
    assert.strictEqual(response.status, 401, "Expected status code 401");
    assert.strictEqual(data.success, false, "Expected success to be false");
  });
});
