require('dotenv').config(); 
const express = require('express')
const morgan = require('morgan')
const path = require('node:path');
const { urlencoded, json } = require('express');
const cors = require('cors');
const initDB = require('./config/db')
const https = require('https');
const fs = require('fs'); 
const WebSocket = require('ws');
const{ticktockupdate}=require('./Controllers/AppController')
const {updateBirthdayDiscount, taskAt8, taskAt12}=require('./functions/functions')
const cron = require('node-cron');
const { env } = require('node:process');

 
let options;

try {
  options = {
    key: fs.readFileSync('/home/ubuntu/proyects/privkey.pem'),
    cert: fs.readFileSync('/home/ubuntu/proyects/fullchain.pem'),
    // key: fs.readFileSync('./keys/privkey-new.pem'),
    // cert: fs.readFileSync('./keys/fullchain.pem')
  };
} catch (error) { 
  try { 
    options = {
      key: fs.readFileSync('src/keys/localhost.key'),
      cert: fs.readFileSync('src/keys/localhost.crt') 
    };
  } catch (error) {
    console.error('Error loading production certificates:', error.message);
    process.exit(1);
  }
}

const app = express();



/**
 * cron
 */
//Tarea programada para las 12:00 p.m. y las 12:00 a.m.

cron.schedule('0 0,12 * * *', () => {
  console.log('Ejecutando ticktockupdate');
  ticktockupdate()
});
// Programar la ejecución diaria a las 12:05 AM
cron.schedule('5 0 * * *', () => {
  console.log('Ejecutando updateBirthdayDiscount');
  updateBirthdayDiscount();
});

// Tarea programada para todos los jueves a las 8
cron.schedule('36 8 * * 2', () => {
  console.log('Ejecutando taskAt8 todos los jueves a las 8');
  taskAt8();
});

// cron.schedule('*/10 * * * * *', () => {
//   console.log('reload')
//   ticktockupdate()
 
// });
// Crear un servidor HTTPS utilizando Express
const server = https.createServer(options, app);
const serverws = https.createServer(options, app);
//app.use(bodyParser.json({ limit: '50mb' }));

// Middleware
const allowedOrigins = [
  'https://master.d2ufl7vq8jwkwg.amplifyapp.com',
  'https://web.chevalierbarbershop.com',
  'https://www.chevalierbarbershop.com',
  'https://chevalierbarbershop.com',
  'http://localhost:4200',
  'https://192.168.10.52'
];

app.use(cors({
  origin: function (origin, callback) {
    if (allowedOrigins.includes(origin) || !origin) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
  credentials: true
}));
app.use(morgan('dev'));
app.use(urlencoded({ extended: true }));
app.use(json());

/**
 * Rutas  console.log(JSON.stringify(filteredNumbers, null, 2))
 **/
app.use(require('./routes'))
app.use(require('./routes/login'))
app.use(require('./routes/clients'))
app.use(require('./routes/products'))
app.use(require('./routes/sales'))
/**   
 * RUTAS PUBLICAS 
 **/
 app.use(express.static(path.join(__dirname, 'public')))

/**
 * EJECUTAR SERVIDOR
 **/

server.listen(3050, () => {
  console.log('server up in https://localhost:3050');

});


initDB()