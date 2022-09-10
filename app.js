const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();

app.use(express.json());
let db = null;

const dbPath = path.join(__dirname, "userData.db");

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server is running at http://localhost:3000");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

//API 1 Register
//3 Scenarios- if user exits,length of password,successful registration

app.post("/register", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  //inserting hashed password
  const hashedPassword = await bcrypt.hash(request.body.password, 10);

  const registerUserQuery = `
    SELECT * FROM user 
    WHERE username='${username}';`;

  const dbUser = await db.get(registerUserQuery);

  if (dbUser === undefined) {
    //Create User but before that checking pwd length

    const lengthOfPassword = password.length;
    //console.log(`length of password is ${lengthOfPassword}`);
    if (lengthOfPassword > 5) {
      //Now register the user
      const registerFirstTimeUserQuery = `INSERT INTO 
       user(username,name,password,gender,location) 
       VALUES(
           '${username}',
           '${name}',
           '${hashedPassword}',
           '${gender}',
           '${location}'
       ) `;
      await db.run(registerFirstTimeUserQuery);
      response.status(200);
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//API - LOGIN

app.post("/login", async (request, response) => {
  const { username, password } = request.body;
  const getUserQuery = `
  SELECT * FROM user WHERE 
  username='${username}';`;

  const dbUser = await db.get(getUserQuery);

  //console.log(password);
  // console.log(dbUser.password);

  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    //check for password
    // console.log(password);
    //console.log(dbUser.password);
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      response.status(200);
      response.send("Login success!");
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

//API 3 -change password

app.put("/change-password", async (request, response) => {
  const { username, oldPassword, newPassword } = request.body;
  const newPwdLength = newPassword.length;
  const getUserPwdQuery = `SELECT * FROM
  user WHERE username='${username}';`;
  const dbUser = await db.get(getUserPwdQuery);

  if (newPwdLength > 5) {
    //Check old/current password
    const matchedWithOldPassword = await bcrypt.compare(
      oldPassword,
      dbUser.password
    );
    //console.log(matchedWithOldPassword);

    if (matchedWithOldPassword === true) {
      //Update password using hash
      const hashUpdatePwd = await bcrypt.hash(newPassword, 10);
      const updatePwdQuery = `
      UPDATE user SET password='${hashUpdatePwd}' 
      WHERE username='${username}';`;

      await db.run(updatePwdQuery);
      response.status(200);
      response.send("Password updated");
    } else {
      response.status(400);
      response.send("Invalid current password");
    }
  } else {
    response.status(400);
    response.send("Password is too short");
  }
});

module.exports = app;
