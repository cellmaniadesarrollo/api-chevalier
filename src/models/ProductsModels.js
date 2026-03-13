const ProductsModels = {};
const productsservicesdb = require("../db/productservices")
const typesservicesorproductsdb = require("../db/productservicestypes")
const productbatchesdb = require('../db/productbatch')
const VoucherType = require('../db/vouchertypes');
const payStatus = require('../db/paymentstatuses');
const suppliersdb = require('../db/suppliers');
const VoucherDetails = require('../db/voucherdetails');
const Vouchers = require('../db/vouchers');
const initDB = require('../functions/initDB');
const mongoose = require("mongoose");
const voucherdetails = require("../db/voucherdetails");
const UserDB = require('../db/users');
const assignmentsDB = require('../db/assignments')
const ObjectId = mongoose.Types.ObjectId;
const moment = require('moment');
const vouchers = require("../db/vouchers");


const PdfPrinter = require("pdfmake");
var { Base64Encode } = require("base64-stream");
const fonts = require("../pdf/fonts");
const printer = new PdfPrinter(fonts);


ProductsModels.type = async () => {
    try {
        const type = await typesservicesorproductsdb.aggregate([
            {
                $project: {
                    id: "$_id",
                    _id: 0,
                    name: 1,
                }
            }
        ])
        return type
    } catch (error) {

    }
}

ProductsModels.find = async (data = null) => {

    try {
        const serviceType = await typesservicesorproductsdb.findOne({ name: 'SERVICE' });
        if (!serviceType) throw new Error("Service type not found");

        const serviceTypeId = serviceType._id;

        // ----------------------------
        // 1. AGREGACIÓN DE SERVICIOS
        // ----------------------------
        const servicePipeline = [
            {
                $match: {
                    available: true,
                    type: serviceTypeId,
                }
            },
        ];

        // Si se pasó un nombre, filtrar por él
        if (data && data.name) {
            servicePipeline.unshift({
                $match: {
                    name: {
                        $regex: new RegExp(data.name.toUpperCase()),
                        $options: 'i',
                    },
                },
            });
        }

        servicePipeline.push({
            $project: {
                _id: 1,
                name: 1,
                price: 1,
                prices: 1,
                collaborators: 1,       // para compatibilidad
                quantitymax: null,
                batchId: null,
            },
        });

        const services = await productsservicesdb.aggregate(servicePipeline);

        // Si `data` está vacío, solo devolvemos servicios
        if (!data || !data.name) return services;

        // --------------------------------------
        // 2. AGREGACIÓN DE PRODUCTOS CON LOTES
        // --------------------------------------
        const productPipeline = [
            {
                $match: {
                    available: true,
                    type: { $ne: serviceTypeId }, // Excluir servicios
                }
            },
        ];

        // Si se pasó un nombre, filtrar por él
        if (data.name) {
            productPipeline.unshift({
                $match: {
                    name: {
                        $regex: new RegExp(data.name.toUpperCase()),
                        $options: 'i',
                    },
                },
            });
        }

        productPipeline.push(
            {
                $lookup: {
                    from: 'productbatches',
                    localField: '_id',
                    foreignField: 'productServiceId',
                    as: 'batches',
                }
            },
            { $unwind: '$batches' },
            {
                $match: {
                    'batches.quantity': { $gt: 0 },
                    'batches.lotNumber': { $ne: null }
                }
            },
            {
                $project: {
                    _id: 1,
                    name: {
                        $concat: [
                            "$batches.lotNumber",
                            " - ",
                            "$name"
                        ]
                    },
                    price: 1,
                    prices: 1,
                    quantitymax: '$batches.quantity',
                    quantitymax: '$batches.quantity',
                    batchId: '$batches._id',
                }
            }
        );

        const products = await productsservicesdb.aggregate(productPipeline);

        // Unir productos y servicios
        return [...services, ...products];
    } catch (error) {
        throw error;
    }

}
ProductsModels.getnewdata = async () => {
    try {
        const data = await typesservicesorproductsdb.aggregate([
            {
                $project: {
                    id: "$_id",
                    name: 1,
                    _id: 0
                }
            }
        ])
        return data;
    } catch (error) {
        throw error
    }
}
ProductsModels.save = async (data, user) => {
    try {
        // Validación básica antes de guardar
        if (data.isFixedPrice) {
            if (typeof data.price !== 'number') {
                throw new Error('Se requiere el campo "price" como número cuando isFixedPrice es true');
            }
            data.prices = undefined; // Limpia el campo no usado
        } else {
            if (!Array.isArray(data.prices) || data.prices.length === 0) {
                throw new Error('Se requiere el campo "prices" como array de números cuando isFixedPrice es false');
            }
            data.price = undefined; // Limpia el campo no usado
        }
        data.edits = [{
            editedBy: user,
            editedAt: new Date(),
        }];
        // Consultar el tipo
        const typeDoc = await typesservicesorproductsdb.findById(data.type);
        if (!typeDoc) throw new Error('Tipo de producto o servicio no encontrado');

        // Obtener prefijo
        const prefix =
            typeDoc.name === 'PRODUCT' ? 'PRO' :
                typeDoc.name === 'SERVICE' ? 'SRV' :
                    'BEB';

        // Buscar último código con ese prefijo
        const lastItem = await productsservicesdb
            .findOne({ cod: { $regex: `^${prefix}\\d+$` } })
            .sort({ cod: -1 });

        let nextNumber = 1;
        if (lastItem && lastItem.cod) {
            const numberPart = parseInt(lastItem.cod.slice(3));
            if (!isNaN(numberPart)) {
                nextNumber = numberPart + 1;
            }
        }

        // Asignar código secuencial
        data.cod = `${prefix}${String(nextNumber).padStart(6, '0')}`;

        // Guardar el producto/servicio
        const savedDoc = await productsservicesdb.create(data);
        // Si es del tipo "PRODUCTO", crear un lote con el stock
        if (typeDoc.name === 'PRODUCT' && data.stock && data.stock > 0) {
            await productbatchesdb.create({
                productServiceId: savedDoc._id,
                quantity: data.stock,
                // lotNumber se asignará automáticamente en el pre-save
            });
        }

        return savedDoc;
    } catch (error) {
        console.log(error)
        throw error;
    }
}
ProductsModels.list = async (data) => {

    try {
        const { searchQuery, category, page, itemsPerPage } = data
        const searchQueryd = searchQuery.trim();
        const skip = (page - 1) * itemsPerPage;
        const matchStage = [];
        let matchCondition = {};
        if (searchQuery && searchQuery.length > 1) {
            matchCondition.$or = [
                { cod: { $regex: searchQuery, $options: 'i' } },
                { name: { $regex: searchQuery, $options: 'i' } }
            ];
        }
        if (category && ObjectId.isValid(category)) {
            const categoryObjectId = new ObjectId(category);

            if (matchCondition.$or) {
                // Ya había condiciones de búsqueda => combinamos en $and
                matchStage.push({
                    $match: {
                        $and: [
                            matchCondition,
                            { type: categoryObjectId }
                        ]
                    }
                });
            } else {
                // Solo hay filtro por categoría
                matchStage.push({
                    $match: {
                        type: categoryObjectId
                    }
                });
            }
        } else if (matchCondition.$or) {
            // Solo hay búsqueda por texto
            matchStage.push({
                $match: matchCondition
            });
        }
        const pipeline = [
            ...matchStage,
            {
                $lookup: {
                    from: 'productservicestypes',
                    localField: 'type',
                    foreignField: '_id',
                    as: 'typeObj',
                }
            },
            {
                $unwind: {
                    path: "$typeObj",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $lookup: {
                    from: 'productbatches',
                    let: { productId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        { $eq: ['$productServiceId', '$$productId'] },
                                        { $gt: ['$quantity', 0] }
                                    ]
                                }
                            }
                        },
                        {
                            $group: {
                                _id: null,
                                totalQuantity: { $sum: '$quantity' }
                            }
                        }
                    ],
                    as: 'stockInfo'
                }
            },
            {
                $addFields: {
                    stock: { $ifNull: [{ $arrayElemAt: ["$stockInfo.totalQuantity", 0] }, null] }
                }
            },
            {
                $sort: {
                    createdAt: -1
                }
            },
            {
                $project: {
                    _id: 1,
                    codigo: "$cod",
                    name: 1,
                    precio: "$price",
                    precios: "$prices",
                    esunico: "$isFixedPrice",
                    tipo: "$typeObj.name",
                    comision: "$commissionRate",
                    stock: 1
                }
            },
            {
                $facet: {
                    metadata: [
                        { $count: "total" },
                        { $addFields: { page: page } }
                    ],
                    data: [
                        { $skip: skip },
                        { $limit: itemsPerPage }
                    ]
                }
            }
        ];
        const products = await productsservicesdb.aggregate(pipeline);
        return products[0];
    } catch (error) {
        console.log(error)
        throw error;
    }
}
ProductsModels.getVoucherTypes = async () => {
    try {
        let tipos = await VoucherType.aggregate([
            {
                $project: {
                    id: '$_id',
                    name: 1,
                    _id: 0
                }
            }
        ]);

        if (tipos.length === 0) {
            tipos = await initDB.VoucherType()
        }

        return tipos;
    } catch (error) {
        console.error('Error al obtener los tipos de comprobante:', error);
        throw error;
    }
};
ProductsModels.payStatus = async () => {
    try {
        let paystatus = await payStatus.aggregate([
            {
                $project: {
                    id: '$_id',
                    name: 1,
                    _id: 0
                }
            }
        ]);

        if (paystatus.length === 0) {
            paystatus = await initDB.payStaus()
        }

        return paystatus;
    } catch (error) {
        console.error('Error al obtener los tipos de comprobante:', error);
        throw error;
    }
};
ProductsModels.findSuppliers = async (find) => {
    try {
        // Si la búsqueda viene vacía o sólo espacios, devolver los últimos 50
        if (!find || !find.trim()) {
            const suppliers = await suppliersdb.aggregate([
                {
                    $sort: { createdAt: -1 } // ordenar por fecha de creación, descendente
                },
                {
                    $limit: 50
                },
                {
                    $project: {
                        id: "$_id",
                        _id: 0,
                        name: 1,
                        identification: 1
                    }
                }
            ]);

            return suppliers;
        }

        // Si hay término de búsqueda, filtrar
        const keywords = find.trim().split(/\s+/);
        const matchConditions = keywords.map((word) => ({
            $or: [
                { name: { $regex: word, $options: "i" } },
                { identification: { $regex: word, $options: "i" } }
            ]
        }));

        const suppliers = await suppliersdb.aggregate([
            {
                $match: {
                    $and: matchConditions
                }
            },
            {
                $project: {
                    id: "$_id",
                    _id: 0,
                    name: 1,
                    identification: 1
                }
            },
            { $limit: 50 } // limitar también cuando se busca
        ]);

        return suppliers;
    } catch (error) {
        console.error('Error al buscar proveedores:', error);
        throw error;
    }
};
ProductsModels.findProducts = async (find) => {
    try {
        // Si la búsqueda viene vacía o sólo espacios, devolver los últimos 50
        if (!find || !find.trim()) {
            const suppliers = await productsservicesdb.aggregate([
                {
                    $sort: { createdAt: -1 }
                },
                {
                    $lookup: {
                        from: 'productservicestypes',
                        localField: 'type',
                        foreignField: '_id',
                        pipeline: [
                            {
                                $match: {
                                    $or: [
                                        { name: { $regex: 'PRODUCT' } },
                                        { name: { $regex: 'BEBIDA' } }
                                    ]
                                }
                            }
                        ],
                        as: 'typeDetails'
                    }
                },
                {
                    $unwind: { path: "$typeDetails" }
                },
                {
                    $lookup: {
                        from: 'voucherdetails',
                        let: { productId: '$_id' },
                        pipeline: [
                            {
                                $match: {
                                    $expr: { $eq: ['$product', '$$productId'] }
                                }
                            },
                            {
                                $sort: { createdAt: -1 } // último registro
                            },
                            {
                                $limit: 1
                            },
                            {
                                $project: {
                                    unitPrice: 1,
                                    taxes: 1,
                                    _id: 0
                                }
                            }
                        ],
                        as: 'lastVoucher'
                    }
                },
                {
                    $unwind: {
                        path: "$lastVoucher",
                        preserveNullAndEmptyArrays: true // por si no hay registros en voucherdetails
                    }
                },
                {
                    $limit: 50
                },
                {
                    $project: {
                        id: "$_id",
                        _id: 0,
                        name: 1,
                        cod: 1,
                        price: 1,
                        unitPrice: "$lastVoucher.unitPrice",
                        taxes: "$lastVoucher.taxes",
                        comision: "$commissionRate"
                    }
                }
            ]);
            return suppliers;
        }

        // Si hay término de búsqueda, filtrar
        const keywords = find.trim().split(/\s+/);
        const matchConditions = keywords.map((word) => ({
            $or: [
                { name: { $regex: word, $options: "i" } },
                { cod: { $regex: word, $options: "i" } }
            ]
        }));

        const suppliers = await productsservicesdb.aggregate([
            {
                $match: {
                    $and: matchConditions
                }
            },
            {
                $lookup: {
                    from: 'productservicestypes',
                    localField: 'type',
                    foreignField: '_id',
                    pipeline: [
                        {
                            $match: {
                                $or: [
                                    { name: { $regex: 'PRODUCT' } },
                                    { name: { $regex: 'BEBIDA' } }
                                ]
                            }
                        }
                    ],
                    as: 'typeDetails'
                }
            },
            {
                $unwind: { path: "$typeDetails" }
            },
            {
                $lookup: {
                    from: 'voucherdetails',
                    let: { productId: '$_id' },
                    pipeline: [
                        {
                            $match: {
                                $expr: { $eq: ['$product', '$$productId'] }
                            }
                        },
                        {
                            $sort: { createdAt: -1 } // Obtener el más reciente
                        },
                        {
                            $limit: 1
                        },
                        {
                            $project: {
                                unitPrice: 1,
                                taxes: 1,
                                _id: 0
                            }
                        }
                    ],
                    as: 'lastVoucher'
                }
            },
            {
                $unwind: {
                    path: "$lastVoucher",
                    preserveNullAndEmptyArrays: true
                }
            },
            {
                $project: {
                    id: "$_id",
                    _id: 0,
                    name: 1,
                    cod: 1,
                    unitPrice: "$lastVoucher.unitPrice",
                    taxes: "$lastVoucher.taxes",
                    comision: "$commissionRate"
                }
            },
            {
                $limit: 50
            }
        ]);

        return suppliers;
    } catch (error) {
        console.error('Error al buscar proveedores:', error);
        throw error;
    }
};
ProductsModels.saveProductsincome = async (data, user) => {
    try {
        const voucherData = {
            serialNumber: data.serialNumber,
            supplier: data.supplier,
            voucherType: data.voucherType,
            issueDate: data.issueDate,
            receiptDate: data.receiptDate,
            paymentStatus: data.paymentStatus,
            subtotal: data.subtotal,
            shippingCost: data.shippingCost,
            additionalCosts: data.additionalCosts,
            shippingCosttaxes: data.shippingCosttaxes,
            total: data.total,
            createdBy: user._id
        };

        const newVoucher = await Vouchers.create(voucherData);
        const voucherId = newVoucher._id;

        const detailsData = [];

        for (const item of data.details) {
            let batchId;

            // Si viene batchNumber como ObjectId, usarlo directamente
            if (item.batchNumber) {
                batchId = item.batchNumber;
            } else {
                // Crear lote (productbatch)
                const newBatch = await productbatchesdb.create({
                    productServiceId: item.productId,
                    quantity: item.quantity,
                    expiryDate: item.expiryDate || undefined
                });

                batchId = newBatch._id;
            }

            // Construir detalle con referencia al lote
            detailsData.push({
                voucher: voucherId,
                product: item.productId,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                taxes: item.taxes,
                subtotal: item.subtotal,
                batchNumber: batchId
            });
        }

        const result = await VoucherDetails.insertMany(detailsData);

        // Actualizar precios en productservices si isFixedPrice === true
        for (const item of data.details) {
            try {
                const producto = await productsservicesdb.findById(item.productId);
                if (producto && producto.isFixedPrice) {
                    producto.price = item.pricesale;
                    producto.commissionRate = item.commission
                    producto.edits.push({
                        editedBy: user._id,
                        editedAt: new Date()
                    });
                    await producto.save();
                }
            } catch (error) {
                console.log(error);
            }
        }
        return result;

    } catch (error) {
        throw new Error(`Error al guardar el ingreso de productos: ${error.message}`);
    }
};

ProductsModels.printDocumentincome = async (datas, user) => {
    try {

        const voucherdetailsdata = await voucherdetails.findById(datas.data);

        const datass = await vouchers.aggregate([
            { $match: { _id: voucherdetailsdata.voucher } },
            {
                $lookup: {
                    from: 'voucherdetails',
                    localField: '_id',
                    foreignField: 'voucher',
                    pipeline: [
                        {
                            $lookup: {
                                from: 'productservices',
                                localField: 'product',
                                foreignField: '_id',
                                as: 'productservices_info',
                            }
                        },
                        { $unwind: '$productservices_info' },
                    ],
                    as: 'batches',
                }
            },
            {
                $lookup: {
                    from: 'vouchertypes',
                    localField: 'voucherType',
                    foreignField: '_id',
                    as: 'vouchertypes_info',
                }
            },
            { $unwind: '$vouchertypes_info' },
            {
                $lookup: {
                    from: 'paymentstatuses',
                    localField: 'paymentStatus',
                    foreignField: '_id',
                    as: 'paymentstatuses_info',
                }
            },
            { $unwind: '$paymentstatuses_info' },
        ]);

        const data = datass[0];

        return new Promise((resolve, reject) => {
            try {
                const fechaFormateada = new Date(data.issueDate).toLocaleDateString("es-EC");

                // TABLA DETALLE ELEGANTE
                const detalleTabla = [
                    [
                        { text: "Código", bold: true, color: "white", fillColor: "#333" },
                        { text: "Producto", bold: true, color: "white", fillColor: "#333" },
                        { text: "Com.", bold: true, color: "white", fillColor: "#333", alignment: "center" },
                        { text: "Cant.", bold: true, color: "white", fillColor: "#333", alignment: "center" },
                        { text: "P. Unit", bold: true, color: "white", fillColor: "#333", alignment: "right" },
                        { text: "Imp.", bold: true, color: "white", fillColor: "#333", alignment: "center" },
                        { text: "Subtotal", bold: true, color: "white", fillColor: "#333", alignment: "right" }

                    ]
                ];

                data.batches.forEach((b, index) => {
                    const p = b.productservices_info;

                    detalleTabla.push([
                        { text: p.cod, fillColor: index % 2 === 0 ? "#f7f7f7" : null },
                        { text: p.name, fillColor: index % 2 === 0 ? "#f7f7f7" : null },
                        { text: `${p.commissionRate}%`, alignment: "center", fillColor: index % 2 === 0 ? "#f7f7f7" : null },
                        { text: b.quantity.toString(), alignment: "center", fillColor: index % 2 === 0 ? "#f7f7f7" : null },
                        { text: b.unitPrice.toFixed(2), alignment: "right", fillColor: index % 2 === 0 ? "#f7f7f7" : null },
                        { text: `${b.taxes}%`, alignment: "center", fillColor: index % 2 === 0 ? "#f7f7f7" : null },
                        { text: b.subtotal.toFixed(2), alignment: "right", fillColor: index % 2 === 0 ? "#f7f7f7" : null }
                    ]);
                });

                // PDF DEFINITION
                const docDefinition = {
                    pageSize: "A4",
                    pageMargins: [40, 80, 40, 60],

                    header: {
                        margin: [40, 30],
                        columns: [
                            { text: "CHEVALIER BARBER SHOP", fontSize: 14, bold: true },
                            { text: `Fecha: ${fechaFormateada}`, alignment: "right", fontSize: 12 }
                        ]
                    },

                    footer: (currentPage, pageCount) => ({
                        text: `Página ${currentPage} de ${pageCount}`,
                        alignment: "right",
                        margin: [0, 0, 40, 20]
                    }),

                    content: [
                        { text: "DOCUMENTO DE INGRESO DE INVENTARIO", style: "title" },

                        // --- INFO DEL DOCUMENTO SIN TABLA ---
                        {
                            style: "infoBlock",
                            margin: [0, 10, 0, 20],
                            columns: [
                                [
                                    { text: `N° Documento: ${data.serialNumber}`, bold: true, margin: [0, 2] },
                                    { text: `Estado Pago: ${String(data.paymentstatuses_info.name)}`, bold: true, margin: [0, 2] }
                                ],
                                [
                                    { text: `Tipo: ${data.vouchertypes_info?.name || ""}`, bold: true, margin: [0, 2] },
                                    { text: `Fecha Recepción: ${new Date(data.receiptDate).toLocaleDateString("es-EC")}`, bold: true, margin: [0, 2] }
                                ]
                            ]
                        },

                        { text: "\nDETALLE DE PRODUCTOS", style: "subtitle" },

                        // --- TABLA DEL DETALLE (solo esta tabla queda) ---
                        {
                            style: "tableDetail",
                            table: {
                                widths: ["auto", "*", "auto", "auto", "auto", "auto", "auto"],
                                body: detalleTabla
                            }
                            ,
                            layout: {
                                fillColor: function (rowIndex) {
                                    return rowIndex === 0
                                        ? "#CCCCCC"
                                        : rowIndex % 2 === 0
                                            ? "#F5F5F5"
                                            : null;
                                },
                                hLineWidth: () => 0,
                                vLineWidth: () => 0
                            }
                        },

                        // --- SE ELIMINA INFORMACIÓN DE PRODUCTOS ---
                        // (Ya no existe porque me dijiste que ya no va)

                        { text: "\nTOTALES", style: "subtitle" },

                        // --- TOTALES SIN TABLA ---
                        {
                            style: "totales",
                            margin: [0, 10, 0, 0],
                            alignment: "right",
                            stack: [
                                { text: `Subtotal: ${data.subtotal.toFixed(2)}`, margin: [0, 3] },
                                { text: `Costos Adicionales: ${data.additionalCosts.toFixed(2)}`, margin: [0, 3] },
                                { text: `Costo Envío: ${data.shippingCost.toFixed(2)}`, margin: [0, 3] },
                                { text: `Total: ${data.total.toFixed(2)}`, bold: true, fontSize: 12, margin: [0, 5] }
                            ]
                        }
                    ],

                    styles: {
                        title: { fontSize: 16, bold: true, alignment: "center", margin: [0, 20] },
                        subtitle: { fontSize: 13, bold: true, margin: [0, 15, 0, 8] },
                        infoBlock: { margin: [0, 10, 0, 20] },
                        tableDetail: { margin: [0, 5, 0, 15], fontSize: 10 },
                        totales: { margin: [0, 10], alignment: "right", fontSize: 11 }
                    }
                };

                // GENERAR PDF → BASE64 (NO SE TOCA)
                const pdfDoc = printer.createPdfKitDocument(docDefinition);
                const stream = pdfDoc.pipe(new Base64Encode());

                let base64String = "";

                stream.on("data", chunk => base64String += chunk);
                stream.on("end", () => resolve(base64String));
                stream.on("error", reject);

                pdfDoc.end();

            } catch (error) {
                reject(error);
            }
        });

    } catch (error) {
        throw error;
    }
};

ProductsModels.listProductsincome = async (data) => {
    try {
        console.log(data);
        const page = parseInt(data.page) || 1;
        const itemsPerPage = parseInt(data.itemsPerPage) || 30;
        const skip = (page - 1) * itemsPerPage;
        const searchQuery = data.searchQuery?.trim() || '';

        // --- Search branch detection ---
        const isNumeric = searchQuery !== '' && /^\d+$/.test(searchQuery);
        // Code pattern: starts with 1-5 letters, followed by digits, total length matches PRO000004 (9 chars)
        // Prefix length can vary but total string length stays fixed → just check letters+digits shape
        const isCodePattern = searchQuery !== '' && /^[A-Za-z]+\d+$/.test(searchQuery);

        let searchMatch = null;

        if (searchQuery) {
            if (isNumeric) {
                // Numeric → like on cod OR serialNumber
                searchMatch = {
                    $match: {
                        $or: [
                            { 'productserv.cod': { $regex: searchQuery, $options: 'i' } },
                            { 'vouche.serialNumber': { $regex: searchQuery, $options: 'i' } },
                        ],
                    },
                };
            } else if (isCodePattern) {
                // Looks like a product code (PRO000004, AB00012, etc.) → like on cod only
                searchMatch = {
                    $match: {
                        'productserv.cod': { $regex: searchQuery, $options: 'i' },
                    },
                };
            } else {
                // Free text → like on product name OR voucher serialNumber
                searchMatch = {
                    $match: {
                        $or: [
                            { 'productserv.name': { $regex: searchQuery, $options: 'i' } },
                            { 'vouche.serialNumber': { $regex: searchQuery, $options: 'i' } },
                        ],
                    },
                };
            }
        }

        // Build pipeline dynamically — inject $match only when needed
        const pipeline = [
            {
                $lookup: {
                    from: 'vouchers',
                    localField: 'voucher',
                    foreignField: '_id',
                    as: 'vouche',
                },
            },
            {
                $unwind: {
                    path: '$vouche',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: 'productservices',
                    localField: 'product',
                    foreignField: '_id',
                    as: 'productserv',
                },
            },
            {
                $unwind: {
                    path: '$productserv',
                    preserveNullAndEmptyArrays: true,
                },
            },
            {
                $lookup: {
                    from: 'productbatches',
                    localField: 'batchNumber',
                    foreignField: '_id',
                    as: 'batch',
                },
            },
            {
                $unwind: {
                    path: '$batch',
                    preserveNullAndEmptyArrays: true,
                },
            },

            // ← $match goes here, after all joins, only if there's a query
            ...(searchMatch ? [searchMatch] : []),

            {
                $sort: {
                    'vouche.receiptDate': -1,
                },
            },
            {
                $project: {
                    id: '$_id',
                    _id: 0,
                    productId: '$product',
                    comprobanteNumero: '$vouche.serialNumber',
                    fechaEmision: '$vouche.issueDate',
                    fechaRecepcion: '$vouche.receiptDate',
                    codigoProducto: '$productserv.cod',
                    nombreProducto: '$productserv.name',
                    cantidad: '$quantity',
                    precioUnitario: '$unitPrice',
                    impuesto: '$taxes',
                    totalLinea: '$subtotal',
                    numeroLote: '$batch.lotNumber',
                    fechaVencimiento: '$batch.expiryDate',
                },
            },
            {
                $facet: {
                    metadata: [
                        { $count: 'total' },
                        { $addFields: { page: page } },
                    ],
                    data: [
                        { $skip: skip },
                        { $limit: itemsPerPage },
                    ],
                },
            },
        ];

        const items = await voucherdetails.aggregate(pipeline);
        return items[0];
    } catch (error) {
        throw error;
    }
};
ProductsModels.getsaveProductsincome = async (data) => {
    try {
        const detallesIds = data.map(r => new mongoose.Types.ObjectId(r._id));
        //const detallesIds = data.map(r => r._id); // usar _id de cada item

        const nuevosDatos = await VoucherDetails.aggregate([
            { $match: { _id: { $in: detallesIds } } },
            {
                $lookup: {
                    from: "productservices",
                    localField: "product",
                    foreignField: "_id",
                    as: "product"
                }
            },
            { $unwind: "$product" },
            {
                $lookup: {
                    from: "productbatches",
                    localField: "batchNumber",
                    foreignField: "_id",
                    as: "batch"
                }
            },
            { $unwind: { path: "$batch", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "vouchers",
                    localField: "voucher",
                    foreignField: "_id",
                    as: "voucher"
                }
            },
            { $unwind: "$voucher" },
            {
                $lookup: {
                    from: "users",
                    localField: "voucher.createdBy",
                    foreignField: "_id",
                    as: "user"
                }
            },
            { $unwind: "$user" },
            {
                $project: {
                    _id: 0,
                    topText1: "$product.name",
                    bottomText1: {
                        $concat: ["$product.cod", " - ", { $ifNull: ["$batch.lotNumber", ""] }]
                    },
                    qrText: {
                        $concat: [
                            "S:", "$product.cod",
                            " - ", { $ifNull: ["$batch.lotNumber", ""] },
                            ",F:", {
                                $cond: {
                                    if: { $ifNull: ["$batch.receivedDate", false] },
                                    then: {
                                        $dateToString: { format: "%d-%m-%Y", date: "$batch.receivedDate" }
                                    },
                                    else: "N/A"
                                }
                            },
                            ",U:", "$user.username",
                            ",D:", { $toString: "$batch._id" }
                        ]
                    },
                    cant: "$quantity",
                    price: "$product.price"
                }
            }
        ]);
        return nuevosDatos
    } catch (error) {
        throw error;
    }
};

ProductsModels.findProductBanches = async (data) => {
    try {
        const items = await productbatchesdb.aggregate([
            {
                $match: {
                    productServiceId: new ObjectId(data.id),
                    quantity: { $gt: 0 }
                }
            },
            {
                $project: {
                    _id: 1,
                    code: "$lotNumber",
                    quantity: 1,
                }
            }
        ])
        return items
    } catch (error) {
        console.log(error)
        throw error;
    }
}


ProductsModels.saveBarberSuppliesTracker = async (data, user) => {
    try {
        const { batchId, barberId, quantity, comment } = data;

        // 1. Verificar lote
        const batch = await productbatchesdb.findById(batchId);
        if (!batch) throw new Error('Lote no encontrado');

        if (batch.quantity < quantity) {
            throw new Error('Cantidad insuficiente en el lote');
        }

        // 2. Crear asignación
        const assignment = await assignmentsDB.create({
            batch: batchId,
            recipient: new ObjectId(barberId),
            assigner: new ObjectId(user.id),
            quantity,
            observations: comment
        });
        // 3. Reducir cantidad del lote
        batch.quantity -= quantity;
        await batch.save();

        return { success: true, assignment };
    } catch (error) {
        console.log(error)
        throw error
    }

}


ProductsModels.listBarberSuppliesTracker = async (data) => {
    try {
        const { searchQuery, page = 1, pageSize = 10, filter } = data;
        const limit = pageSize;

        const matchConditions = [];

        // 👉 Filtrar por receptor solo si es un ObjectId válido
        if (filter && mongoose.Types.ObjectId.isValid(filter)) {
            console.log('objeto valido')
            matchConditions.push({ recipient: new mongoose.Types.ObjectId(filter) });
        } else {
            console.log('objeto no valido', filter)
        }

        // 👉 Búsqueda solo si el searchQuery tiene contenido real
        if (searchQuery && typeof searchQuery === 'string' && searchQuery.trim()) {
            const trimmed = searchQuery.trim();
            const isOnlyNumbers = /^\d+$/.test(trimmed);

            if (isOnlyNumbers) {
                // Coincidencia con final del código del producto
                matchConditions.push({
                    'productData.cod': { $regex: new RegExp(trimmed + '$'), $options: 'i' }
                });
            } else {
                const regex = new RegExp(trimmed, 'i');
                matchConditions.push({
                    $or: [
                        { 'productData.name': { $regex: regex } },
                        { 'batchData.lotNumber': { $regex: regex } }
                    ]
                });
            }
        }

        const aggregatePipeline = [
            {
                $lookup: {
                    from: 'productbatches',
                    localField: 'batch',
                    foreignField: '_id',
                    as: 'batchData'
                }
            },
            { $unwind: '$batchData' },
            {
                $lookup: {
                    from: 'productservices',
                    localField: 'batchData.productServiceId',
                    foreignField: '_id',
                    as: 'productData'
                }
            },
            { $unwind: '$productData' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'recipient',
                    foreignField: '_id',
                    as: 'recipientUser'
                }
            },
            { $unwind: '$recipientUser' },
            {
                $lookup: {
                    from: 'personaldatas',
                    localField: 'recipientUser.personalData',
                    foreignField: '_id',
                    as: 'recipientData'
                }
            },
            { $unwind: '$recipientData' },
            {
                $lookup: {
                    from: 'users',
                    localField: 'assigner',
                    foreignField: '_id',
                    as: 'assignerUser'
                }
            },
            { $unwind: '$assignerUser' },
            {
                $lookup: {
                    from: 'personaldatas',
                    localField: 'assignerUser.personalData',
                    foreignField: '_id',
                    as: 'assignerData'
                }
            },
            { $unwind: '$assignerData' },
            {
                $addFields: {
                    recipientFullName: {
                        $trim: {
                            input: {
                                $concat: [
                                    '$recipientData.firstnames', ' ',
                                    { $ifNull: ['$recipientData.firstnames1', ''] }, ' ',
                                    '$recipientData.lastnames', ' ',
                                    { $ifNull: ['$recipientData.lastnames1', ''] }
                                ]
                            }
                        }
                    },
                    assignerFullName: {
                        $trim: {
                            input: {
                                $concat: [
                                    '$assignerData.firstnames', ' ',
                                    { $ifNull: ['$assignerData.firstnames1', ''] }, ' ',
                                    '$assignerData.lastnames', ' ',
                                    { $ifNull: ['$assignerData.lastnames1', ''] }
                                ]
                            }
                        }
                    }
                }
            },

            // 👇 Aplicar todas las condiciones juntas si existen
            ...(matchConditions.length > 0 ? [{ $match: { $and: matchConditions } }] : []),

            {
                $project: {
                    _id: 0,
                    productName: '$productData.name',
                    productCode: '$productData.cod',
                    lotNumber: '$batchData.lotNumber',
                    quantity: 1,
                    assignmentDate: 1,
                    assignerFullName: 1,
                    recipientFullName: 1,
                    observations: 1
                }
            },
            { $sort: { assignmentDate: -1 } },
            {
                $facet: {
                    metadata: [
                        { $count: 'total' },
                        {
                            $addFields: {
                                page,
                                limit
                            }
                        }
                    ],
                    products: [
                        { $skip: (page - 1) * limit },
                        { $limit: limit }
                    ]
                }
            }
        ];

        const result = await assignmentsDB.aggregate(aggregatePipeline);
        const response = result[0] || { metadata: [], products: [] };

        if (response.metadata.length === 0) {
            response.metadata = [{ total: 0, page, limit }];
        }

        return response;
    } catch (error) {
        console.error(error);
        throw error;
    }
};
ProductsModels.expiredProducts = async () => {
    try {
        const now = new Date();
        const twoMonthsLater = moment(now).add(2, 'months').toDate();

        const items = await productbatchesdb.aggregate([
            {
                $match: {
                    expiryDate: { $lte: twoMonthsLater }, // Incluye vencidos y por vencer en 2 meses
                    quantity: { $gt: 0 } // 🔹 Solo lotes con cantidad > 0
                }
            },
            {
                $lookup: {
                    from: 'productservices',
                    localField: 'productServiceId',
                    foreignField: '_id',
                    as: 'productService'
                }
            },
            { $unwind: '$productService' },
            {
                $project: {
                    name: '$productService.name',
                    batch: '$lotNumber',
                    quantity: 1,
                    expirationDate: {
                        $dateToString: { format: '%Y-%m-%d', date: '$expiryDate' }
                    }
                }
            },
            {
                $sort: { expirationDate: 1 }
            }
        ]);

        return items;
    } catch (error) {
        throw error;
    }
};


module.exports = ProductsModels;

