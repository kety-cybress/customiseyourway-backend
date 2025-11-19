const axios = require("axios");
const { expect } = require("chai");

describe("POST API Request test", function () {
  it("should be able to create a new user", async function () {
    const userData = {
      name: "Ketia",
      job: "Developer"
    };

    const res = await axios.post("https://reqres.in/api/users", userData);

    console.log(res.data);
    expect(res.status).to.equal(201); // POST usually returns 201 Created
    expect(res.data).to.have.property("name", "Ketia");
    expect(res.data).to.have.property("job", "Developer");
    expect(res.data).to.have.property("id"); // ID should be returned
    expect(res.data).to.have.property("createdAt"); // Timestamp should be returned
  });
});
