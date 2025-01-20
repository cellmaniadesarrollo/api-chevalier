const UsersModels = {};
const axios = require('axios');
const Roles = require('../db/roles')
const Users = require('../db/users')
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const PersonalData = require("../db/personalDatas")
const mongoose = require('mongoose');
UsersModels.login = async (data) => {
  const { email, password, rememberMe } = data;

  try {
    const user = await Users.findOne({ email , available: true }).populate('roles');
    if (!user) throw new Error('User not found');

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) throw new Error('Invalid credentials');

    const sessionId = uuidv4(); // Genera un identificador único de sesión
    const token = jwt.sign({ id: user._id, sessionId }, "process.env.JWT_SECRET", {
      expiresIn: rememberMe ? '7d' : '12h'
    });

    // Guardar el identificador de sesión en la base de datos
    user.sessionId = sessionId;
    await user.save();

    return {
      accessToken: token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        roles: user.roles.map(role => role.name),
      },
    };
  } catch (err) {
    throw new Error(err.message); // Lanzar el error para que lo capture el controlador
  }

}

UsersModels.gethairdresser = async (data) => {
  try {
    const users = await mongoose.model('users').aggregate([
      {
        $match: { available: true } // Filtrar usuarios disponibles
      },
      {
        $lookup: {
          from: 'roles', // Colección de roles
          localField: 'roles', // Campo de referencia en la colección de usuarios
          foreignField: '_id', // Campo de referencia en la colección de roles
          as: 'userRoles' // Nombre para los roles embebidos
        }
      },
      {
        $unwind: '$userRoles' // Descomponer el array de roles
      },
      {
        $match: { 'userRoles.name': 'HAIRDRESSER' } // Filtrar por el nombre del rol
      },
      {
        $lookup: {
          from: 'personaldatas', // Colección de datos personales
          localField: 'personalData', // Campo de referencia en la colección de usuarios
          foreignField: '_id', // Nombre para los datos personales embebidos
          pipeline: [{
            $project: {
              _id:0,
              firstnames:1,
              lastnames: 1,
              firstnames1:1,
              lastnames1: 1,
            }
          }], 
          as: 'personalDataInfo'
        }
      },
      {
        $unwind: '$personalDataInfo' // Descomponer el array de datos personales
      },
      {
        $project: { 
          name: {
            $concat: ["$personalDataInfo.firstnames", " ", "$personalDataInfo.firstnames1", " ", "$personalDataInfo.lastnames", " ", "$personalDataInfo.lastnames1"]
          },
        }
      }
    ]);

    return users;
  } catch (error) {
    throw error
  }
}


UsersModels.saveMultipleUsersWithPersonalData = async () => {
  const results = [];
  const usersDataArray = [
    {
      username: 'gabrielam',
      email: 'gteamcellmania@gmail.com',
      password: '123456',
      roles: ['6717ee6797944dc377820d6a', '6717eeaf97944dc377820d6c'], // ID de un rol existente
      dni: '0302496336',
      firstnames: 'gabriela',
      firstnames1: 'estefania',
      lastnames: 'morquecho',
      lastnames1: 'chuqui',
      date_of_admission: new Date('2021-06-14'),
      dateOfBirth: new Date('1991-01-19'),
      phone: '0984152548',
    },
    {
      username: 'michacp',
      email: 'michacp@hotmail.com',
      password: '123456',
      roles: ['67083e5024ee620d917d2518'], // ID de un rol existente
      dni: '1900489921',
      firstnames: 'christian',
      firstnames1: 'michael',
      lastnames: 'suarez',
      lastnames1: 'pesantez',
      date_of_admission: new Date('2023-04-24'),
      dateOfBirth: new Date('1989-05-04'),
      phone: '0983249741',
    },
    {
      username: 'javierm',
      email: 'javier.mujica.0101@gmail.com',
      password: '123456',
      roles: ['67083e5024ee620d917d251a'], // ID de un rol existente
      dni: '183737122',
      firstnames: 'argenis',
      firstnames1: 'javier',
      lastnames: 'mujica',
      lastnames1: 'merchan',
      date_of_admission: new Date('2022-03-23'),
      dateOfBirth: new Date('2000-05-21'),
      phone: '0998515931',
    },
    {
      username: 'ronaldol',
      email: 'ronaldo.luzardo27@gmail.com',
      password: '123456',
      roles: ['67083e5024ee620d917d251a'], // ID de un rol existente
      dni: '0152421004',
      firstnames: 'ronaldo',
      firstnames1: 'jonas',
      lastnames: 'luzardo',
      lastnames1: 'berrios',
      date_of_admission: new Date('2024-09-01'),
      dateOfBirth: new Date('1998-02-24'),
      phone: '0984719724',
    },
    {
      username: 'angelo',
      email: 'javieralu3018@gmail.com',
      password: '123456',
      roles: ['67083e5024ee620d917d251a'], // ID de un rol existente
      dni: '0350304457',
      firstnames: 'angel',
      firstnames1: 'horacio',
      lastnames: 'cajisaca',
      lastnames1: '',
      date_of_admission: new Date('2024-10-31'),
      dateOfBirth: new Date('1998-05-29'),
      phone: '0995288578',
    },
    {
      username: 'rogrelysl',
      email: 'javieralu3018@gmail.com',
      password: '123456',
      roles: ['67083e5024ee620d917d2519'], // ID de un rol existente
      dni: '0350721411',
      firstnames: 'rogrelys',
      firstnames1: 'paola',
      lastnames: 'luzardo',
      lastnames1: 'berrios',
      date_of_admission: new Date('2022-06-23'),
      dateOfBirth: new Date('2006-09-18'),
      phone: '0995288578',
    },
  ];
  try {
    // Iterar sobre cada objeto en el arreglo
    for (const userData of usersDataArray) {
      const { dni, firstnames, lastnames, firstnames1, lastnames1, date_of_admission, dateOfBirth, phone, username, email, password, roles } = userData;

      // Encriptar la contraseña
      const hashedPassword = await bcrypt.hash(password, 10); // Encriptar la contraseña con un salt de 10 rondas

      // Crear y guardar un documento en el esquema `personalData`
      const personalData = new PersonalData({
        dni,
        firstnames,
        lastnames, 
        firstnames1,
        lastnames1,
        date_of_admission,
        dateOfBirth,
        phone,
      });

      const savedPersonalData = await personalData.save(); // Guardar los datos personales en la base de datos

      // Crear y guardar un documento en el esquema `users`, asociando los datos personales
      const user = new Users({
        username,
        email,
        password: hashedPassword, // Usar la contraseña encriptada
        roles,
        personalData: savedPersonalData._id, // Asignar la referencia de los datos personales
      });

      const savedUser = await user.save(); // Guardar el usuario en la base de datos

      results.push({
        user: savedUser,
        personalData: savedPersonalData,
      });
    }

    return {
      message: 'Todos los usuarios y datos personales guardados exitosamente',
      results
    };
  } catch (error) {
    throw new Error(`Error al guardar los datos: ${error.message}`);
  }
}

module.exports = UsersModels;