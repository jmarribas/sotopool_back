const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const userSchema = new mongoose.Schema({
  name: { type: String, required: [true, 'Nombre requerido'], trim: true },
  surnames: { type: String, },
  member: { type: String, },
  email: { type: String, required: [true, 'Email requerido'], unique: true, trim: true },
  password: { type: String, required: [true, 'Contraseña requerida'], trim: true },
  img: { type: String, required: [true, 'Imagen requerida'], },
  license: { type: String },
  role: { type: String, default: 'user', enum: ['user', 'admin'] },
  verified: { type: Boolean, default: false, },
},
  {
    collection: 'users',
  });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();

  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);

  next();
});

const User = mongoose.model('User', userSchema, 'users');
module.exports = User;