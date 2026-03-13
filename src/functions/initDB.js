const initDB = {}
const Rimpes = require('../db/rimpes')
const VoucherType = require('../db/vouchertypes')
const Countries = require('../db/countries');
const payStatus = require('../db/paymentstatuses')
initDB.Rimpe = async () => {
    try {
        const valoresPorDefecto = [
            { name_rimpe: "NO" },
            { name_rimpe: "CONTRIBUYENTE RÉGIMEN RIMPE" },
            { name_rimpe: "CONTRIBUYENTE NEGOCIO POPULAR - RÉGIMEN RIMPE" }
        ];

        await Rimpes.insertMany(valoresPorDefecto);
        const datos = await Rimpes.aggregate([
            {
                $project: {
                    id: '$_id',
                    name: '$name_rimpe',
                    _id: 0
                }
            }
        ]);
        return datos
    } catch (error) {
        throw error
    }
}
initDB.VoucherType = async () => {
    try {
        const datosIniciales = [
            { name: 'FACTURA' },
            { name: 'ORDEN' },
            { name: 'PROFORMA' },
            { name: 'COMPROBANTE' },
            { name: 'LIQUIDACION' },
            { name: 'NOTA DE VENTA' },
        ];

        await VoucherType.insertMany(datosIniciales);
        const tipos = await VoucherType.aggregate([
            {
                $project: {
                    id: '$_id',
                    name: 1,
                    _id: 0
                }
            }
        ]);
        return tipos
    } catch (error) {
        throw error
    }
}
initDB.Countrie=async ()=>{
    try {
        const datosIniciales = [
        { name_countrie: 'ECUADOR' },
        { name_countrie: 'COLOMBIA' },
        { name_countrie: 'PERU' },
        { name_countrie: 'CHINA' },
        { name_countrie: 'ESTADOS UNIDOS' }
      ];
      await Countries.insertMany(datosIniciales);
       const countries = await Countries.aggregate([
            {
              $project: {
                id: '$_id',
                name_countrie: 1,
                _id: 0
              }
            }
          ]);
      
      return countries
    } catch (error) {
      throw error  
    }
}
initDB.payStaus = async () => {
    try {
        const datosIniciales =[
  { name: 'PENDIENTE', description: 'Pendiente de pago' },
  { name: 'PARCIAL', description: 'Pago parcial' },
  { name: 'PAGADO', description: 'Pagado completamente' },
  { name: 'ANULADO', description: 'Comprobante anulado' }
]
        await payStatus.insertMany(datosIniciales);
        const tipos = await payStatus.aggregate([
            {
                $project: {
                    id: '$_id',
                    name: 1,
                    _id: 0
                }
            }
        ]);
        return tipos
    } catch (error) {
        throw error
    }
}
module.exports = initDB