const DiscountsModels = {};
const Discount = require('../db/discounts');
const DiscountsType = require('../db/discountTypes')
const mongoose = require('mongoose');
const ObjectId = mongoose.Types.ObjectId;

DiscountsModels.list = async (data) => {
    try {
        const { page = 1, limit = 30, search = '' } = data;
         
        let match = {};
        if (search) {
            match = {
                $or: [
                    { names: { $regex: search, $options: 'i' } },
                    { lastNames: { $regex: search, $options: 'i' } },
                    { dni: { $regex: search, $options: 'i' } },
                ]
            };
        }

        const clientsData = await Discount.aggregate([
            { $match: match },
                        {
                $lookup: {
                    from: "discounttypes",
                    localField: "discountType",
                    foreignField: "_id",
                    as: "discounttypes_info"
                }
            },
                        {
                $unwind: {
                    path: "$discounttypes_info",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    id: "$_id",
                    name: 1,
                    global: "$isGlobal",
                    description: 1,
                    products: "$productsOrServices",
                    from: "$validFrom",
                    until: "$validUntil",
                    value: 1,
                    collaborators: "$collaborators_discount",
                    days: "$daysOfWeek",
                    main: "$main_discount",
                    commission: "$discount_comission",
                    // Si deseas contar customers sin expandirlos:
                    customersCount: { $size: "$customers" },
                    // Para el tipo de descuento
                    discounttype: "$discounttypes_info.name"
                }
            },
            {$sort:{name:1}},
            {
                $facet: {
                    metadata: [
                        { $count: "total" },
                        { $addFields: { page, limit } }
                    ],
                    clients: [
                        { $skip: (page - 1) * limit },
                        { $limit: limit }
                    ]
                }
            }
        ]);
        const total = clientsData[0]?.metadata[0]?.total || 0;
        const clientsList = clientsData[0]?.clients || [];

        return {
            total,
            page,
            limit,
            data: clientsList
        };

    } catch (error) {
        throw error;
    }
};

DiscountsModels.getNewData = async () => {
    try {
        const tdiscounts = await DiscountsType.aggregate([
            {
                $project: {
                    id: "$_id",
                    _id: 0,
                    name: 1
                }
            }
        ])
        return tdiscounts
    } catch (error) {
        throw error
    }
}
DiscountsModels.find = async (data) => {
    try {
        const discounts = await Discount.aggregate([
            { $match: { _id: new ObjectId(data.id) } },

            // === Lookup de clientes ===
            {
                $lookup: {
                    from: "clients",
                    localField: "customers.customer",
                    foreignField: "_id",
                    as: "customersData"
                }
            },

            // === Lookup de productos/servicios ===
            {
                $lookup: {
                    from: "productservices",
                    localField: "productsOrServices",
                    foreignField: "_id",
                    as: "productsData"
                }
            },

            // === Mapear customers con datos ===
            {
                $addFields: {
                    customers: {
                        $map: {
                            input: "$customers",
                            as: "c",
                            in: {
                                customer: {
                                    $let: {
                                        vars: {
                                            client: {
                                                $arrayElemAt: [
                                                    {
                                                        $filter: {
                                                            input: "$customersData",
                                                            as: "cd",
                                                            cond: { $eq: ["$$cd._id", "$$c.customer"] }
                                                        }
                                                    },
                                                    0
                                                ]
                                            }
                                        },
                                        in: {
                                            _id: "$$client._id",
                                            dni: "$$client.dni",
                                            names: "$$client.names",
                                            lastNames: "$$client.lastNames",
                                            fullName: { $concat: ["$$client.names", " ", "$$client.lastNames"] }
                                        }
                                    }
                                },
                                freeCuts: "$$c.freeCuts"
                            }
                        }
                    }
                }
            },

            // === Mapear productos/servicios ===
            {
                $addFields: {
                    productsOrServices: {
                        $map: {
                            input: "$productsData",
                            as: "p",
                            in: {
                                _id: "$$p._id",
                                cod: "$$p.cod",
                                name: "$$p.name"
                            }
                        }
                    }
                }
            },

            // Limpiar Lookup temporales
            {
                $project: {
                    customersData: 0,
                    productsData: 0
                }
            }
        ]);

      //  console.log(discounts );
        return discounts[0];

    } catch (error) {
        throw error;
    }
};

DiscountsModels.edit = async (data) => {
    try {
        const {
            id,
            name,
            description,
            discountType,
            value,
            isGlobal,
            productsOrServices,
            customers,
            validFrom,
            validUntil,
            main_discount,
            collaborators_discount,
            discount_comission,
            daysOfWeek
        } = data;

        // Convertir fechas si llegan como string
        const validFromDate = validFrom ? new Date(validFrom) : undefined;
        const validUntilDate = validUntil ? new Date(validUntil) : undefined;

        const updateData = {
            name,
            description,
            discountType,
            value,
            isGlobal,
            main_discount,
            collaborators_discount,
            discount_comission,
        };

        // Sobrescribir productos (si vienen)
        if (Array.isArray(productsOrServices)) {
            updateData.productsOrServices = productsOrServices.map(p => p.product);
        }

        // Sobrescribir clientes (si vienen)
        if (Array.isArray(customers)) {
            updateData.customers = customers.map(c => ({
                customer: c.customer,
                freeCuts: c.freeCuts || 0
            }));
        }

        // Sobrescribir días de la semana
        if (Array.isArray(daysOfWeek)) {
            updateData.daysOfWeek = daysOfWeek;
        }

        // Fechas
        if (validFromDate) updateData.validFrom = validFromDate;
        if (validUntilDate) updateData.validUntil = validUntilDate;

        // Ejecutar update
        const updated = await Discount.findByIdAndUpdate(
            id,
            { $set: updateData },
            { new: true }
        );

        return updated;

    } catch (error) {
        throw error;
    }
};
DiscountsModels.save = async (data) => {
    try {
        const {
            name,
            description,
            discountType,
            value,
            isGlobal,
            productsOrServices,
            customers,
            validFrom,
            validUntil,
            main_discount,
            collaborators_discount,
            discount_comission,
            daysOfWeek
        } = data;

        // Convertir fechas
        const validFromDate = validFrom ? new Date(validFrom) : undefined;
        const validUntilDate = validUntil ? new Date(validUntil) : undefined;

        // Estructurar datos antes de guardar
        const newData = {
            name,
            description,
            discountType,
            value,
            isGlobal,
            main_discount,
            collaborators_discount,
            discount_comission,
        };

        // Guardar productos
        if (Array.isArray(productsOrServices)) {
            newData.productsOrServices = productsOrServices.map(p => p.product);
        }

        // Guardar clientes
        if (Array.isArray(customers)) {
            newData.customers = customers.map(c => ({
                customer: c.customer,
                freeCuts: c.freeCuts || 0
            }));
        }

        // Guardar días de la semana
        if (Array.isArray(daysOfWeek)) {
            newData.daysOfWeek = daysOfWeek;
        }

        // Fechas
        if (validFromDate) newData.validFrom = validFromDate;
        if (validUntilDate) newData.validUntil = validUntilDate;

        // Guardar en Mongo
        const saved = await Discount.create(newData);

        return saved;

    } catch (error) {
        throw error;
    }
};
module.exports = DiscountsModels;