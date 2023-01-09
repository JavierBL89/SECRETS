require('dotenv').config()
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const encrypt = require("mongoose-encryption");

const app = express();

app.use(express.static("public"));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({
  extended: true
}));

mongoose.connect("mongodb://localhost:27017/userDb", {useNewUrlParser: true}, { useUnifiedTopology: true });

const userSchema = new mongoose.Schema({
  email: String,
  password: String
});

console.log(process.env.DB_SECRET);
userSchema.plugin(encrypt, { secret: process.env.DB_SECRET, encryptedFields: ["password"] });
                                               //this will encrypt our entire db
                                              // but we don't want to encrypt the userName
                                              //so we code the last parameter


const User = new mongoose.model("User", userSchema);

app.get("/", function(req,res){
  res.render("home");
});

app.get("/login", function(req,res){
  res.render("login");
});


// ------- REGISTER-----
app.get("/register", function(req,res){
  res.render("register");
})

app.post("/register", function(req,res){
  const newUser = new User ({
    email: req.body.username,
    password: req.body.password
  });

  newUser.save(function(err){
    if(err){ console.log(err);}
    else{ res.render("secrets")}
  })
  // res.render("home");
});

app.post("/login", function(req, res){
  const userName = req.body.username;
  const password = req.body.password;

  User.findOne({email: userName}, function(err, foundUser){
    if(err){console.log(err);}
    else{
      if(foundUser){
        if(foundUser.password === password){
          res.render("secrets");
        }
      }
    }
  })
})


app.listen(3000, function(){
  console.log("Server on port 3000");
})
