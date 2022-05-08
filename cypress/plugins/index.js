const encrypt = require("cypress-nextjs-auth0/encrypt");

module.exports = (on, config) => {
  on("task", { encrypt });
};
