const express = require("express");
const session = require("express-session");
const mongoose = require("mongoose");
const uuid = require("uuid");
const bodyParser = require("body-parser");
const cookieParser = require("cookie-parser");
const path = require("path");
const PORT = process.env.PORT || 3001;
const app = express();
const http = require("http").Server(app);

// Set up socket io on the same server as the http server
const io = require("socket.io").listen(http);

const { sendOverSocketIO, persistToDB } = require("./subscribers");

const passport = require("passport");
const GitHubStrategy = require("passport-github2").Strategy;

// From the settings page: https://github.com/settings/applications/614725
const GITHUB_CLIENT_ID = "37dabf371fa04f10829f";
const GITHUB_CLIENT_SECRET = "6993702cd42d11cfc26acba327ced7390a879cda";

const mongoUri = process.env.MONGODB_URI || "mongodb://localhost/trilobytes";
console.log("Connecting to " + mongoUri);
// Set up promises with mongoose
mongoose.Promise = Promise;
// Connect to the Mongo DB
mongoose.connect(mongoUri, {
  useMongoClient: true
});
const { Student, Game } = require("./models");

passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

// Use the GitHubStrategy within Passport.
//   Strategies in Passport require a `verify` function, which accept
//   credentials (in this case, an accessToken, refreshToken, and GitHub
//   profile), and invoke a callback with a user object.
const callbackURL =
  process.env.NODE_ENV === "production"
    ? "https://nu-review.herokuapp.com/auth/github/callback"
    : "http://localhost:3001/auth/github/callback";

passport.use(
  new GitHubStrategy(
    {
      clientID: GITHUB_CLIENT_ID,
      clientSecret: GITHUB_CLIENT_SECRET,
      callbackURL
    },
    function(accessToken, refreshToken, profile, done) {
      // To keep the example simple, the user's GitHub profile is returned to
      // represent the logged-in user.  In a typical application, you would want
      // to associate the GitHub account with a user record in your database,
      // and return that user instead.
      const { username, displayName } = profile;

      // needs a database to handle oauth postbacks
      if (mongoose.connection.readyState === 0)
        throw new Error("Need MONGO connection to handle OAuth");

      Student.findOrCreate(
        { githubId: username },
        { name: displayName || username || user }
      )
        .then(({ doc, created }) => {
          done(null, doc);
        })
        .catch(err => done(err));
    }
  )
);

const store = require("./store/").store;
const broadcastState = state => {
  const { round, title, players } = state;
  io.emit("stateUpdate", { round, title, players });
};

sendOverSocketIO(store, broadcastState);
persistToDB(store, { Game });

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(cookieParser());
app.use(
  session({ secret: "trilogy-trivia", resave: false, saveUninitialized: false })
);
app.use(require("morgan")("dev"));
app.use(passport.initialize());
app.use(passport.session());

app.get(
  "/auth/github",
  passport.authenticate("github", { scope: ["read:user"] }),
  function(req, res) {
    // The request will be redirected to GitHub for authentication, so this
    // function will not be called.
  }
);

app.get(
  "/auth/github/callback",
  passport.authenticate("github", { failureRedirect: "/login" }),
  function(req, res) {
    console.log("req.user is ", req.user);
    res.cookie("trilobytes-user", req.user.githubId);
    res.redirect(
      process.env.NODE_ENV === "production" ? "/" : "//localhost:3000/"
    );
  }
);

// Serve up static assets (usually on heroku)
// if (process.env.NODE_ENV === "production") {
app.use(express.static(path.join(__dirname, "client/build")));
//}

// Send every request to the React app
// Define any API routes before this runs
const serveUpReact = (req, res) => {
  console.log("Session:", req.session);
  res.sendFile(path.join(__dirname, "./client/build/index.html"));
};
app.get("/", serveUpReact);
app.get("/student", serveUpReact);
app.get("/live", serveUpReact);
app.get("/remote", serveUpReact);

// Catch all (doesn't 404 if text/html contenttype unfortunately)
app.get("*", function(req, res) {
  res.status(404).send("Huh ???");
});

http.listen(PORT, function() {
  console.log(`🌎 ==> Server now on port ${PORT}!`);
});

io.on("connection", function(client) {
  console.log("Got a client connection!");

  // Tell our store someone joined
  store.dispatch({ type: "CONNECTION_ADDED" });

  const id = uuid.v4();
  client.on("join", function({ name }) {
    console.log(`${name} ${id} joined`);
    store.dispatch({
      type: "PLAYER_JOINED",
      payload: {
        id,
        name
      }
    });

    client.emit("identify", id);
  });

  client.on("action", function(action) {
    console.log("Received an action:", action);
    store.dispatch(action);
  });

  client.on("disconnect", function() {
    console.log("Client signed off");
    store.dispatch({ type: "CONNECTION_LEFT" });
    store.dispatch({
      type: "PLAYER_LEFT",
      payload: {
        id
      }
    });
  });
});
