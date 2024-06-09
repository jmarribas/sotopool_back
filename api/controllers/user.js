const User = require("../models/user");
const cloudinary = require('cloudinary').v2;
const nodemailer = require('nodemailer');
const fs = require('fs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { generateSign, verifyToken } = require("../../config/jwt");
const { getCodeFromFile } = require("../../utils/codeGenerator");
const { deleteImg } = require("../../utils/deleteImg");

//ALL USERS
const getUsers = async (req, res, next) => {
  try {
    const allUsers = await User.find();
    return res.status(200).json(allUsers);
  } catch (err) {
    return res.status(404).json({ message: err.message });
  }
}

//GET USER
const getUser = async (req, res, next) => {
  try {
    const oneUser = await User.findById(req.params.id)

    if (!oneUser || oneUser === null) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    return res.status(200).json(oneUser);

  } catch (err) {
    return res.status(404).json({ message: err.message });
  }
}

//REGISTER USER
const registerUser = async (req, res, next) => {
  try {
    const addUser = new User(req.body);
    const emailDuplicated = await User.findOne({ email: req.body.email });

    if (emailDuplicated) {
      return res.status(400).json({ error: 'El email ya existe.' });
    } else {
      const result = await new Promise((resolve, reject) => {
        cloudinary.uploader.upload(req.files.img[0].path, {
          folder: "sotoPool-Users",
          allowedFormats: ["jpg", "png", "jpeg", "gif", "webp"],
          transformation: [{ width: 200, height: 200, crop: 'fill' }]
        }, (error, result) => {
          if (error) reject(error);
          else resolve(result);
        });
      });
      if (result) {
        addUser.img = result.url;
      }

      let transporter = nodemailer.createTransport({
        host: 'smtp-es.securemail.pro',
        port: 465,
        secure: true,
        auth: {
          user: process.env.REG_EMAIL,
          pass: process.env.REG_PASSWORD,
        }
      });

      let mailOptions = {
        from: addUser.email,
        to: process.env.REG_EMAIL,
        subject: `${addUser.name} ${addUser.surnames} se ha registrado.`,
        html: `
        <p>Se ha registrado un nuevo usuario en la aplicación de SotoPool:</p>
        <p></p>
        <p>Nombre: ${addUser.name}</p>
        <p>Apellidos: ${addUser.surnames}</p>
        <p>Email: ${addUser.email}</p>
        <p>Socio: ${addUser.member}</p>
        <hr></hr>
        <p><a class=" link" href="https://sotopoolback-production.up.railway.app/users/verifyuser/${addUser.email}/${process.env.REG_PASSWORD}" target="_blank" rel="noopener noreferrer">
          Aceptar</a></p>
        <p><a class=" link" href="https://sotopoolback-production.up.railway.app/users/rejectuserphoto/${addUser.email}/${process.env.REG_PASSWORD}" target="_blank" rel="noopener noreferrer">
          Rechazar por la foto</a></p>
        `,
        attachments: [
          {
            path: req.files.img[0].path
          },
          {
            path: req.files.license[0].path
          }
        ]
      };

      transporter.sendMail(mailOptions, function (error, info) {
        if (error) {
          console.log(error);
        } else {
          console.log('Email enviado: ' + info.response);
          fs.unlink(req.files.img[0].path, function (err) {
            if (err) {
              console.error('Error al eliminar el archivo de imagen:', err);
            } else {
              console.log('Archivo de imagen eliminado con éxito');
            }
          });

          fs.unlink(req.files.license[0].path, function (err) {
            if (err) {
              console.error('Error al eliminar el archivo de licencia:', err);
            } else {
              console.log('Archivo de licencia eliminado con éxito');
            }
          });
        }
      });

      await addUser.save();
      return res.status(201).json({ ok: 'Usuario registrado correctamente.' });
    }

  } catch (err) {
    return res.status(400).json({ message: err.message, error: 'No se ha podido realizar el registro, inténtalo de nuevo.' });
  }
}

//LOGIN USER
const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    const verified = user.verified;

    if (!user || !bcrypt.compareSync(password, user.password)) {
      return res.status(400).json({ error: 'El mail o la contraseña no es correcto.' });
    }

    if (!verified) {
      return res.status(400).json({ warning: 'Estamos verificando tu usuario, en breve recibirás un mail de confirmación. Gracias!!' });
    }

    const token = generateSign(user._id);
    return res.status(200).json({ message: 'Usuario logueado.', user, token });

  } catch (err) {
    return res.status(500).json({ error: 'Datos incorrectos, inténtalo de nuevo.', message: err.message });
  }
}

//CONFIRM USER
const confirmUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user || user === null) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const token = req.params.token;

    // Verificar el token
    try {
      const decoded = verifyToken(token);
      const code = getCodeFromFile();

      user.verified = true;
      return res.status(200).json({ message: 'Usuario verificado correctamente.', user, code });
    } catch (err) {
      return res.status(401).json({ error: 'Token inválido.' });
    }

  } catch (err) {
    return res.status(404).json({ error: err.message });
  }
}

// VERIFY USER
const verifyUser = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    const pass = req.params.pass;

    if (pass !== process.env.REG_PASSWORD) {
      return res.status(401).json({ error: 'Contraseña incorrecta.' });
    }

    if (!user || user === null) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    user.verified = true;
    await user.save();

    let transporter = nodemailer.createTransport({
      host: 'smtp-es.securemail.pro',
      port: 465,
      secure: true,
      auth: {
        user: process.env.REG_EMAIL,
        pass: process.env.REG_PASSWORD,
      }
    });

    let mailOptions = {
      from: `"SotoPool" <info@sotodealcolea.com>`,
      to: user.email,
      subject: "Tu cuenta ha sido verificada.",
      html: `
    <!DOCTYPE PUBLIC “-//W3C//DTD XHTML 1.0 Transitional//EN” “https://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd”>
<html xmlns="http://www.w3.org/1999/xhtml">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stage Roster - Register email</title>

  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      text-align: center;
    }

    h1 {
      color: #000000;
      font-size: 24px;
    }

    p {
      color: #555;
      font-size: 16px;
      margin-bottom: 10px;
    }

    a {
      color: #000000;
      text-decoration: none;
    }

    table {
      text-align: center;
      width: 92%;
      margin: 0 auto;
      background-color: #cfcfcf;
      border-radius: 20px;
      padding: 12px;
    }

    .verification-code {
      background-color: #f0f0f0;
      border: 1px solid #ccc;
      border-radius: 5px;
      padding: 10px;
      font-size: 20px;
      display: inline-block;
    }

    .imgBackground {
      height: 180px;
    }
  </style>
</head>

<body>
  <table style="background: none; height: 120px">
    <tr>
      <td>
        <img src="https://res.cloudinary.com/dbnmjx6vr/image/upload/v1709246885/Logo_SDA_reytxe.webp" alt="Logo" width="50"
          height="50">
        <h1>CDV Soto de Alcolea</h1>
      </td>
    </tr>
  </table>
  <table role="presentation">
    <tr>
      <td>
        <img src="https://stagerosterback.up.railway.app/assets/welcome.png" class="imgBackground" </td>
    </tr>
    <tr>
      <td>
        <h3>Hola ${user.name},</h3>
        <p>¡Tu cuenta ha sido verificada correctamente!</p>
        <p>Ya puedes acceder a la aplicación para mostrar tu carnet digital de piscina.
      </p>Muchas gracias y para cualquier consulta no dudes en ponerte en contacto con nosotros en info@sotodealcolea.com.</p>
        <p>Un saludo,</p>
        <p>SotoPool</p>
        </div>
      </td>
    </tr>
  </table>
  <table style="background: none;">
    <tr>
      <td>
        <a class=" link" href="https://www.sotodealcolea.com" target="_blank" rel="noopener noreferrer">
          www.sotodealcolea.com</a>
      </td>
    </tr>
  </table>
</body>

</html>
      `
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log('Email enviado: ' + info.response);
        fs.unlink(req.files.img[0].path, function (err) {
          if (err) {
            console.error('Error al eliminar el archivo de imagen:', err);
          } else {
            console.log('Archivo de imagen eliminado con éxito');
          }
        });

        fs.unlink(req.files.license[0].path, function (err) {
          if (err) {
            console.error('Error al eliminar el archivo de licencia:', err);
          } else {
            console.log('Archivo de licencia eliminado con éxito');
          }
        });
      }
    });

    return res.status(200).json({ message: 'Usuario verificado correctamente.' });

  } catch (err) {
    return res.status(404).json({ error: err.message });
  }
}

// REJECT USER PHOTO
const rejectUserPhoto = async (req, res, next) => {
  try {
    const user = await User.findOne({ email: req.params.email });
    const pass = req.params.pass;

    if (pass !== process.env.REG_PASSWORD) {
      return res.status(401).json({ error: 'Contraseña incorrecta.' });
    }

    if (!user || user === null) {
      return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    let transporter = nodemailer.createTransport({
      host: 'smtp-es.securemail.pro',
      port: 465,
      secure: true,
      auth: {
        user: process.env.REG_EMAIL,
        pass: process.env.REG_PASSWORD,
      }
    });

    let mailOptions = {
      from: `"SotoPool" <info@sotodealcolea.com>`,
      to: user.email,
      subject: `¡Lo sientimos! Cuenta no verificada.`,
      html: `
    <!DOCTYPE PUBLIC “-//W3C//DTD XHTML 1.0 Transitional//EN” “https://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd”>
<html xmlns="http://www.w3.org/1999/xhtml">

<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Stage Roster - Register email</title>

  <style>
    body {
      margin: 0;
      font-family: Arial, sans-serif;
      text-align: center;
    }

    h1 {
      color: #000000;
      font-size: 24px;
    }

    p {
      color: #555;
      font-size: 16px;
      margin-bottom: 10px;
    }

    a {
      color: #000000;
      text-decoration: none;
    }

    table {
      text-align: center;
      width: 92%;
      margin: 0 auto;
      background-color: #cfcfcf;
      border-radius: 20px;
      padding: 12px;
    }

    .verification-code {
      background-color: #f0f0f0;
      border: 1px solid #ccc;
      border-radius: 5px;
      padding: 10px;
      font-size: 20px;
      display: inline-block;
    }

    .imgBackground {
      height: 180px;
    }
  </style>
</head>

<body>
  <table style="background: none; height: 120px">
    <tr>
      <td>
        <img src="https://res.cloudinary.com/dbnmjx6vr/image/upload/v1709246885/Logo_SDA_reytxe.webp" alt="Logo" width="50"
          height="50">
        <h1>CDV Soto de Alcolea</h1>
      </td>
    </tr>
  </table>
  <table role="presentation">
    <tr>
      <td>
        <h3>Lo sentimos ${user.name},</h3>
        <p>¡Tu cuenta no ha posido ser verificada! te contamos por que:</p>
      </p>Necesitamos que tu cara esté centrada en la foto para que se vea bien.</p>
      <p>El espacio de la foto en el carnet es cuadrado, imagina como si fuera la foto de perfil de instagram o facebook. Aunque no sea una foto cuadrada necesitamos que tu cara se vea en el centro.</p> 
      vuelve a registrarte y sube una foto centrada para que podamos validarte:</p>
      <a class=" link" href="https://www.sotodealcolea.com/register" target="_blank" rel="noopener noreferrer">
          (Volver a registrarse)</a>
      <p>Gracias y disculpa las molestias.</p>
        <p>SotoPool</p>
        </div>
      </td>
    </tr>
  </table>
  <table style="background: none;">
    <tr>
      <td>
        <a class=" link" href="https://www.sotodealcolea.com" target="_blank" rel="noopener noreferrer">
          www.sotodealcolea.com</a>
      </td>
    </tr>
  </table>
</body>

</html>
      `
    };

    transporter.sendMail(mailOptions, function (error, info) {
      if (error) {
        console.log(error);
      } else {
        console.log('Email enviado: ' + info.response);
      }
    });

    const userDeleted = await User.findByIdAndDelete(user._id);

    if (userDeleted && userDeleted.img) {
      deleteImg(userDeleted.img);
    }

    res.status(200).json({ message: `${user.name} ${user.surnames} ha sido eliminado correctamente.` });

  } catch (err) {
    return res.status(404).json({ error: err.message });
  }

}

module.exports = { getUsers, getUser, registerUser, loginUser, confirmUser, verifyUser, rejectUserPhoto };