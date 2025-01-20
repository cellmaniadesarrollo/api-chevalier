const ProductsModels = {};
const productservicestypesdb = require("../db/productservicestypes")
const productsservicesdb = require("../db/productservices")
const mongoose = require("mongoose");
const ObjectId = mongoose.Types.ObjectId;

ProductsModels.find = async (data) => {

    try {
        let typeId;

        // Si no se proporcionan datos, obtener el ID del tipo 'SERVICE'
        if (!data || !data.name) {
            const serviceType = await productservicestypesdb.findOne({ name: 'SERVICE' });

            if (serviceType) {
                typeId = serviceType._id;
            } else {
                throw new Error("Service type not found");
            }
        }

        // Estructura básica del pipeline de agregación
        const pipeline = [];

        // Si se proporciona un nombre en 'data', buscar por nombre en mayúsculas
        if (data && data.name) {
            pipeline.push({
                $match: {
                    name: {
                        $regex: new RegExp(data.name.toUpperCase()),  // Expresión regular para coincidencias parciales
                    },
                },
            });
        } else {
            // Si no se proporciona un nombre, filtrar por el tipo "SERVICE"
            pipeline.push({
                $match: {
                    type: new ObjectId(typeId),  // Filtrar por el tipo 'SERVICE'
                },
            });
        }

        // Agregar filtro para 'available: true'
        pipeline.push({
            $match: {
                available: true,  // Solo devolver los que estén disponibles
            },
        });

        // Lookup para obtener el nombre del tipo de producto/servicio
        pipeline.push({
            $lookup: {
                from: 'productservicestypes', // Colección relacionada
                localField: 'type',
                foreignField: '_id',
                as: 'typeDetails',
            },
        });
        // Ordenar por nombre en orden ascendente
        pipeline.push({
            $sort: {
                name: 1,  // Orden ascendente por nombre (1 para ascendente, -1 para descendente)
            },
        });
        // Proyección final para devolver los datos necesarios
        pipeline.push({
            $project: {
                _id: 1,
                name: 1,
                price: 1,
                prices: 1,
            },
        });

        // Ejecutar el pipeline de agregación
        const results = await productsservicesdb.aggregate(pipeline);


        return results;
    } catch (error) {
        throw error;
    }

}

module.exports = ProductsModels;

