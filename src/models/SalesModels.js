const SalesModels = {};
const sdb = require("../db/productservicestypes")
const paymentMethods = require('../db/paymentMethods')
const DiscountModel = require('../db/discounts');
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;
const financialentitysModel = require("../db/financialEntitys")
const Sequential = require("../functions/functions")
const PaymentDetailsModel = require("../db/paymentDetails")
const SalesModeldb = require("../db/sales")
const productservicestypes = require("../db/productservicestypes")
const ProductService = require('../db/productservices')
const functions = require('../functions/functions')

SalesModels.findpaymentMethods = async () => {

  return await paymentMethods.aggregate([
    {
      $match:
        { active: true }
    },
    {

      $project: {
        _id: 1,
        name: 1
      }
    }])
}

//new ObjectId
SalesModels.finddiscounts = async (clientId) => {
  try {
    //savediscount100()
    // Asegurarte de que el clientId es un string antes de convertirlo en ObjectId
    if (typeof clientId !== 'string') {
      throw new Error('clientId debe ser un string');
    }
    const now = new Date();
    console.log(`Fecha actual (now): ${now}`); // Imprime la fecha actual


    const pipeline = [
      {
        $match: {
          $and: [
            {
              $or: [
                { isGlobal: true },  // Descuento global
                {
                  customers: {
                    $elemMatch: {
                      customer: new ObjectId(clientId),
                      freeCuts: { $gt: 0 }
                    }
                  }
                }
              ],
            },
            { validFrom: { $lte: now } },  // Fecha de inicio de validez
            { validUntil: { $gte: now } }  // Fecha de fin de validez
          ],
        },
      },
      {
        $lookup: {
          from: 'discounttypes',  // Referencia a la colección de tipos de descuento
          localField: 'discountType',
          foreignField: '_id',
          as: 'discountTypeDetails',
        },
      },
      {
        $unwind: {
          path: '$discountTypeDetails',
          preserveNullAndEmptyArrays: true,
        },
      },
      {
        $lookup: {
          from: 'productservices',  // Referencia a la colección de productos o servicios
          localField: 'productsOrServices',
          foreignField: '_id',
          as: 'productsOrServicesDetails',
        },
      },
      {
        $project: {
          _id: 1,
          name: 1,
          description: 1,
          value: 1,
          isGlobal: 1,
          discountType: '$discountTypeDetails.name',  // Tipo de descuento (PERCENTAGE o FIXED)
          productsOrServices: {
            $map: {
              input: '$productsOrServicesDetails',
              as: 'productOrService',
              in: {
                _id: '$$productOrService._id',
                name: '$$productOrService.name',
              },
            },
          },
        },
      },
    ];

    const discounts = await DiscountModel.aggregate(pipeline);
    //console.log(discounts)
    return discounts;

  } catch (error) {
    throw error;
  }
}
SalesModels.findgetfinancialentitys = async () => {
  try {


    const result = await financialentitysModel.aggregate([{
      $project: {
        name: 1
      }
    }]);
    return result
  } catch (error) {
    console.log(error)
    throw error
  }
}
SalesModels.getproductservicestypes = async () => {
  try {


    const result = await productservicestypes.aggregate([{
      $project: {
        name: 1
      }
    }]);
    return result
  } catch (error) {
    console.log(error)
    throw error
  }
}
SalesModels.save = async (data, user) => {
  try {
    // 1. Generar número de orden
    const numberOrder = await Sequential.getSequential("sales");

    // 2. Crear detalles de pago
    const paymentDetailsData = {
      paymentMethod: data.formaPago, // Recibes el método de pago desde el frontend
      subtotal: data.total.subtotal,
      total_discount: data.total.totalDescuento,
      amount: data.total.total,
      bankEntity: data.entidadBancaria ? data.entidadBancaria : null, // Solo si es transferencia
      transferNumber: data.numeroTransferencia || null
    };

    // Guardar detalles de pago en la base de datos
    const paymentDetails = await PaymentDetailsModel.create(paymentDetailsData);

    // 3. Crear productos o servicios
    const productsOrServices = data.productosservcio.map(item => ({
      item: item._id,
      price: item.price,
      discount: item.discount
    }));

    // 4. Crear el documento de venta
    const saleData = {
      client: data.cliente, // Asigna el cliente desde data
      barber: data.barbero, // Asigna el barbero desde data
      cashier: user._id, // Asigna el usuario (cajero) desde el parámetro user
      paymentDetails: paymentDetails._id, // Asigna el ID de los detalles de pago creados
      discount: data.descuento ? data.descuento : null, // Asigna el descuento si existe
      productsOrServices: productsOrServices, // Lista de productos o servicios
      saleNumber: numberOrder, // Número de orden generado por Sequential 
      dailyBarberSaleNumber: await getDailyBarberSaleNumber(data.barbero),
      observations: data.observaciones || '' // Asigna observaciones o cadena vacía
    };
    // Guardar la venta en la base de datos
    const sale = await SalesModeldb.create(saleData);

    const consumidorFinal = await functions.isConsumidorFinal(data.cliente)
    const corteGeneral = await functions.hasCorteGeneral(data.productosservcio)
 
    if (!consumidorFinal && corteGeneral) {
      const freeCuts = await functions.hasFreeCuts(data.cliente)
      if (!freeCuts) {

        await functions.manageHaircutCounter(data.cliente)
      } {
        console.log('el cliente tiene cortes gratis disponibles')
        await functions.applyDiscounts(data)
      }
    } else {
      console.log('es consumidor final o tiene corte general')
    }

    // Devolver la venta creada
    return sale;

  } catch (error) {
    console.error('Error al guardar la venta:', error);
    throw new Error('No se pudo guardar la venta');
  }
}
SalesModels.list = async (data) => {
  try {
    const page = data.page || 1;
    const limit = data.limit || 10;
    const filters = data.filters || {};

    const query = [];
    if (filters.barberId) {
      query.push({ barberid: new ObjectId(filters.barberId) });
    }
    if (filters.productType) {

      query.push({ "productDetails.type": new ObjectId(filters.productType) }); // Cambio aquí
    }
    if (filters.saleNumber) {
      query.push({ saleNumber: parseInt(filters.saleNumber) });
    }

    const productsList = await SalesModeldb.aggregate([

      { $unwind: "$productsOrServices" },
      {
        $lookup: {
          from: 'clients',
          localField: 'client',
          foreignField: '_id',
          as: 'clientDetails'
        }
      },
      { $unwind: "$clientDetails" },
      {
        $lookup: {
          from: 'users',
          localField: 'barber',
          foreignField: '_id',
          as: 'barberDetails'
        }
      },
      { $unwind: "$barberDetails" },
      {
        $lookup: {
          from: 'users',
          localField: 'cashier',
          foreignField: '_id',
          as: 'cashierDetails'
        }
      },
      { $unwind: "$cashierDetails" },
      {
        $lookup: {
          from: 'personaldatas',
          localField: 'barberDetails.personalData',
          foreignField: '_id',
          as: 'barberPersonalData'
        }
      },
      { $unwind: "$barberPersonalData" },
      {
        $lookup: {
          from: 'personaldatas',
          localField: 'cashierDetails.personalData',
          foreignField: '_id',
          as: 'cashierPersonalData'
        }
      },
      { $unwind: "$cashierPersonalData" },
      {
        $lookup: {
          from: 'productservices',
          localField: 'productsOrServices.item',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: "$productDetails" },
      {
        $lookup: {
          from: 'productservicestypes',
          localField: 'productDetails.type', // Relacionar con el tipo del producto
          foreignField: '_id',
          as: 'productTypeDetails'
        }
      },
      { $unwind: "$productTypeDetails" },
      {
        $project: {
          saleNumber: 1,
          saleDate: 1,
          saleDate: 1,
          "productDetails.type": 1,
          productService: "$productDetails.name",
          type: "$productTypeDetails.name", // Mostrar el nombre del tipo
          total: "$productsOrServices.price",
          client: {
            $concat: ["$clientDetails.names", " ", "$clientDetails.lastNames"]
          },
          barberid: "$barber",
          barber: {
            $concat: ["$barberPersonalData.firstnames", " ", "$barberPersonalData.lastnames"]
          },
          seller: {
            $concat: ["$cashierPersonalData.firstnames", " ", "$cashierPersonalData.lastnames"]
          }
        }
      },
      { $match: query.length ? { $and: query } : {} },
      { $sort: { saleDate: -1 } },  // Ordena por fecha de venta más reciente
      {
        $facet: {
          metadata: [{ $count: "total" }, { $addFields: { page, limit } }],
          products: [{ $skip: (page - 1) * limit }, { $limit: limit }]
        }
      }
    ]);

    const result = {
      total: productsList[0].metadata[0]?.total || 0,
      page,
      limit,
      products: productsList[0].products
    };

    return result;
  } catch (error) {
    console.error("Error obteniendo lista de ventas:", error);
    throw error;
  }
}

SalesModels.reports = async (Datedata, barberId = null) => {
  try {
    const matchStage = {};

    // Filtra por barbero si se proporciona un ID específico
    if (barberId && barberId !== 'null') {
      matchStage.barber = new ObjectId(barberId);
    }

    // Filtra por rango de fechas si Datedata está presente
    if (Datedata) {
      matchStage.saleDate = {
        $gte: new Date(Datedata.start),
        $lte: new Date(Datedata.end)
      };

      const result = await SalesModeldb.aggregate([
        // Filtro de intervalo de fechas y barbero
        { $match: matchStage },

        // Unwind para aplanar el arreglo de productsOrServices
        { $unwind: "$productsOrServices" },

        // Realizamos el lookup y unwind para obtener los detalles de los productos y servicios
        {
          $lookup: {
            from: "productservices",
            localField: "productsOrServices.item",
            foreignField: "_id",
            as: "productservice"
          }
        },
        { $unwind: "$productservice" },
        {
          $lookup: {
            from: "productservicestypes",
            localField: "productservice.type",
            foreignField: "_id",
            as: "serviceType"
          }
        },
        { $unwind: "$serviceType" },

        // Calcula el precio considerando si productsOrServices.price es un arreglo
        {
          $addFields: {
            price: {
              $cond: {
                if: { $isArray: "$productsOrServices.price" },
                then: { $sum: "$productsOrServices.price" },
                else: "$productsOrServices.price"
              }
            }
          }
        },

        // Usamos $facet para dividir en dos facetas: resumen total y reporte de servicios
        {
          $facet: {
            // Faceta para el resumen total
            resumenIngresos: [
              {
                $group: {
                  _id: null,
                  ingresoTotal: { $sum: "$price" },
                  contador: { $sum: 1 } // Contador total de documentos
                }
              },
              {
                $project: {
                  _id: 0,
                  resumenIngresos: {
                    ingresoTotal: "$ingresoTotal",
                    countTotal: "$contador" // Incluimos el contador
                  }
                }
              }
            ],

            // Faceta para el desglose de servicios
            serviciosreportes: [
              {
                $group: {
                  _id: "$productservice.name", // Agrupa por nombre de servicio
                  ingresoTotal: { $sum: "$price" },
                  contador: { $sum: 1 } // Contador de documentos por servicio
                }
              },
              {
                $project: {
                  _id: 0,
                  servicio: "$_id",
                  ingresoTotal: "$ingresoTotal",
                  countTotal: "$contador" // Incluimos el contador
                }
              }
            ]
          }
        }
      ]);

      return result[0];
    }
    else {


      // Calculamos el último domingo y el próximo sábado desde la fecha actual 
      const fiveHoursAgo = new Date(new Date().getTime() - 5 * 60 * 60 * 1000);
      const dayOfWeek = fiveHoursAgo.getUTCDay(); // 0 (domingo) a 6 (sábado)
      const lastSunday = new Date(fiveHoursAgo);
      lastSunday.setUTCDate(fiveHoursAgo.getUTCDate() - dayOfWeek); // Retrocede al último domingo
      lastSunday.setUTCHours(0, 0, 0, 0); // Ajusta a medianoche

      const nextSaturday = new Date(lastSunday);
      nextSaturday.setUTCDate(lastSunday.getUTCDate() + 6); // Avanza 6 días al próximo sábado
      nextSaturday.setUTCHours(23, 59, 59, 999); // Ajusta a final del día


      // Calcula la fecha y hora actual restando 5 horas


      const result = await SalesModeldb.aggregate([
        // Filtro de intervalo de fechas y barbero
        { $match: matchStage },

        // Unwind para aplanar el arreglo de productsOrServices
        { $unwind: "$productsOrServices" },

        // Realizamos el lookup y unwind para obtener los detalles de los productos y servicios
        {
          $lookup: {
            from: "productservices",
            localField: "productsOrServices.item",
            foreignField: "_id",
            as: "productservice"
          }
        },
        { $unwind: "$productservice" },
        {
          $lookup: {
            from: "productservicestypes",
            localField: "productservice.type",
            foreignField: "_id",
            as: "serviceType"
          }
        },
        { $unwind: "$serviceType" },

        // Calcula el precio considerando si productsOrServices.price es un arreglo
        {
          $addFields: {
            price: {
              $cond: {
                if: { $isArray: "$productsOrServices.price" },
                then: { $sum: "$productsOrServices.price" },
                else: "$productsOrServices.price"
              }
            }
          }
        },

        // Usamos $facet para dividir en dos facetas: resumen total y reporte de servicios
        {
          $facet: {
            // Faceta para el resumen total
            resumenIngresos: [
              {
                $group: {
                  _id: null,
                  totalHoy: {
                    $sum: {
                      $cond: [
                        {
                          $eq: [
                            { $dateToString: { format: "%Y-%m-%d", date: "$saleDate" } },
                            { $dateToString: { format: "%Y-%m-%d", date: fiveHoursAgo } }
                          ]
                        },
                        "$price",
                        0
                      ]
                    }
                  },
                  countHoy: {
                    $sum: {
                      $cond: [
                        {
                          $eq: [
                            { $dateToString: { format: "%Y-%m-%d", date: "$saleDate" } },
                            { $dateToString: { format: "%Y-%m-%d", date: fiveHoursAgo } }
                          ]
                        },
                        1,
                        0
                      ]
                    }
                  },
                  totalSemana: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $gte: ["$saleDate", lastSunday] },
                            { $lte: ["$saleDate", nextSaturday] },
                          ],
                        },
                        "$price",
                        0,
                      ],
                    },
                  },
                  countSemana: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $gte: ["$saleDate", lastSunday] },
                            { $lte: ["$saleDate", nextSaturday] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  totalMes: {
                    $sum: {
                      $cond: [
                        {
                          $eq: [
                            { $dateToString: { format: "%Y-%m", date: "$saleDate" } },
                            { $dateToString: { format: "%Y-%m", date: fiveHoursAgo } }
                          ]
                        },
                        "$price",
                        0
                      ]
                    }
                  },
                  countMes: {
                    $sum: {
                      $cond: [
                        {
                          $eq: [
                            { $dateToString: { format: "%Y-%m", date: "$saleDate" } },
                            { $dateToString: { format: "%Y-%m", date: fiveHoursAgo } }
                          ]
                        },
                        1,
                        0
                      ]
                    }
                  },
                  totalAno: {
                    $sum: {
                      $cond: [
                        {
                          $eq: [
                            { $year: "$saleDate" },
                            { $year: fiveHoursAgo }
                          ]
                        },
                        "$price",
                        0
                      ]
                    }
                  },
                  countAno: {
                    $sum: {
                      $cond: [
                        {
                          $eq: [
                            { $year: "$saleDate" },
                            { $year: fiveHoursAgo }
                          ]
                        },
                        1,
                        0
                      ]
                    }
                  }
                }
              },
              {
                $project: {
                  _id: 0,
                  resumenIngresos: {
                    totalHoy: "$totalHoy",
                    countHoy: "$countHoy",
                    totalSemana: "$totalSemana",
                    countSemana: "$countSemana",
                    totalMes: "$totalMes",
                    countMes: "$countMes",
                    totalAno: "$totalAno",
                    countAno: "$countAno"
                  }
                }
              }
            ],

            // Faceta para el desglose de servicios
            serviciosreportes: [
              {
                $group: {
                  _id: "$productservice.name",  // Agrupa por nombre de servicio 
                  totalHoy: {
                    $sum: {
                      $cond: [
                        {
                          $eq: [
                            { $dateToString: { format: "%Y-%m-%d", date: "$saleDate" } },
                            { $dateToString: { format: "%Y-%m-%d", date: fiveHoursAgo } }
                          ]
                        },
                        "$price",
                        0
                      ]
                    }
                  },
                  countHoy: {
                    $sum: {
                      $cond: [
                        {
                          $eq: [
                            { $dateToString: { format: "%Y-%m-%d", date: "$saleDate" } },
                            { $dateToString: { format: "%Y-%m-%d", date: fiveHoursAgo } }
                          ]
                        },
                        1,
                        0
                      ]
                    }
                  },
                  totalSemana: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $gte: ["$saleDate", lastSunday] },
                            { $lte: ["$saleDate", nextSaturday] },
                          ],
                        },
                        "$price",
                        0,
                      ],
                    },
                  },
                  countSemana: {
                    $sum: {
                      $cond: [
                        {
                          $and: [
                            { $gte: ["$saleDate", lastSunday] },
                            { $lte: ["$saleDate", nextSaturday] },
                          ],
                        },
                        1,
                        0,
                      ],
                    },
                  },
                  totalMes: {
                    $sum: {
                      $cond: [
                        {
                          $eq: [
                            { $dateToString: { format: "%Y-%m", date: "$saleDate" } },
                            { $dateToString: { format: "%Y-%m", date: fiveHoursAgo } }
                          ]
                        },
                        "$price",
                        0
                      ]
                    }
                  },
                  countMes: {
                    $sum: {
                      $cond: [
                        {
                          $eq: [
                            { $dateToString: { format: "%Y-%m", date: "$saleDate" } },
                            { $dateToString: { format: "%Y-%m", date: fiveHoursAgo } }
                          ]
                        },
                        1,
                        0
                      ]
                    }
                  },
                  totalAno: {
                    $sum: {
                      $cond: [
                        {
                          $eq: [
                            { $year: "$saleDate" },
                            { $year: fiveHoursAgo }
                          ]
                        },
                        "$price",
                        0
                      ]
                    }
                  },
                  countAno: {
                    $sum: {
                      $cond: [
                        {
                          $eq: [
                            { $year: "$saleDate" },
                            { $year: fiveHoursAgo }
                          ]
                        },
                        1,
                        0
                      ]
                    }
                  }
                }
              },
              {
                $project: {
                  _id: 0,
                  servicio: "$_id",
                  totalHoy: 1,
                  countHoy: 1,
                  totalSemana: 1,
                  countSemana: 1,
                  totalMes: 1,
                  countMes: 1,
                  totalAno: 1,
                  countAno: 1
                }
              }
            ]
          }
        }
      ]);

      return result[0];
    }

  } catch (error) {
    throw error
  }
}

SalesModels.finddocument = async (data) => {
  try {
    const salesData = await SalesModeldb.aggregate([
      {
        $match: {
          _id: new ObjectId(data)
        }
      },
      // Lookup para obtener los datos del cliente
      {
        $lookup: {
          from: 'clients',
          localField: 'client',
          foreignField: '_id',
          as: 'clientDetails'
        }
      },
      // Lookup para obtener los datos del barbero
      {
        $lookup: {
          from: 'users',
          localField: 'barber',
          foreignField: '_id',
          as: 'barberDetails'
        }
      },
      // Lookup para los datos personales del barbero
      {
        $lookup: {
          from: 'personaldatas',
          localField: 'barberDetails.personalData',
          foreignField: '_id',
          as: 'barberPersonalData'
        }
      },
      // Lookup para obtener los datos del vendedor (cashier)
      {
        $lookup: {
          from: 'users',
          localField: 'cashier',
          foreignField: '_id',
          as: 'cashierDetails'
        }
      },
      // Lookup para los datos personales del vendedor
      {
        $lookup: {
          from: 'personaldatas',
          localField: 'cashierDetails.personalData',
          foreignField: '_id',
          as: 'cashierPersonalData'
        }
      },
      // Lookup para obtener los datos de productos o servicios
      {
        $unwind: "$productsOrServices"
      },
      {
        $lookup: {
          from: 'productservices',
          localField: 'productsOrServices.item',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $addFields: {
          "productsOrServices.productName": {
            $arrayElemAt: ["$productDetails.name", 0]
          }
        }
      },
      {
        $group: {
          _id: "$_id",
          saleNumber: { $first: "$saleNumber" },
          saleDate: { $first: "$saleDate" },
          dailyBarberSaleNumber: { $first: "$dailyBarberSaleNumber" },
          observations: { $first: "$observations" },
          client: {
            $first: {
              dni: { $arrayElemAt: ["$clientDetails.dni", 0] },
              names: { $arrayElemAt: ["$clientDetails.names", 0] },
              lastNames: { $arrayElemAt: ["$clientDetails.lastNames", 0] },
            }
          },
          barber: {
            $first: {
              firstname: { $arrayElemAt: ["$barberPersonalData.firstnames", 0] },
              lastname: { $arrayElemAt: ["$barberPersonalData.lastnames", 0] },
            }
          },
          cashier: {
            $first: {
              firstname: { $arrayElemAt: ["$cashierPersonalData.firstnames", 0] },
              lastname: { $arrayElemAt: ["$cashierPersonalData.lastnames", 0] },
            }
          },
          productsOrServices: {
            $push: {
              item: "$productsOrServices.item",
              price: "$productsOrServices.price",
              productName: "$productsOrServices.productName"
            }
          },
          discount: { $first: "$discount" },
          paymentDetails: { $first: "$paymentDetails" }
        }
      },
      // Lookup para obtener los datos del descuento
      {
        $lookup: {
          from: 'discounts',
          localField: 'discount',
          foreignField: '_id',
          as: 'discountDetails'
        }
      },
      // Lookup para obtener el tipo de descuento
      {
        $lookup: {
          from: 'discounttypes',
          localField: 'discountDetails.discountType',
          foreignField: '_id',
          as: 'discountTypeDetails'
        }
      },
      // Lookup para obtener los detalles del pago
      {
        $lookup: {
          from: 'paymentdetails',
          localField: 'paymentDetails',
          foreignField: '_id',
          as: 'paymentDetailsInfo'
        }
      },
      // Lookup para obtener el método de pago
      {
        $lookup: {
          from: 'paymentmethods',
          localField: 'paymentDetailsInfo.paymentMethod',
          foreignField: '_id',
          as: 'paymentMethodDetails'
        }
      },
      // Proyección final
      {
        $project: {
          saleNumber: 1,
          dailyBarberSaleNumber: 1,
          saleDate: {
            $dateToString: {
              format: "%Y-%m-%d %H:%M:%S",
              date: "$saleDate"
            }
          },
          observations: 1,
          client: 1,
          barber: 1,
          cashier: 1,

          productsOrServices: 1,
          discount: {
            value: { $arrayElemAt: ["$discountDetails.value", 0] },
            type: { $arrayElemAt: ["$discountTypeDetails.name", 0] }
          },
          paymentMethod: {
            name: { $arrayElemAt: ["$paymentMethodDetails.name", 0] }
          }
        }
      }
    ]);

    return salesData[0];
  } catch (error) {
    console.error('Error en la agregación:', error);
    throw error;
  }
}

SalesModels.get5sales = async () => {
  try {
    const salesData = await SalesModeldb.aggregate([
      // Lookup para obtener los datos del cliente
      {
        $lookup: {
          from: 'clients',
          localField: 'client',
          foreignField: '_id',
          as: 'clientDetails'
        }
      },
      // Lookup para obtener los datos del barbero
      {
        $lookup: {
          from: 'users',
          localField: 'barber',
          foreignField: '_id',
          as: 'barberDetails'
        }
      },
      // Lookup para los datos personales del barbero
      {
        $lookup: {
          from: 'personaldatas',
          localField: 'barberDetails.personalData',
          foreignField: '_id',
          as: 'barberPersonalData'
        }
      },
      // Lookup para obtener los datos del vendedor (cashier)
      {
        $lookup: {
          from: 'users',
          localField: 'cashier',
          foreignField: '_id',
          as: 'cashierDetails'
        }
      },
      // Lookup para los datos personales del vendedor
      {
        $lookup: {
          from: 'personaldatas',
          localField: 'cashierDetails.personalData',
          foreignField: '_id',
          as: 'cashierPersonalData'
        }
      },
      // Lookup para obtener los datos de productos o servicios
      {
        $unwind: "$productsOrServices"
      },
      {
        $lookup: {
          from: 'productservices',
          localField: 'productsOrServices.item',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      {
        $addFields: {
          "productsOrServices.productName": {
            $arrayElemAt: ["$productDetails.name", 0]
          }
        }
      },
      // Lookup para los detalles de descuento
      {
        $lookup: {
          from: 'discounts',
          localField: 'productsOrServices.discount',
          foreignField: '_id',
          as: 'discountDetails'
        }
      },
      {
        $unwind: {
          path: "$discountDetails",
          //preserveNullAndEmptyArrays: true // Permitir productos sin descuento
        }
      },
      // Lookup para los tipos de descuento
      {
        $lookup: {
          from: 'discounttypes',
          localField: 'discountDetails.discountType',
          foreignField: '_id',
          as: 'discountTypeDetails'
        }
      },
      {
        $unwind: {
          path: "$discountTypeDetails",
          // preserveNullAndEmptyArrays: true
        }
      },
      // Agregar detalles de descuento al producto
      {
        $addFields: {
          "productsOrServices.discountDetails": {
            value: "$discountDetails.value",
            type: "$discountTypeDetails.name"
          }
        }
      },
      // Agrupar los datos por venta
      {
        $group: {
          _id: "$_id",
          saleNumber: { $first: "$saleNumber" },
          saleDate: { $first: "$saleDate" },
          observations: { $first: "$observations" },
          client: {
            $first: {
              dni: { $arrayElemAt: ["$clientDetails.dni", 0] },
              names: { $arrayElemAt: ["$clientDetails.names", 0] },
              lastNames: { $arrayElemAt: ["$clientDetails.lastNames", 0] },
            }
          },
          barber: {
            $first: {
              firstname: { $arrayElemAt: ["$barberPersonalData.firstnames", 0] },
              lastname: { $arrayElemAt: ["$barberPersonalData.lastnames", 0] },
            }
          },
          cashier: {
            $first: {
              firstname: { $arrayElemAt: ["$cashierPersonalData.firstnames", 0] },
              lastname: { $arrayElemAt: ["$cashierPersonalData.lastnames", 0] },
            }
          },
          productsOrServices: {
            $push: {
              item: "$productsOrServices.item",
              price: "$productsOrServices.price",
              productName: "$productsOrServices.productName",
              discountDetails: "$productsOrServices.discountDetails"
            }
          },
          paymentDetails: { $first: "$paymentDetails" }
        }
      },

      // Lookup para obtener los detalles del pago
      {
        $lookup: {
          from: 'paymentdetails',
          localField: 'paymentDetails',
          foreignField: '_id',
          as: 'paymentDetailsInfo'
        }
      },
      // Lookup para obtener el método de pago
      {
        $lookup: {
          from: 'paymentmethods',
          localField: 'paymentDetailsInfo.paymentMethod',
          foreignField: '_id',
          as: 'paymentMethodDetails'
        }
      },
      // Proyección final
      {
        $project: {
          saleNumber: 1,
          saleDate: {
            $dateToString: {
              format: "%Y-%m-%d %H:%M:%S",
              date: "$saleDate"
            }
          },
          observations: 1,
          client: 1,
          barber: 1,
          cashier: 1,
          productsOrServices: 1,
          paymentMethod: {
            name: { $arrayElemAt: ["$paymentMethodDetails.name", 0] }
          },
          discountDetails: 1,
          discountTypeDetails: 1
        }
      },
      // Ordenar por fecha descendente
      { $sort: { saleDate: -1 } },
      // Limitar a los últimos 5 registros
      { $limit: 5 }
    ]);

    return salesData;
  } catch (error) {
    console.error('Error en la agregación:', error);
    throw error;
  }
}


const PdfPrinter = require("pdfmake");
var { Base64Encode } = require("base64-stream");
const fonts = require("../pdf/fonts"); // Ruta a tu archivo de fuentes
const styles = require("../pdf/styles"); // Ruta a tu archivo de estilos
const { defaultStyle } = require("../pdf/pdfContent"); // Ruta a tu archivo de estilos predeterminados

SalesModels.reportspdfresumen = async (data, fecha = null, barbero = null) => {
  //await assignDefaultDailySaleNumber(0)
  if (fecha) {
    fecha = "Del " + formatearFecha(fecha.start) + " al " + formatearFecha(fecha.end)
  } else {
    fecha = ""
  }
  if (barbero) {
    const users = await mongoose.model('users').aggregate([
      {
        $match: { available: true, _id: new ObjectId(barbero) } // Filtrar usuarios disponibles
      },
      {
        $lookup: {
          from: 'personaldatas', // Colección de datos personales
          localField: 'personalData', // Campo de referencia en la colección de usuarios
          foreignField: '_id', // Nombre para los datos personales embebidos
          pipeline: [{
            $project: {
              _id: 0,
              firstnames: 1,
              lastnames: 1,
              firstnames1: 1,
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
    barbero = users[0].name
  } else {
    barbero = ''
  }





  // Generar las tablas dinámicamente, chequeando el formato del JSON
  let serviciosTable = [
    [
      { text: "Servicio", style: "tableHeader" },
      { text: "Hoy", style: "tableHeader" },
      { text: "Semana", style: "tableHeader" },
      { text: "Mes", style: "tableHeader" },
      { text: "Año", style: "tableHeader" },
    ],
  ];

  // Inicializar la tabla de ingresos dependiendo del formato del JSON
  let ingresosTable = [
    [
      { text: "Periodo", style: "tableHeader" },
      { text: "Total", style: "tableHeader" },
      { text: "Cantidad", style: "tableHeader" },
    ],
  ];

  // Chequeo si el JSON tiene un formato distinto (ejemplo del segundo JSON)
  if (data.serviciosreportes[0].ingresoTotal !== undefined) {
    // Formato alternativo del JSON detectado
    serviciosTable = [
      [
        { text: "Servicio", style: "tableHeader" },
        { text: "Total Ingresos", style: "tableHeader" },
        { text: "Cantidad", style: "tableHeader" },
      ],
    ];

    // Crear la tabla de servicios para el formato alternativo
    data.serviciosreportes.forEach((servicio) => {
      serviciosTable.push([
        servicio.servicio,
        servicio.ingresoTotal,
        servicio.countTotal,
      ]);
    });

    // Crear la tabla de ingresos para el formato alternativo
    const resumenIngresos = data.resumenIngresos[0].resumenIngresos;
    ingresosTable.push([
      "Total",
      resumenIngresos.ingresoTotal,
      resumenIngresos.countTotal,
    ]);
  } else {
    // Formato original del JSON
    data.serviciosreportes.forEach((servicio) => {
      serviciosTable.push([
        servicio.servicio,
        `${servicio.totalHoy} (${servicio.countHoy})`,
        `${servicio.totalSemana} (${servicio.countSemana})`,
        `${servicio.totalMes} (${servicio.countMes})`,
        `${servicio.totalAno} (${servicio.countAno})`,
      ]);
    });

    const resumenIngresos = data.resumenIngresos[0].resumenIngresos;
    ingresosTable.push(
      ["Hoy", resumenIngresos.totalHoy, resumenIngresos.countHoy],
      ["Semana", resumenIngresos.totalSemana, resumenIngresos.countSemana],
      ["Mes", resumenIngresos.totalMes, resumenIngresos.countMes],
      ["Año", resumenIngresos.totalAno, resumenIngresos.countAno]
    );
  }

  // Definición del documento
  const docDefinition = {
    header: {
      columns: [
        { text: "CHEVALIERBARBERSHOP", style: "documentHeaderLeft" },
        {
          text: new Date().toLocaleDateString("es-MX"),
          style: "documentHeaderRight",
        },
      ],
    },
    footer: function (currentPage, pageCount) {
      return {
        margin: 10,
        columns: [
          {
            fontSize: 9,
            text: `Página ${currentPage} de ${pageCount}`,
            alignment: "right",
          },
        ],
      };
    },
    content: [
      { text: "Reporte de Servicios", style: "invoiceTitle", alignment: "center", width: "*" },
      { text: `${barbero}`, style: "subTitle", alignment: "center" },
      { text: `${fecha}`, style: "subTitle", alignment: "center", margin: [0, 0, 0, 20] },

      {
        table: {
          headerRows: 1,
          widths: data.serviciosreportes[0].ingresoTotal !== undefined
            ? ["*", "auto", "auto"] // Ajuste de columnas para el formato alternativo
            : ["*", "auto", "auto", "auto", "auto"], // Columnas para el formato original
          body: serviciosTable,
        },
        layout: "lightHorizontalLines",
      },
      { text: "\nResumen de Ingresos", style: "subTitle" },
      {
        table: {
          headerRows: 1,
          widths: ["*", "auto", "auto"],
          body: ingresosTable,
        },
        layout: "lightHorizontalLines",
      },
      {
        text: "\n_____________________________\nGenerado automáticamente",
        alignment: "center",
        margin: [0, 50, 0, 0],
      },
    ],
    styles: styles,
    defaultStyle: defaultStyle,
  };


  const docDef1 = {
    styles: styles,
    defaultStyle: defaultStyle,
  };
  const docDef = Object.assign(docDefinition, docDef1);

  // Crear la instancia de pdfmake
  const printer = new PdfPrinter(fonts);

  const doc = printer.createPdfKitDocument(docDef);

  let finalString = "";
  const stream = doc.pipe(new Base64Encode());
  stream.on("data", function (chunk) {
    finalString += chunk;
  });
  doc.end();

  const bin = await new Promise((resolve, reject) => {
    stream.on("end", function () {
      resolve(finalString);
    });
    stream.on("error", function (err) {
      reject(err);
    });
  });

  return bin;
}
SalesModels.reportWeeklySales = async (data) => {
  try {
    const { barbero } = data;
    const today = new Date(new Date().getTime() - 5 * 60 * 60 * 1000);
    // Calcular el inicio de la semana (domingo pasado)
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Retrocede al domingo
    startOfWeek.setHours(0, 0, 0, 0); // Reinicia a medianoche

    // Calcular el final de la semana (sábado a las 23:59:59)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    // Filtro base: ventas dentro de la semana
    const matchFilter = {
      saleDate: { $gte: startOfWeek, $lte: endOfWeek },
    };

    // Agregar filtro por barbero si está presente y no es 'null'
    if (barbero && barbero !== 'null') {
      matchFilter.barber = new ObjectId(barbero)
    }
    const sales = await SalesModeldb.aggregate([
      { $match: matchFilter },
      { $addFields: { dayOfWeek: { $dayOfWeek: "$saleDate" } } },
      { $unwind: "$productsOrServices" },
      {
        $lookup: {
          from: "productservices",
          localField: "productsOrServices.item",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      {
        $addFields: {
          "productsOrServices.name": "$productDetails.name"
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "barber",
          foreignField: "_id",
          as: "barberDetails"
        }
      },
      { $unwind: "$barberDetails" },
      {
        $lookup: {
          from: "personaldatas",
          localField: "barberDetails.personalData",
          foreignField: "_id",
          as: "personalBarberData"
        }
      },
      { $unwind: "$personalBarberData" },
      {
        $addFields: {
          barberName: {
            $concat: [
              "$personalBarberData.firstnames",
              " ",
              "$personalBarberData.lastnames"
            ]
          }
        }
      },
      {
        $lookup: {
          from: "clients",
          localField: "client",
          foreignField: "_id",
          as: "clientDetails"
        }
      },
      {
        $addFields: {
          clientDetails: { $arrayElemAt: ["$clientDetails", 0] }
        }
      },
      {
        $addFields: {
          clientName: {
            $concat: [
              { $ifNull: ["$clientDetails.names", ""] },
              " ",
              { $ifNull: ["$clientDetails.lastNames", ""] }
            ]
          }
        }
      },
      {
        $group: {
          _id: "$_id",
          barberName: { $first: "$barberName" },
          clientName: { $first: "$clientName" },
          dayOfWeek: { $first: "$dayOfWeek" },
          saleDate: { $first: "$saleDate" },
          saleNumber: { $first: "$saleNumber" },
          productosServicios: {
            $push: {
              item: "$productsOrServices.item",
              price: "$productsOrServices.price",
              _id: "$productsOrServices._id",
              name: "$productsOrServices.name"
            }
          }
        }
      },
      {
        $group: {
          _id: { barberName: "$barberName", dayOfWeek: "$dayOfWeek" },
          sales: {
            $push: {
              saleNumber: "$saleNumber",
              saleDate: "$saleDate",
              clientName: "$clientName",
              productosServicios: "$productosServicios"
            }
          }
        }
      },
      {
        $group: {
          _id: "$_id.barberName",
          days: {
            $push: {
              dayOfWeek: "$_id.dayOfWeek",
              sales: "$sales"
            }
          }
        }
      }
    ]);

    // Ordenar días de la semana del domingo al sábado
    const daysOrder = {
      "DOMINGO": 0,
      "LUNES": 1,
      "MARTES": 2,
      "MIÉRCOLES": 3,
      "JUEVES": 4,
      "VIERNES": 5,
      "SÁBADO": 6
    };
    // Mapeo de días en español
    const daysMap = [
      "DOMINGO",
      "LUNES",
      "MARTES",
      "MIÉRCOLES",
      "JUEVES",
      "VIERNES",
      "SÁBADO"
    ];
    return sales.map(sale => ({
      barbero: sale._id,
      dias: sale.days
        .map(day => ({
          dia: `${daysMap[day.dayOfWeek - 1]} - ${formatDate(day.sales[0]?.saleDate)}`,
          ventas: day.sales
        }))
        .sort((a, b) => daysOrder[a.dia.split(" ")[0]] - daysOrder[b.dia.split(" ")[0]])
    }));
  } catch (error) {
    console.error('Error fetching sales for this week:', error);
    throw error;
  }
}

SalesModels.reportWeeklySalespdf = async (data) => {
  const printer = new PdfPrinter(fonts);

  const generateTableForBarber = (barberData) => {
    const content = [];

    barberData.dias.forEach((dia) => {
      const tableBody = [
        [
          { text: "N° Venta", style: "tableHeader" },
          { text: "Hora", style: "tableHeader" },
          { text: "Cliente", style: "tableHeader" },
          { text: "Servicio", style: "tableHeader" },
          { text: "Precio", style: "tableHeader" },

        ],
      ];

      let total = 0;

      dia.ventas.forEach((venta) => {
        venta.productosServicios.forEach((producto) => {
          const hora = venta.saleDate
            ? new Date(venta.saleDate).toISOString().split("T")[1].split(".")[0] // Obtiene solo la hora en formato HH:mm:ss
            : "";

          tableBody.push([
            { text: venta.saleNumber || "", style: "tableCell" },
            { text: hora, style: "tableCell" },
            { text: venta.clientName || "", style: "tableCell" },
            { text: producto.name, style: "tableCell" },
            { text: `$${producto.price}`, style: "tableCell" },

          ]);

          total += producto.price;
        });
      });

      tableBody.push([
        { text: "", style: "tableTotal" },
        { text: "", style: "tableTotal" },
        { text: "", style: "tableTotal" },
        { text: "Total: ", style: "tableTotal" },
        { text: `$${total}`, alignment: "left", style: "tableTotal" },
      ]);

      content.push(
        { text: dia.dia, style: "dayHeader" },
        {
          table: {
            widths: ["15%", "15%", "30%", "30%", "10%"],
            body: tableBody,
          },
          layout: "lightHorizontalLines",
        }
      );
    });

    return content;
  };

  const docDefinition = {
    content: data.map((barber) => [
      { text: barber.barbero, style: "barberHeader", margin: [0, 10, 0, 10] },
      ...generateTableForBarber(barber),
    ]),
    styles: {
      barberHeader: { fontSize: 16, bold: true, alignment: "left" },
      dayHeader: { fontSize: 14, bold: true, margin: [0, 10, 0, 5] },
      tableHeader: { bold: true, fontSize: 12, fillColor: "#CCCCCC" },
      tableCell: { fontSize: 10 },
      tableTotal: { bold: true, fontSize: 12 },
    }, defaultStyle,
    header: {
      columns: [
        {
          text: new Date().toLocaleDateString("es-MX"),
          style: "documentHeaderRight",
        },
        { text: "CHEVALIERBARBERSHOP", style: "documentHeaderLeft" },

      ],
    },
    footer: (currentPage, pageCount) => ({
      margin: 10,
      columns: [
        {
          fontSize: 9,
          text: `Página ${currentPage} de ${pageCount}`,
          alignment: "right",
        },
      ],
    }),
  };

  return new Promise((resolve, reject) => {
    const pdfDoc = printer.createPdfKitDocument(docDefinition);
    const chunks = [];

    pdfDoc.on("data", (chunk) => chunks.push(chunk));
    pdfDoc.on("end", () => {
      const result = Buffer.concat(chunks);
      resolve(result.toString("base64"));
    });
    pdfDoc.on("error", reject);

    pdfDoc.end();
  });
};
SalesModels.reportWeeklySalesresumen = async (data) => {
  try {
    // Calcular rango de fechas (domingo - sábado)
    const today = new Date();
    const currentDay = today.getDay();
    const diffToSunday = today.getDate() - currentDay;
    const startOfWeek = new Date(today.setDate(diffToSunday));
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Filtro por barbero
    const matchCondition = {
      saleDate: { $gte: startOfWeek, $lte: endOfWeek }
    };
    if (data.barbero && data.barbero !== "null") {
      matchCondition.barber = new ObjectId(data.barbero);
    }

    // Pipeline de agregación
    const result = await SalesModeldb.aggregate([
      { $match: matchCondition },
      { $unwind: "$productsOrServices" },
      {
        $group: {
          _id: {
            barber: "$barber",
            day: { $dateToString: { format: "%Y-%m-%d", date: "$saleDate" } },
            item: "$productsOrServices.item",
            price: "$productsOrServices.price",
            discount: "$productsOrServices.discount"
          },
          count: { $sum: 1 }
        }
      },
      // Lookup para obtener el nombre del producto/servicio
      {
        $lookup: {
          from: "productservices",
          localField: "_id.item",
          foreignField: "_id",
          as: "productDetails"
        }
      },
      { $unwind: "$productDetails" },
      // Lookup para obtener el descuento
      {
        $lookup: {
          from: "discounts",
          localField: "_id.discount",
          foreignField: "_id",
          as: "discountsDetails"
        }
      },
      { $unwind: "$discountsDetails" },
      // Lookup para obtener el tipo de descuento
      {
        $lookup: {
          from: "discounttypes",
          localField: "discountsDetails.discountType",
          foreignField: "_id",
          as: "discounttypesDetails"
        }
      },
      { $unwind: "$discounttypesDetails" },
      {
        $addFields: {
          itemName: {
            $concat: ["$productDetails.name", " - ", { $toString: "$_id.price" }, " - ", { $toString: "$discountsDetails.name" }, " (", { $toString: "$discountsDetails.value" }, {
              $cond: {
                if: { $eq: ["$discounttypesDetails.name", "PERCENTAGE"] },
                then: " %",
                else: " $"
              }
            }, ")"]
          }
        }
      },
      {
        $group: {
          _id: {
            barber: "$_id.barber",
            day: "$_id.day"
          },
          ventas: {
            $push: {
              name: "$itemName",
              price: "$_id.price",
              count: "$count",
              commissionRate: "$productDetails.commissionRate",
              discount: "$discountsDetails.value",
              discounttype: "$discounttypesDetails.name"
            }
          }
        }
      },
      {
        $group: {
          _id: "$_id.barber",
          dias: {
            $push: {
              dia: "$_id.day",
              ventas: "$ventas"
            }
          }
        }
      },
      {
        $lookup: {
          from: "users",
          localField: "_id",
          foreignField: "_id",
          as: "barberDetails"
        }
      },
      { $unwind: "$barberDetails" },
      {
        $lookup: {
          from: "personaldatas",
          localField: "barberDetails.personalData",
          foreignField: "_id",
          as: "personalDetails"
        }
      },
      { $unwind: "$personalDetails" },
      {
        $addFields: {
          barbero: {
            $concat: [
              "$personalDetails.firstnames",
              " ",
              "$personalDetails.lastnames"
            ]
          }
        }
      },
      // Ordenar días dentro de cada barbero
      {
        $addFields: {
          dias: {
            $map: {
              input: "$dias",
              as: "dia",
              in: {
                dia: {
                  $concat: [
                    {
                      $arrayElemAt: [
                        [
                          "DOMINGO",
                          "LUNES",
                          "MARTES",
                          "MIÉRCOLES",
                          "JUEVES",
                          "VIERNES",
                          "SÁBADO"
                        ],
                        {
                          $mod: [
                            { $subtract: [{ $dayOfWeek: { $dateFromString: { dateString: "$$dia.dia" } } }, 1] },
                            7
                          ]
                        }
                      ]
                    },
                    " - ",
                    { $dateToString: { format: "%Y/%m/%d", date: { $dateFromString: { dateString: "$$dia.dia" } } } }
                  ]
                },
                ventas: "$$dia.ventas",
                sortIndex: {
                  $mod: [
                    { $subtract: [{ $dayOfWeek: { $dateFromString: { dateString: "$$dia.dia" } } }, 1] },
                    7
                  ]
                }
              }
            }
          }
        }
      },
      {
        $addFields: {
          dias: {
            $sortArray: {
              input: "$dias",
              sortBy: { sortIndex: 1 }
            }
          }
        }
      },
      {
        $project: {
          barbero: 1,
          dias: {
            $map: {
              input: "$dias",
              as: "day",
              in: {
                dia: "$$day.dia",
                ventas: "$$day.ventas"
              }
            }
          }
        }
      }
    ]);

    return result;
  } catch (err) {
    console.error("Error in reportWeeklySalesResumen:", err);
    throw err;
  }

}
SalesModels.reportWeeklySalesresumenpdf = async (data) => {

  const printer = new PdfPrinter(fonts);

  const content = [];
  data.forEach((barbero) => {
    content.push({
      text: barbero.barbero,
      style: "header",
      margin: [0, 10, 0, 10],
    });
    const esBarberoValido = 
    (barbero.barbero === "BRYAN PERLAZA" || 
     barbero.barbero === "ARGENIS MUJICA" || 
     barbero.barbero === "RONALDO LUZARDO") 
    ? true 
    : false;
    console.log(esBarberoValido)
    let totalBarbero = 0; // Total acumulado para el barbero (dinero)
    let totalCantidadBarbero = 0; // Total acumulado de cantidades
    let totalComisionBarbero = 0; // Total acumulado de comisiones
    let totalSobranteBarbero = 0; // Total acumulado de sobrantes

    const dailyTotals = []; // Almacenar totales por día

    barbero.dias.forEach((dia) => {
      content.push({
        text: dia.dia,
        style: "subheader",
        margin: [0, 5, 0, 5],
      });

      const tableBody = [
        [
          { text: "Servicio", style: "tableHeader" },
          { text: "Prec.", style: "tableHeader" },
          { text: "Cant.", style: "tableHeader" },
          { text: "% Com.", style: "tableHeader" }, // Nueva columna para el porcentaje
          { text: "Com.", style: "tableHeader" }, // Comisión
          { text: "In. B.", style: "tableHeader" }, // Sobrante
          { text: "Subt.", style: "tableHeader" }, // Subtotal ahora al final
        ],
      ];

      let totalDia = 0; // Total del día (dinero)
      let totalCantidadDia = 0; // Total del día (cantidades)
      let totalComisionDia = 0; // Total de comisiones del día
      let totalSobranteDia = 0; // Total de sobrantes del día

      dia.ventas.forEach((venta) => {
        const subtotal = venta.discounttype === "PERCENTAGE"
          ? (venta.price * venta.count) * (1 - venta.discount / 100) // Aplicar descuento porcentual
          : (venta.price * venta.count) - venta.discount; // Aplicar descuento fijo
        const comision = (esBarberoValido && venta.discounttype === "PERCENTAGE" && venta.discount === 100) ? 1 : (venta.commissionRate / 100) * (venta.price * venta.count);
        const sobrante = subtotal - comision;
        totalDia += subtotal; // Sumar al total del día
        totalCantidadDia += venta.count; // Sumar al total de cantidades del día
        totalComisionDia += comision; // Sumar al total de comisiones del día
        totalSobranteDia += sobrante; // Sumar al total de sobrantes del día

        tableBody.push([
          { text: venta.name, style: "tableContent1" },
          { text: `$${venta.price}`, style: "tableContent" },
          { text: venta.count.toString(), style: "tableContent" },
          { text: `${venta.commissionRate}%`, style: "tableContent" }, // Porcentaje de comisión
          { text: `$${comision.toFixed(2)}`, style: "tableContent" }, // Comisión
          { text: `$${sobrante.toFixed(2)}`, style: "tableContent" }, // Sobrante
          { text: `$${subtotal.toFixed(2)}`, style: "tableContent" }, // Subtotal
        ]);
      });

      // Fila de totales del día
      tableBody.push([
        { text: "Totales del día", colSpan: 3, style: "tableHeader", alignment: "right" },
        {}, {}, {}, // ColSpan vacíos
        { text: `$${totalComisionDia.toFixed(2)}`, style: "tableHeader", alignment: "left" },
        { text: `$${totalSobranteDia.toFixed(2)}`, style: "tableHeader", alignment: "left" },
        { text: `$${totalDia.toFixed(2)}`, style: "tableHeader", alignment: "left" }, // Total subtotal
      ]);

      content.push({
        table: {
          widths: ["*", "auto", "auto", "auto", "auto", "auto", "auto"],
          body: tableBody,
        },
        layout: "lightHorizontalLines",
        margin: [0, 0, 0, 10],
      });

      // Guardar los totales del día
      dailyTotals.push({
        dia: dia.dia,
        total: totalDia,
        cantidad: totalCantidadDia,
        comision: totalComisionDia,
        sobrante: totalSobranteDia,
      });

      totalBarbero += totalDia;
      totalCantidadBarbero += totalCantidadDia;
      totalComisionBarbero += totalComisionDia;
      totalSobranteBarbero += totalSobranteDia;
    });

    // Tabla de resumen de totales por día
    const summaryTableBody = [
      [
        { text: "Día", style: "tableHeader" },
        { text: "Cantidad Total", style: "tableHeader" },
        { text: "Total Dinero", style: "tableHeader" },
        { text: "Comisión Total", style: "tableHeader" },
        { text: "In. B. Total", style: "tableHeader" },
        { text: "Subtotal Total", style: "tableHeader" }, // Nueva columna de subtotal total
      ],
    ];

    dailyTotals.forEach((entry) => {
      summaryTableBody.push([
        { text: entry.dia, style: "tableContent" },
        { text: entry.cantidad.toString(), style: "tableContent" },
        { text: `$${entry.total.toFixed(2)}`, style: "tableContent" },
        { text: `$${entry.comision.toFixed(2)}`, style: "tableContent" },
        { text: `$${entry.sobrante.toFixed(2)}`, style: "tableContent" },
        { text: `$${entry.total.toFixed(2)}`, style: "tableContent" }, // Subtotal igual a total
      ]);
    });

    // Fila de gran total del barbero
    summaryTableBody.push([
      { text: "Gran Total", style: "tableHeader", alignment: "right" },
      { text: totalCantidadBarbero.toString(), style: "tableHeader", alignment: "left" },
      { text: `$${totalBarbero.toFixed(2)}`, style: "tableHeader", alignment: "rleft" },
      { text: `$${totalComisionBarbero.toFixed(2)}`, style: "tableHeader", alignment: "left" },
      { text: `$${totalSobranteBarbero.toFixed(2)}`, style: "tableHeader", alignment: "left" },
      { text: `$${totalBarbero.toFixed(2)}`, style: "tableHeader", alignment: "left" }, // Subtotal igual a total general
    ]);

    content.push({
      text: "Resumen de Totales",
      style: "subheader",
      margin: [0, 10, 0, 5],
    });

    content.push({
      table: {
        widths: ["*", "auto", "auto", "auto", "auto", "auto"],
        body: summaryTableBody,
      },
      layout: "lightHorizontalLines",
      margin: [0, 0, 0, 10],
    });
  });

  const docDefinition = {
    content: content,
    styles: {
      header: { fontSize: 16, bold: true, alignment: "left" },
      subheader: { fontSize: 12, bold: true, margin: [0, 5, 0, 5] },
      tableHeader: { bold: true, fontSize: 10, fillColor: "#eeeeee" },
      tableContent: { fontSize: 10 },
      tableContent1: { fontSize: 9 },
      ...styles,
    },
    defaultStyle,
    header: {
      columns: [
        { text: "CHEVALIERBARBERSHOP", style: "documentHeaderLeft" },
        {
          text: new Date().toLocaleDateString("es-MX"),
          style: "documentHeaderRight",
        },
      ],
    },
    footer: (currentPage, pageCount) => ({
      margin: 10,
      columns: [
        {
          fontSize: 9,
          text: `Página ${currentPage} de ${pageCount}`,
          alignment: "right",
        },
      ],
    }),
  };

  const pdfDoc = printer.createPdfKitDocument(docDefinition);
  const chunks = [];
  const stream = pdfDoc.pipe(new Base64Encode());
  pdfDoc.end();

  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(chunk));
    stream.on("end", () => resolve(chunks.join(""))); // Concatenar directamente las cadenas
    stream.on("error", (err) => reject(err));
  });
}


SalesModels.getWeeklySales = async () => {
  try {

    // Obtener la fecha actual
    const now = new Date(new Date().getTime() - 5 * 60 * 60 * 1000);

    // Ajustar la fecha al inicio de la semana (domingo)
    const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfWeek.setHours(0, 0, 0, 0);

    // Calcular el final de la semana (sábado)
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);

    // Pipeline de agregación
    const result = await SalesModeldb.aggregate([
      // Filtrar ventas dentro del rango de la semana
      {
        $match: {
          saleDate: { $gte: startOfWeek, $lte: endOfWeek }
        }
      },
      // Descomponer los productos o servicios para calcular subtotales
      {
        $unwind: '$productsOrServices'
      },
      // Calcular el total por venta
      {
        $group: {
          _id: { dayOfWeek: { $dayOfWeek: '$saleDate' } },
          totalAmount: { $sum: '$productsOrServices.price' }
        }
      },
      // Ordenar los días de la semana (1 = domingo, 7 = sábado)
      {
        $sort: { '_id.dayOfWeek': 1 }
      },
      // Formatear el resultado final
      {
        $project: {
          _id: 0,
          day: {
            $arrayElemAt: [
              ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
              { $subtract: ['$_id.dayOfWeek', 1] }
            ]
          },
          amount: '$totalAmount'
        }
      }
    ]);

    // Asegurarse de incluir días sin ventas
    const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const sales = daysOfWeek.map(day => {
      const sale = result.find(r => r.day === day);
      return sale
        ? { x: sale.day, y: sale.amount }
        : { x: day, y: 0 };
    });

    return sales;
  } catch (error) {
    console.error('Error fetching weekly sales:', error);
    throw error;
  }
}
SalesModels.getLastWeekSales = async () => {
  try {
    // Obtener la fecha actual
    const now = new Date(new Date().getTime() - 5 * 60 * 60 * 1000);

    // Ajustar la fecha al inicio de la semana actual (domingo)
    const startOfThisWeek = new Date(now.setDate(now.getDate() - now.getDay()));
    startOfThisWeek.setHours(0, 0, 0, 0);

    // Calcular el inicio y fin de la semana pasada
    const startOfLastWeek = new Date(startOfThisWeek);
    startOfLastWeek.setDate(startOfThisWeek.getDate() - 7);

    const endOfLastWeek = new Date(startOfThisWeek);
    endOfLastWeek.setDate(startOfThisWeek.getDate() - 1);
    endOfLastWeek.setHours(23, 59, 59, 999);

    // Pipeline de agregación
    const result = await SalesModeldb.aggregate([
      // Filtrar ventas dentro del rango de la semana pasada
      {
        $match: {
          saleDate: { $gte: startOfLastWeek, $lte: endOfLastWeek }
        }
      },
      // Descomponer los productos o servicios para calcular subtotales
      {
        $unwind: '$productsOrServices'
      },
      // Calcular el total por venta agrupando por día de la semana
      {
        $group: {
          _id: { dayOfWeek: { $dayOfWeek: '$saleDate' } },
          totalAmount: { $sum: '$productsOrServices.price' }
        }
      },
      // Ordenar los días de la semana (1 = domingo, 7 = sábado)
      {
        $sort: { '_id.dayOfWeek': 1 }
      },
      // Formatear el resultado final
      {
        $project: {
          _id: 0,
          x: {
            $arrayElemAt: [
              ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'],
              { $subtract: ['$_id.dayOfWeek', 1] }
            ]
          },
          y: '$totalAmount'
        }
      }
    ]);

    // Asegurarse de incluir días sin ventas
    const daysOfWeek = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
    const sales = daysOfWeek.map(day => {
      const sale = result.find(r => r.x === day);
      return sale || { x: day, y: 0 };
    });

    return sales;
  } catch (error) {
    console.error('Error fetching last weeks sales:', error);
    throw error;
  }
}
SalesModels.getthisWeekSalesBaerber = async () => {
  try {
    const currentDate = new Date(new Date().getTime() - 5 * 60 * 60 * 1000);
    const startOfWeek = new Date(currentDate);
    startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Domingo
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6); // Sábado
    endOfWeek.setHours(23, 59, 59, 999);

    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    const weeklySales = await SalesModeldb.aggregate([
      {
        $match: {
          saleDate: { $gte: startOfWeek, $lte: endOfWeek },
        },
      },
      {
        $lookup: {
          from: "users", // Colección de usuarios
          localField: "barber",
          foreignField: "_id",
          as: "barberDetails",
        },
      },
      {
        $unwind: "$barberDetails",
      },
      {
        $lookup: {
          from: "personaldatas", // Colección de datos personales
          localField: "barberDetails.personalData",
          foreignField: "_id",
          as: "personalData",
        },
      },
      {
        $unwind: "$personalData",
      },
      {
        $group: {
          _id: {
            barber: {
              firstnames: "$personalData.firstnames",
              lastnames: "$personalData.lastnames",
            },
            day: { $dayOfWeek: "$saleDate" }, // Día de la semana (1 = domingo)
          },
          totalSales: { $sum: { $sum: "$productsOrServices.price" } }, // Sumar precios
        },
      },
      {
        $project: {
          barberName: {
            $concat: [
              "$_id.barber.firstnames",
              " ",
              "$_id.barber.lastnames",
            ],
          },
          day: "$_id.day",
          totalSales: 1,
          _id: 0,
        },
      },
      {
        $sort: { day: 1 }, // Ordenar por día de la semana
      },
    ]);

    // Inicializar los días de la semana con valores por defecto
    const result = weeklySales.reduce((acc, sale) => {
      const barberData = acc.find(b => b.name === sale.barberName);
      const dayName = dayNames[sale.day - 1]; // Convertir día de la semana a nombre

      if (barberData) {
        // Buscar si ya existe el día en el arreglo del barbero
        const existingDay = barberData.data.find(d => d.x === dayName);
        if (existingDay) {
          existingDay.y += sale.totalSales; // Sumar las ventas del día duplicado
        } else {
          barberData.data.push({ x: dayName, y: sale.totalSales });
        }
      } else {
        acc.push({
          name: sale.barberName,
          data: dayNames.map(day => ({ x: day, y: 0 })), // Predefinir todos los días con 0
        });
        acc[acc.length - 1].data.find(d => d.x === dayName).y = sale.totalSales;
      }

      return acc;
    }, []);

    return result;
  } catch (error) {
    console.error('Error fetching last weeks sales:', error);
    throw error;
  }
}
SalesModels.getLastWeekSalesBarber = async () => {
  try {
    const currentDate = new Date(new Date().getTime() - 5 * 60 * 60 * 1000);
    const startOfCurrentWeek = new Date(currentDate);
    startOfCurrentWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Domingo actual
    startOfCurrentWeek.setHours(0, 0, 0, 0);

    const endOfLastWeek = new Date(startOfCurrentWeek);
    endOfLastWeek.setDate(startOfCurrentWeek.getDate() - 1); // Sábado de la semana anterior
    endOfLastWeek.setHours(23, 59, 59, 999);

    const startOfLastWeek = new Date(endOfLastWeek);
    startOfLastWeek.setDate(endOfLastWeek.getDate() - 6); // Domingo de la semana anterior
    startOfLastWeek.setHours(0, 0, 0, 0);

    const dayNames = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];

    const weeklySales = await SalesModeldb.aggregate([
      {
        $match: {
          saleDate: { $gte: startOfLastWeek, $lte: endOfLastWeek },
        },
      },
      {
        $lookup: {
          from: "users", // Colección de usuarios
          localField: "barber",
          foreignField: "_id",
          as: "barberDetails",
        },
      },
      {
        $unwind: "$barberDetails",
      },
      {
        $lookup: {
          from: "personaldatas", // Colección de datos personales
          localField: "barberDetails.personalData",
          foreignField: "_id",
          as: "personalData",
        },
      },
      {
        $unwind: "$personalData",
      },
      {
        $group: {
          _id: {
            barber: {
              firstnames: "$personalData.firstnames",
              lastnames: "$personalData.lastnames",
            },
            day: { $dayOfWeek: "$saleDate" }, // Día de la semana (1 = domingo)
          },
          totalSales: { $sum: { $sum: "$productsOrServices.price" } }, // Sumar precios
        },
      },
      {
        $project: {
          barberName: {
            $concat: [
              "$_id.barber.firstnames",
              " ",
              "$_id.barber.lastnames",
            ],
          },
          day: "$_id.day",
          totalSales: 1,
          _id: 0,
        },
      },
      {
        $sort: { day: 1 }, // Ordenar por día de la semana
      },
    ]);

    // Inicializar los días de la semana con valores por defecto
    const result = weeklySales.reduce((acc, sale) => {
      const barberData = acc.find(b => b.name === sale.barberName);
      const dayName = dayNames[sale.day - 1]; // Convertir día de la semana a nombre

      if (barberData) {
        // Buscar si ya existe el día en el arreglo del barbero
        const existingDay = barberData.data.find(d => d.x === dayName);
        if (existingDay) {
          existingDay.y += sale.totalSales; // Sumar las ventas del día duplicado
        } else {
          barberData.data.push({ x: dayName, y: sale.totalSales });
        }
      } else {
        acc.push({
          name: sale.barberName,
          data: dayNames.map(day => ({ x: day, y: 0 })), // Predefinir todos los días con 0
        });
        acc[acc.length - 1].data.find(d => d.x === dayName).y = sale.totalSales;
      }

      return acc;
    }, []);

    return result;
  } catch (error) {
    console.error('Error fetching last week\'s sales:', error);
    throw error;
  }
};

SalesModels.getWeeklySalesSummary = async () => {
  const currentDate = new Date(new Date().getTime() - 5 * 60 * 60 * 1000);
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay()); // Domingo
  startOfWeek.setHours(0, 0, 0, 0);

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 6); // Sábado
  endOfWeek.setHours(23, 59, 59, 999);

  try {
    const results = await SalesModeldb.aggregate([
      // Filtrar las ventas de la semana actual
      {
        $match: {
          saleDate: {
            $gte: startOfWeek,
            $lte: endOfWeek
          }
        }
      },
      // Desglosar los elementos vendidos
      {
        $unwind: "$productsOrServices"
      },
      // Agrupar por item y price, calculando la cantidad vendida
      {
        $group: {
          _id: {
            item: "$productsOrServices.item",
            price: "$productsOrServices.price"
          },
          totalSold: { $sum: 1 }
        }
      },
      // Combinar con el esquema `productservices` para obtener el nombre del item
      {
        $lookup: {
          from: "productservices", // Nombre de la colección en MongoDB
          localField: "_id.item",
          foreignField: "_id",
          as: "itemDetails"
        }
      },
      // Desestructurar el array de itemDetails
      {
        $unwind: "$itemDetails"
      },
      // Proyectar los campos necesarios
      {
        $project: {
          _id: 0,
          x: {
            $concat: [
              "$itemDetails.name",
              " - ",
              { $toString: "$_id.price" }
            ]
          },
          y: "$totalSold"
        }
      }
    ]);

    return results;
  } catch (error) {
    console.error("Error fetching weekly sales summary:", error);
    throw error;
  }
}


function formatearFecha(fechaString) {
  const fecha = new Date(fechaString);

  // Verifica si la fecha es válida
  if (isNaN(fecha)) {
    throw new Error('Fecha no válida');
  }

  const formatoFechaCorta = new Intl.DateTimeFormat('es-ES', {
    weekday: 'short', // Nombre corto del día
    day: 'numeric',
    month: 'short', // Nombre corto del mes
    year: 'numeric'
  }).format(fecha);

  const formatoHora = new Intl.DateTimeFormat('es-ES', {
    timeStyle: 'short' // Solo la hora en formato compacto
  }).format(fecha);

  return `${formatoFechaCorta}, ${formatoHora}`;
}
// Función para formatear fechas en formato amigable
function formatDate(date) {
  if (!date) return '';
  const options = { year: 'numeric', month: '2-digit', day: '2-digit' };
  return new Intl.DateTimeFormat('es-ES', options).format(new Date(date));
}


async function getDailyBarberSaleNumber(barberId) {
  try {
    const now = new Date(); // Fecha específica

    // Inicio del día
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    startOfDay.setHours(startOfDay.getHours() - 5); // Restar 5 horas

    // Fin del día
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
    endOfDay.setHours(endOfDay.getHours() - 5); // Restar 5 horas

    // Contar las ventas del barbero en el día actual
    const salesToday = await SalesModeldb.countDocuments({
      barber: barberId,
      saleDate: { $gte: startOfDay, $lte: endOfDay }
    });
    //console.log(startOfDay, endOfDay)
    // El siguiente número es el conteo actual + 1
    return salesToday + 1;
  } catch (error) {
    console.error('Error al obtener el número de venta diaria:', error);
    throw new Error('No se pudo obtener el número de venta diaria');
  }
};

async function assignDefaultDailySaleNumber(defaultNumber = 0) {
  try {
    // Actualizar todas las ventas que no tienen `dailyBarberSaleNumber`
    const result = await SalesModeldb.updateMany(
      { dailyBarberSaleNumber: { $exists: false } },
      { $set: { dailyBarberSaleNumber: defaultNumber } }
    );

    console.log(`Ventas actualizadas: ${result.nModified}`);
  } catch (error) {
    console.error("Error al asignar el número por defecto:", error);
  }
};

async function savediscount100() {

  try {
    const discountData = {
      name: "Descuento Fidelidad",
      description: "100% de descuento por fidelidad al servicio",
      discountType: "67192a98cbb3a91218017410", // ID del tipo de descuento
      value: 100, // Descuento del 100%
      isGlobal: false, // No es global, está dirigido a ciertos clientes
      customers: ["67229ff2567dcb303acae3ee"], // ID del cliente que recibirá el descuento
      productsOrServices: ["671693cfabafcf7a889a0fdd"], // ID del servicio específico al que aplica el descuento
      validFrom: new Date(), // Fecha de inicio del descuento
      validUntil: new Date("2999-12-31"), // Fecha muy lejana para simular un descuento "de por vida"
    };

    const createdDiscount = await DiscountModel.create(discountData);
    console.log("Descuento creado con éxito:", createdDiscount);
  } catch (error) {
    console.error("Error al crear el descuento:", error);
  }
}
module.exports = SalesModels;

