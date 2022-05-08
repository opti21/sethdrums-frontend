/// <reference types="Cypress" />
// pepega.spec.js created with Cypress
//
// Start writing your Cypress tests below!
// If you're unfamiliar with how Cypress works,
// check out the link below and learn how to write your first test:
// https://on.cypress.io/writing-first-test

context("Logging in", () => {
  beforeEach(() => {
    cy.login();
  });

  it("should login", () => {
    cy.request("/api/auth/me").then(({ body: user }) => {
      expect(user.email).to.equal(Cypress.env("auth0Username"));
    });
  });
});

context("Public Requests", () => {
  it("should load home page for not logged in user", () => {
    cy.logout();
    cy.visit("/");
    cy.get(".request-button").should("have.text", "Sign In to Request");
  });

  it("should show Add Request button for logged in user", () => {
    cy.login();
    cy.visit("/");
    cy.get(".request-button").should("have.text", "Add Request");
  });

  it("should add requsest", () => {
    cy.get(".request-button").click();
    cy.get("#chakra-modal-public-add-request-modal").should("be.visible");
    cy.get("#youtube-link").type("https://www.youtube.com/watch?v=cXuuhdCnMiU");
    cy.intercept("POST", "/api/public/request").as("publicRequest");
    cy.get("#public-submit-request-btn", { timeout: 3000 })
      .should("be.enabled")
      .click();
    cy.wait("@publicRequest").then((res) => {
      expect(res.response.statusCode).to.eq(200);
    });
    // cy.get(".request-queue-list").within((items) => {
    //   items[0].contains(".request-card-content");
    // });
  });
});
