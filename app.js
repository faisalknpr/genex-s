const express = require('express');
const ejs = require('ejs');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');
const serveStatic = require('serve-static');

const app = express();
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));
app.use(serveStatic('decrypted'));
app.set('view engine', 'ejs');
// using the Node.js built-in crypto module to encrypt the files using the AES-256-CBC algorithm


let algorithm;
let key;
let iv;

function generateKeyandIv() {
  algorithm = 'aes-256-cbc';
  key = crypto.randomBytes(32); // key should be stored in mongoDB
  iv = crypto.randomBytes(16); // initialization vector should be stored in mongoDB
}



//mongoDB connection
mongoose.set('strictQuery', false);
mongoose.connect('mongodb://127.0.0.1:27017/filekey', {
  useNewUrlParser: true
});
const fileSchema = new mongoose.Schema({
  fileName: {
    type: String,
    required: true,
  },
  key: {
    type: String,
    required: true,
  },
  iv: {
    type: String,
    required: true,
  },
});
// create mongoose model
const File = mongoose.model('File', fileSchema);

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads');
  },
  filename: (req, file, cb) => {
    cb(null, file.originalname);
  },
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    checkFileType(file, cb);
  },
}).array('docs', 3);

// Check file type
function checkFileType(file, cb) {
  // Allowed ext
  const filetypes = /jpeg|jpg/;
  // Check ext
  const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
  // Check mime
  const mimetype = filetypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb('Error: Images Only!');
  }
}
app.post('/upload', (req, res) => {
  upload(req, res, async (err) => {
    if (err) {
      res.status(400).json({
        msg: err
      });
    } else {
      if (req.files === undefined) {
        res.status(400).json({
          msg: 'No file selected'
        });
      } else {

        const encryptedFiles = [];
        for (const f of req.files) {
          const encryptedFile = await encryptFile(f);
          encryptedFiles.push(encryptedFile);

          // Save the file metadata in the database
          const file = new File({
            fileName: f.originalname,
            key: key.toString("base64"),
            iv: iv.toString("base64")
          });
          file.save();
        }

        res.json({
          msg: 'File uploaded',
          files: encryptedFiles
        });
      }
    }
  });
});


app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));


// function for encryption
function encryptFile(file) {
  return new Promise((resolve, reject) => {
    try {
      generateKeyandIv();
      const cipher = crypto.createCipheriv(algorithm, key, iv);
      const encryptedName = `${file.path}.enc`;
      const readStream = fs.createReadStream(file.path);
      const writeStream = fs.createWriteStream(encryptedName);

      readStream
        .pipe(cipher)
        .pipe(writeStream)
        .on('finish', () => {
          console.log(`Encrypted file: ${encryptedName}`);
          resolve(encryptedName);
        });
    } catch (error) {
      reject(error);
    }
  });
}

app.get('/admin', async function(req, res) {
  const data = await File.find();
  data.forEach((item) => {
    const directoryPath = path.join(__dirname, 'uploads', item.fileName + ".enc");
    console.log(directoryPath, item.key, item.iv);
    decryptFile(directoryPath, item.key.toString("base64"), item.iv.toString("base64"), "C:\Users\faisa\desktop\genex-s\decrypted");
  });
  res.render('admin', {
    data
  });
});

// function for decryption

function decryptFile(encryptedFilePath, key, iv, outputDir) {
  const algorithm = 'aes-256-cbc';
  const encryptedReadStream = fs.createReadStream(encryptedFilePath);
  const decipher = crypto.createDecipheriv(algorithm, Buffer.from(key, 'base64'), Buffer.from(iv, 'base64'));
  const decryptedName = path.join(__dirname, "decrypted", path.parse(encryptedFilePath).name);
  const decryptedWriteStream = fs.createWriteStream(decryptedName);

  encryptedReadStream
    .pipe(decipher)
    .pipe(decryptedWriteStream)
    .on('finish', () => {
      console.log(`Decrypted file: ${decryptedName}`);
    });
}
