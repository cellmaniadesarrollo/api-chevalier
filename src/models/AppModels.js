const AppModels = {}
const mongoose = require('mongoose'); // Importa mongoose
const ObjectId = mongoose.Types.ObjectId;
const Clientsdb = require('../db/clients'); // Asegúrate de que la ruta al modelo es correcta
const HaircutCounters = require('../db/haircutcounters'); // Importa el modelo haircutcounters
const Sales = require('../db/sales'); // Importa el modelo sales
const ProductServices = require('../db/productservices'); // Importa el modelo productservices
const Discounts = require('../db/discounts'); // Importa el modelo discounts
const NotFoundError = require('../errors/NotFoundError');

AppModels.consultscounts = async (data) => {

    const { cedula } = data;
    try {
        const haircutCounters = await HaircutCounters.aggregate([
            { $match: { counter: { $gt: 0 }, } },
            {
                $lookup: {
                    from: 'productservices',
                    localField: 'service',
                    foreignField: '_id',
                    as: 'serviceDetails'
                }
            },
            { $unwind: '$serviceDetails' },
            {
                $lookup: {
                    from: 'clients',
                    localField: 'customer',
                    foreignField: '_id',
                    pipeline: [
                        {
                            $match: { dni: cedula }
                        }
                    ],
                    as: 'customerDetails'
                }
            },
            { $unwind: '$customerDetails' },
            {
                $project: {
                    customer: 1,
                    service: '$serviceDetails._id',
                    serviceName: '$serviceDetails.name',
                    counter: 1,
                    lastRedeemed: 1,
                    names: '$customerDetails.names',
                    lastames: '$customerDetails.lastNames',
                }
            }

        ]);
        if (haircutCounters.length === 0) {
            return
        }
        const servicesArray = haircutCounters
            .filter(counter => counter.serviceName !== 'MASAJE EN SILLA')
            .map(counter => counter.service);
        const results = await Promise.all(
            haircutCounters.map(async (hc) => {
                const matchStage = {
                    client: hc.customer,
                };
                const matchStage1 = {

                    type: { $nin: [new ObjectId('687e8e77574f48262faaa996')] }
                };
                if (hc.serviceName === "MASAJE EN SILLA") {
                    // Excluir los IDs en servicesArray
                    matchStage["productsOrServices.item"] = { $nin: servicesArray };
                    matchStage1.type.$nin.push(new ObjectId("67167d3501e3de1963263198"));
                } else {
                    // Condición normal
                    matchStage["productsOrServices.item"] = hc.service
                }



                const sales = await Sales.aggregate([
                    {
                        $match: matchStage
                    },
                    { $sort: { saleDate: -1 } },
                    { $unwind: '$productsOrServices' },
                    {
                        $lookup: {
                            from: 'discounts',
                            localField: 'productsOrServices.discount',
                            foreignField: '_id',
                            pipeline: [
                                {
                                    $match: {
                                        $or: [
                                            { isGlobal: true },
                                            { name: '0%' }
                                        ]
                                    }
                                },
                                {
                                    $project: {
                                        name: 1,
                                        discountPercentage: 1,
                                        isGlobal: 1
                                    }
                                }
                            ],
                            as: 'discountDetails'
                        }
                    },
                    { $unwind: { path: '$discountDetails', preserveNullAndEmptyArrays: true } },
                    {
                        $lookup: {
                            from: 'productservices',
                            localField: 'productsOrServices.item',
                            foreignField: '_id',
                            pipeline: [
                                { $match: matchStage1 }
                            ],
                            as: 'productDetails'
                        }
                    },

                    { $unwind: '$productDetails' },
                    // Lookup del BARBERO
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'barber',
                            foreignField: '_id',
                            as: 'barberUser'
                        }
                    },
                    { $unwind: '$barberUser' },
                    {
                        $lookup: {
                            from: 'personaldatas',
                            localField: 'barberUser.personalData',
                            foreignField: '_id',
                            as: 'barberPersonal'
                        }
                    },
                    { $unwind: '$barberPersonal' },

                    // Lookup del CAJERO (cashier)
                    {
                        $lookup: {
                            from: 'users',
                            localField: 'cashier',
                            foreignField: '_id',
                            as: 'cashierUser'
                        }
                    },
                    { $unwind: '$cashierUser' },
                    {
                        $lookup: {
                            from: 'personaldatas',
                            localField: 'cashierUser.personalData',
                            foreignField: '_id',
                            as: 'cashierPersonal'
                        }
                    },
                    { $unwind: '$cashierPersonal' },

                    {
                        $project: {
                            saleDate: 1,
                            'productDetails.name': 1,
                            'productsOrServices.item': 1,
                            discountDetails: 1,

                            // Datos del barbero
                            barberName: {
                                $concat: ['$barberPersonal.firstnames', ' ', '$barberPersonal.lastnames']
                            },

                            // Datos del cajero
                            cashierName: {
                                $concat: ['$cashierPersonal.firstnames', ' ', '$cashierPersonal.lastnames']
                            }
                        }
                    },
                    { $limit: hc.counter }
                ]);
                return {
                    ...hc,
                    relatedSales: sales
                };
            })
        );

        return results
    } catch (error) {
        throw error;

    }

}
AppModels.consultsdiscounts = async (data) => {
    const { cedula } = data;
    try {
        const now = new Date();
        const nowUtc = new Date(now.getTime() + (5 * 60 * 60 * 1000)); // Sumar 5 horas

        const discounts = await Discounts.aggregate([
            {
                $match: {
                    isGlobal: false,
                    validFrom: { $lte: nowUtc },
                    validUntil: { $gte: nowUtc }
                }
            },

            {
                $lookup: {
                    from: 'clients',
                    localField: 'customers.customer',
                    foreignField: '_id',
                    as: 'customerDetails'
                }
            },
            {
                $unwind: '$customerDetails'
            },
            {
                $match: {
                    'customerDetails.dni': cedula
                }
            },
            {
                $addFields: {
                    customer: {
                        $first: {
                            $filter: {
                                input: '$customers',
                                as: 'c',
                                cond: {
                                    $and: [
                                        { $eq: ['$$c.customer', '$customerDetails._id'] },
                                        { $gt: ['$$c.freeCuts', 0] }
                                    ]
                                }
                            }
                        }
                    }
                }
            },
            {
                $match: {
                    'customer': { $ne: null }
                }
            },
            {
                $addFields: {
                    customer: {
                        freeCuts: '$customer.freeCuts',
                        _id: '$customerDetails._id',
                        names: '$customerDetails.names',
                        lastNames: '$customerDetails.lastNames'
                    }
                }
            },
            {
                $lookup: {
                    from: 'productservices',
                    localField: 'productsOrServices',
                    foreignField: '_id',
                    pipeline: [
                        {
                            $project: {
                                name: 1,
                                description: 1,
                            }
                        }
                    ],
                    as: 'productsOrServices2'
                }
            },
            {
                $lookup: {
                    from: 'discounttypes',
                    localField: 'discountType',
                    foreignField: '_id',
                    pipeline: [
                        {
                            $project: {
                                name: 1,
                            }
                        }
                    ],
                    as: 'discounttype'
                }
            },
            {
                $unwind: '$discounttype'
            },

            {
                $project: {
                    name: 1,
                    description: 1,
                    discountType: 1,
                    value: 1,
                    validFrom: 1,
                    validUntil: 1,
                    customer: 1,
                    productsOrServices2: 1,
                    discounttypename: "$discounttype.name",
                }
            }
        ]);

        await datasss('67229ff2567dcb303acae3ee')
        return discounts;
    } catch (error) {
        throw error;
    }
}


async function datasss(customerId) {
    try {
        const now = new Date();
        const nowUtc = new Date(now.getTime() + (5 * 60 * 60 * 1000)); // Sumar 5 horas
        const discounts = await Discounts.aggregate([
            {
                $match: {
                    isGlobal: false,
                    customers: {
                        $elemMatch: {
                            customer: new mongoose.Types.ObjectId(customerId),
                            freeCuts: { $gt: 0 }
                        }
                    },
                    validFrom: { $lte: new Date() },
                    validUntil: { $gte: new Date() }
                }
            },
            {
                $lookup: {
                    from: "productservices",
                    localField: "productsOrServices",
                    foreignField: "_id",
                    as: "products"
                }
            },
            {
                $match: {
                    "products.type": new mongoose.Types.ObjectId("67167d3501e3de1963263199")
                }
            }
        ]);
        if (discounts.length > 0) {
            return true
        } else { return false }
        console.log(discounts)
        return discounts
    } catch (error) {
        console.log(error)
    }
}
module.exports = AppModels;