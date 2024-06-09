const { isAdmin, isUser } = require("../../middlewares/auth");
const { upload } = require("../../middlewares/upload");
const { getUsers, getUser, registerUser, loginUser, confirmUser, verifyUser, rejectUserPhoto } = require("../controllers/user");

const userRoutes = require('express').Router();

userRoutes.get('/', isAdmin, getUsers);
userRoutes.get('/:id', isUser, getUser);
userRoutes.post('/register', upload.fields([{ name: 'img', maxCount: 1 }, { name: 'license', maxCount: 1 }]), registerUser);
userRoutes.post('/login', loginUser);
userRoutes.post('/confirmuser/:id/:token', isUser, confirmUser);
userRoutes.get('/verifyuser/:email/:pass', verifyUser);
userRoutes.get('/rejectuserphoto/:email/:pass', rejectUserPhoto);

module.exports = userRoutes;