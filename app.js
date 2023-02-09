const express = require("express");
const multer = require("multer");
const mongodb = require("mongodb");
const bcrypt = require("bcrypt");
const http = require("http");
const fs = require('fs');

const app = express();
const router = express.Router();
const upload = multer();

const url = "mongodb://localhost:27017/";
const dbName = "sensitiveFiles";

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

router.post("/upload", upload.array("files"), async (req, res) => {
  const files = req.files;
  const saltRounds = 10;

  const encryptedPassport = await bcrypt.hash(files[0].buffer, saltRounds);
  const encryptedAdhaar = await bcrypt.hash(files[1].buffer, saltRounds);
  const encryptedDrivingLicense = await bcrypt.hash(files[2].buffer, saltRounds);

  const client = new mongodb.MongoClient(url, { useNewUrlParser: true });
  await client.connect();

  const db = client.db(dbName);
  const collection = db.collection("files");

  const result = await collection.insertOne({
    passport: encryptedPassport,
    adhaar: encryptedAdhaar,
    drivingLicense: encryptedDrivingLicense
  });

  client.close();

  res.send(result);
});

router.get("/view", async (req, res) => {
  const client = new mongodb.MongoClient(url, { useNewUrlParser: true });
  await client.connect();

  const db = client.db(dbName);
  const collection = db.collection("files");

  const file = await collection.findOne();

  if (!file) {
    return res.status(404).send("No files found.");
  }

  const decryptedPassport = await bcrypt.compare(file.passport, encryptedPassport);
  const decryptedAdhaar = await bcrypt.compare(file.adhaar, encryptedAdhaar);
  const decryptedDrivingLicense = await bcrypt.compare(file.drivingLicense, encryptedDrivingLicense);

  client.close();

  res.set("Content-Type", "application/octet-stream");
  res.send([decryptedPassport, decryptedAdhaar, decryptedDrivingLicense]);
});

app.use("/", router);
app.get("/", function(req,res){
   res.redirect("/");
})

// const options = {
//   key: fs.readFileSync("server.key"),
//   cert: fs.readFileSync("server.cert")
// };

http.createServer(app).listen(3000, () => {
  console.log("HTTPS server running on port 3000");
});
