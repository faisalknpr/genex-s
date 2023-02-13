const express = require('express');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
mongoose.connect('mongodb://127.0.0.1:27017/filekey', { useNewUrlParser: true });
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

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads');
  },
  filename: (req, file, cb) => {
    cb(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname));
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
        if (err)
        {
      res.status(400).json({ msg: err });
    } else {
      if (req.files === undefined) {
        res.status(400).json({ msg: 'No file selected' });
      } else {

        const encryptedFiles = [];
        for (const f of req.files) {
          const encryptedFile = await encryptFile(f);
          encryptedFiles.push(encryptedFile);
          // Store the encrypted files in the database
          const File = mongoose.model('File', fileSchema);
          // Save the file metadata in the database
            const file = new File({ fileName:f.originalname, key:key, iv:iv });
            file.save();
        }

        res.json({ msg: 'File uploaded', files: encryptedFiles });
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

// // function for decryption
//
// function decryptFile(encryptedFilePath) {
//   const encryptedReadStream = fs.createReadStream(encryptedFilePath);
//   const decipher = crypto.createDecipheriv(algorithm, key, iv);
//   const decryptedName = encryptedFilePath.slice(0, -4);
//   const decryptedWriteStream = fs.createWriteStream(decryptedName);
//
//   encryptedReadStream
//     .pipe(decipher)
//     .pipe(decryptedWriteStream)
//     .on('finish', () => {
//       console.log(`Decrypted file: ${decryptedName}`);
//     });
// }
//
//
//
// // Retrieve the file metadata from the database
//
// const getFileMetadata = async (fileName) => {
//   const file = await File.findOne({ fileName });
//   return file;
// };
