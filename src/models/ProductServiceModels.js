// Agrega este método si ya tienes un ProductServiceModels con el CRUD completo,
// o créalo si aún no existe.
const ProductService = require('../db/productservices');

exports.listSimple = async () => {
    return ProductService.find({ available: true })
        .select('cod name isFixedPrice price prices type')
        .populate('type', 'name')
        .sort({ name: 1 });
};