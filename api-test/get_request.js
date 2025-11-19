const axios = require("axios");
const { expect } = require("chai");

describe("GET API Request test", function () {
  it("should be able to get user list", async function () {
    const res = await axios.get("https://reqres.in/api/users?page=2");
    expect(res.status).to.equal(200);
  });
});

