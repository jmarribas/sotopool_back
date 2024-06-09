const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'src/licenses/')
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const id = Date.now();
    cb(null, `${id}${ext}`);
  }
})

const upload = multer({ storage: storage });

module.exports = { upload }