const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

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
  upload(req, res, (err) => {
    if (err) {
      res.status(400).json({ msg: err });
    } else {
      if (req.files === undefined) {
        res.status(400).json({ msg: 'No file selected' });
      } else {
        res.json({ msg: 'File uploaded', files: req.files });
      }
    }
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));




// using the Node.js built-in crypto module to encrypt the files using the AES-256-CBC algorithm


const crypto = require('crypto');
const algorithm = 'aes-256-cbc';
const key = crypto.randomBytes(32); // key should be stored in mongoDB
const iv = crypto.randomBytes(16); // initialization vector should be stored in mongoDB


// code block to store user details, file names, key and iv in mongoDB


// function for encryption
function encryptFile(filePath) {
  const readStream = fs.createReadStream(filePath);
  const cipher = crypto.createCipheriv(algorithm, key, iv);
  const encryptedName = `${filePath}.enc`;
  const writeStream = fs.createWriteStream(encryptedName);

  readStream
    .pipe(cipher)
    .pipe(writeStream)
    .on('finish', () => {
      console.log(`Encrypted file: ${encryptedName}`);
    });
}

// function for decryption
function decryptFile(encryptedFilePath) {
  const encryptedReadStream = fs.createReadStream(encryptedFilePath);
  const decipher = crypto.createDecipheriv(algorithm, key, iv);
  const decryptedName = encryptedFilePath.slice(0, -4);
  const decryptedWriteStream = fs.createWriteStream(decryptedName);

  encryptedReadStream
    .pipe(decipher)
    .pipe(decryptedWriteStream)
    .on('finish', () => {
      console.log(`Decrypted file: ${decryptedName}`);
    });
}
