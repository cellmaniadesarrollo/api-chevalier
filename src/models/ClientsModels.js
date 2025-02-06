const ClientsModels = {};
const Clientsdb = require("../db/clients");
const Discount = require('../db/discounts');
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;
const { addClientToBirthdayDiscount } = require('../functions/functions');

ClientsModels.save = async (data, userId) => {
  try {
    const nuevoFormulario = new Clientsdb({
      dni: data.cedula,
      names: data.nombres,
      lastNames: data.apellidos,
      address: data.direccion,
      phone: data.telefono,
      email: data.correo,
      dateOfBirth: data.fechaNacimiento,
      edits: [{ editedBy: userId }] // El creador se registra como el primer editor
    });

    // Guardamos el nuevo formulario en la base de datos
    const cliente = await nuevoFormulario.save();

    // Verificamos si el cumpleaños coincide con la fecha actual
    const today = new Date();
    const birthDate = new Date(data.fechaNacimiento);
    if (
      birthDate.getDate() === today.getDate() &&
      birthDate.getMonth() === today.getMonth()
    ) {
      await addClientToBirthdayDiscount(cliente._id);
    }

    // Agregar el nuevo cliente al descuento del jueves con 1 corte gratis
    const thursdayDiscount = await Discount.findOne({ name: 'DESCUENTO JUEVES' });
    if (thursdayDiscount) {
      thursdayDiscount.customers.push({
        customer: cliente._id,
        freeCuts: 1,
      });
      await thursdayDiscount.save();
      console.log(`Cliente ${cliente._id} agregado al descuento del jueves con 1 corte gratis.`);
    } else {
      console.log('No se encontró el descuento con nombre "DESCUENTO JUEVES".');
    }

    return cliente._id;
  } catch (error) {
    console.log(error);
    throw error;
  }
};

ClientsModels.find = async (query) => {
  try {
    let searchCriteria = {};

    // Comprobamos si la query es un ObjectId válido
    const isObjectId = ObjectId.isValid(query) && new ObjectId(query).toString() === query;

    // Comprobamos si la query es numérica y tiene al menos 8 dígitos (DNI)
    const isDni = /^\d{8,}$/.test(query);

    if (isObjectId) {
      // Si la query es un ObjectId válido, busca por _id
      searchCriteria._id = new ObjectId(query);
    } else if (isDni) {
      // Si la query es un DNI válido, busca por el campo 'dni'
      searchCriteria.dni = query;
    } else {
      // Si no es un DNI ni un ObjectId, busca por coincidencias parciales en nombre o apellido
      const regex = new RegExp(query.split(' ').join('|'), 'i'); // Separa las palabras por espacios y crea un patrón
      searchCriteria = {
        $or: [
          { names: { $regex: regex } },
          { lastNames: { $regex: regex } }
        ]
      };
    }

    // Realizamos la búsqueda usando aggregate con las primeras 10 coincidencias
    const clients = await Clientsdb.aggregate([
      {
        $match: searchCriteria  // Filtra por los criterios de búsqueda
      },
      {
        $limit: 10  // Limita los resultados a 10
      },
      {
        $sort: { createdAt: -1 }  // Ordena los resultados por fecha de creación (opcional)
      },
      {
        $project: {  // Selecciona los campos a mostrar (opcional)
          _id: 1,
          dni: 1,
          names: 1,
          lastNames: 1,
        }
      }
    ]);

    // Si no se encuentran clientes, devolvemos un array vacío
    if (!clients || clients.length === 0) {
      return []; // O devolver un mensaje específico si lo prefieres
    }

    return clients;
  } catch (error) {
    // Capturamos y lanzamos el error para que el controlador lo maneje
    throw new Error('Error al buscar clientes: ' + error.message);
  }
};

// Guardar múltiples clientes
async function guardarClientes() {
  const userId = '67093a19fc10924562fe2eea'; // ID del creador

  // Datos de ejemplo para varios clientes
  const clientes = [
    {
      dni: '12345678',
      names: 'JUAN',
      lastNames: 'PEREZ',
      address: 'CALLE 123',
      phone: '987654321',
      email: 'juan.perez@example.com',
      dateOfBirth: new Date('1985-05-15')
    },
    {
      dni: '23456789',
      names: 'MARIA',
      lastNames: 'GONZALEZ',
      address: 'AVENIDA 456',
      phone: '876543210',
      email: 'maria.gonzalez@example.com',
      dateOfBirth: new Date('1990-07-20')
    },
    {
      dni: '34567890',
      names: 'CARLOS',
      lastNames: 'RODRIGUEZ',
      address: 'AVENIDA CENTRAL',
      phone: '765432109',
      email: 'carlos.rodriguez@example.com',
      dateOfBirth: new Date('1978-10-30')
    },
    {
      dni: '45678901',
      names: 'ANA',
      lastNames: 'MARTINEZ',
      address: 'CALLE 789',
      phone: '654321098',
      email: 'ana.martinez@example.com',
      dateOfBirth: new Date('1983-03-12')
    },
    {
      dni: '56789012',
      names: 'LUIS',
      lastNames: 'LOPEZ',
      address: 'BARRIO NUEVO',
      phone: '543210987',
      email: 'luis.lopez@example.com',
      dateOfBirth: new Date('1995-11-02')
    },
    {
      dni: '67890123',
      names: 'LAURA',
      lastNames: 'RAMIREZ',
      address: 'CALLE 567',
      phone: '432109876',
      email: 'laura.ramirez@example.com',
      dateOfBirth: new Date('1980-08-25')
    },
    {
      dni: '78901234',
      names: 'MIGUEL',
      lastNames: 'TORRES',
      address: 'AVENIDA NORTE',
      phone: '321098765',
      email: 'miguel.torres@example.com',
      dateOfBirth: new Date('1992-04-18')
    },
    {
      dni: '89012345',
      names: 'ANDREA',
      lastNames: 'HERNANDEZ',
      address: 'CALLE PRINCIPAL',
      phone: '210987654',
      email: 'andrea.hernandez@example.com',
      dateOfBirth: new Date('1997-09-08')
    },
    {
      dni: '90123456',
      names: 'JAVIER',
      lastNames: 'SANCHEZ',
      address: 'CALLE SEGUNDA',
      phone: '109876543',
      email: 'javier.sanchez@example.com',
      dateOfBirth: new Date('1989-01-25')
    },
    {
      dni: '01234567',
      names: 'SOFIA',
      lastNames: 'CASTILLO',
      address: 'CALLE TERCERA',
      phone: '987654321',
      email: 'sofia.castillo@example.com',
      dateOfBirth: new Date('1993-06-17')
    },
    {
      dni: '11234567',
      names: 'PEDRO',
      lastNames: 'GARCIA',
      address: 'BARRIO EL CENTRO',
      phone: '876543210',
      email: 'pedro.garcia@example.com',
      dateOfBirth: new Date('1981-12-22')
    },
    {
      dni: '21234567',
      names: 'LUCIA',
      lastNames: 'CARRILLO',
      address: 'AVENIDA LAS AMERICAS',
      phone: '765432109',
      email: 'lucia.carrillo@example.com',
      dateOfBirth: new Date('1984-05-10')
    },
    {
      dni: '31234567',
      names: 'ROBERTO',
      lastNames: 'MEDINA',
      address: 'CALLE SIERRA',
      phone: '654321098',
      email: 'roberto.medina@example.com',
      dateOfBirth: new Date('1987-03-04')
    },
    {
      dni: '41234567',
      names: 'ALEJANDRA',
      lastNames: 'FLORES',
      address: 'BARRIO NORTE',
      phone: '543210987',
      email: 'alejandra.flores@example.com',
      dateOfBirth: new Date('1996-08-11')
    },
    {
      dni: '51234567',
      names: 'FRANCISCO',
      lastNames: 'ESCOBAR',
      address: 'AVENIDA DEL SOL',
      phone: '432109876',
      email: 'francisco.escobar@example.com',
      dateOfBirth: new Date('1988-10-15')
    },
    {
      dni: '61234567',
      names: 'PATRICIA',
      lastNames: 'LARA',
      address: 'CALLE 456',
      phone: '321098765',
      email: 'patricia.lara@example.com',
      dateOfBirth: new Date('1991-12-29')
    },
    {
      dni: '71234567',
      names: 'ALBERTO',
      lastNames: 'CORDOVA',
      address: 'BARRIO SAN JUAN',
      phone: '210987654',
      email: 'alberto.cordova@example.com',
      dateOfBirth: new Date('1994-07-14')
    },
    {
      dni: '81234567',
      names: 'CAROLINA',
      lastNames: 'MORALES',
      address: 'AVENIDA CENTRAL',
      phone: '109876543',
      email: 'carolina.morales@example.com',
      dateOfBirth: new Date('1982-09-19')
    },
    {
      dni: '91234567',
      names: 'OSCAR',
      lastNames: 'FERNANDEZ',
      address: 'CALLE SIERRA',
      phone: '987654321',
      email: 'oscar.fernandez@example.com',
      dateOfBirth: new Date('1986-02-07')
    },
    {
      dni: '01235678',
      names: 'ESTELA',
      lastNames: 'GUZMAN',
      address: 'BARRIO ESTE',
      phone: '876543210',
      email: 'estela.guzman@example.com',
      dateOfBirth: new Date('1990-11-13')
    }
  ];
  try {
    const resultados = await Clientsdb.insertMany(
      clientes.map(cliente => ({
        ...cliente,
        edits: [{ editedBy: userId }]
      }))
    );
    console.log('Clientes guardados:', resultados);
  } catch (error) {
    console.error('Error al guardar clientes:', error);
  }
}
module.exports = ClientsModels;