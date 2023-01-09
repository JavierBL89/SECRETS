//jshint esversion:6
require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
var findOrCreate = require("mongoose-findorcreate");
const encrypt = require("mongoose-encryption");
const crypto = require('crypto');

// const port = process.env.PORT || 3000;
// coment push changes
const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

app.use(session({    //express-session code RIGHT BELOW ABOVE APP.USE
  secret: process.env.SECRET,
  resave: false,
  saveUninitialized: false,
}));

app.use(passport.initialize());   /// INITIALITYING PASSPORT
app.use(passport.session());

mongoose.connect(process.env.DATABASE_URL || "mongodb://localhost:27017/userDb", {useNewUrlParser: true}, { useUnifiedTopology: true });
mongoose.set('useCreateIndex', true);

const userSchema = new mongoose.Schema ({
  email: String,
  password: String,
  googleId: String,
  secret: [{type:String}],
});


var encKey = "b60929eb8d716b3a129254767a482215";
var sigKey = "f434f466c0897734dba0a5c485ba24ff9e1697f94d1fc3d261746671dda0e024";

//32 bytes
require('crypto').randomBytes(32, function(err, buffer) {
    var token = buffer.toString('base64');
});

//64 bytes
require('crypto').randomBytes(64, function(err, buffer) {
    var token = buffer.toString('base64');
});

userSchema.plugin(passportLocalMongoose);
userSchema.plugin(findOrCreate);
userSchema.plugin(encrypt, { encryptionKey: encKey, signingKey: sigKey });


const User = new mongoose.model("User", userSchema);

passport.use(User.createStrategy()); //CREATES A LOCAL STRATEGY
                                     // TO AUTHENTICATE USERS USING
                                    // USERNAME AND PASSWORD, AND ALSO
                                    // TO SERIALIZE AND DESERIALIZE OUR USER

// use static serialize and deserialize of model for passport session support
passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

passport.use(new GoogleStrategy({
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    // callbackURL: "http://localhost:3000/auth/google/callback"
    callbackURL: "https://secrets-yj3o.onrender.com//auth/google/callback"

  },
  function(accessToken, refreshToken, profile, cb) {
    User.findOrCreate({ googleId: profile.id }, function (err, user) {
      return cb(err, user);
    });
  }
));

app.get("/", function(req,res){
  res.render("home");
});

app.get("/auth/google",
passport.authenticate("google", { scope: ['profile'] })
);

app.get('/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  function(req, res) {
    // Successful authentication, redirect home.
    res.redirect('/secrets');
  });


app.get("/login", function(req,res){
  res.render("login");
});

app.get("/secrets", function(req, res){
  User.find({"secret": {$ne: null}}, function(err, foundSecrets){
    if(err){
      console.log(err);
    }else{
      if(foundSecrets){
        res.render("secrets", {usersWithSecrets: foundSecrets});
      }
    }
  })
});

app.get("/logout", function(req, res){
  req.logout();
  res.redirect("/");
})

app.get("/submit", function(req, res){
  if(req.isAuthenticated()){
    res.render("submit");
  }else{
    res.redirect("/login");
  }
});

app.post("/submit", function(req, res){
  const submittedSecret = req.body.secret;
  console.log(req.user);

    User.findById(req.user.id, function(err, foundUser){
      if(err){ console.log(err);
      }else{
        if(foundUser){
          foundUser.secret.push(submittedSecret);
          foundUser.save(function(){
            res.redirect("/secrets")
          });
        }
      }
    });
});
// ------- REGISTER-----
app.get("/register", function(req, res){
  res.render("register");
})

app.post("/register", function(req, res){   //CREATING THE HASH PASSWORD

User.register({username: req.body.username}, req.body.password, function(err, user){
  if(err){
    console.log(err);
    res.redirect("/register");
  }else{
    passport.authenticate("local")(req, res, function(){
      res.redirect("/secrets");
    });
  }
});

});

app.post("/login", function(req, res){   //RETREIVE THE HASH PASSWORD WHEN LOGIN

  const user = new User({
    username: req.body.username,
    password: req.body.password
  })

  req.login(user, function(err){
    if(err){
      console.log(err);
    }else{
      passport.authenticate("local")(req, res, function(){
        res.redirect("/secrets");
      })}

    });
});


app.listen(3000, function(){
  console.log(`Server on port ${port}`);
})
