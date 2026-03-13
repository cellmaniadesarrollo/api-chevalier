const SuppliersModels = {};
const Rimpes=require('../db/rimpes')
const VoucherType = require('../db/vouchertypes')
const Countries = require('../db/countries');
const Suppliers =require('../db/suppliers')
const initDB=require('../functions/initDB')
SuppliersModels.getRimpes= async () => {
  try {
    let datos = await Rimpes.aggregate([
            {
                $project: {
                    id: '$_id',
                    name: '$name_rimpe',
                    _id: 0
                }
            }
        ]);

    if (datos.length === 0) {
        datos=await initDB.Rimpe()
    }

    return datos;
  } catch (error) {
    console.log("Error en getNewData:", error);
    throw error;
  }
};

SuppliersModels.getCountries = async () => {
  try {
    let countries = await Countries.aggregate([
      {
        $project: {
          id: '$_id',
          name:'$name_countrie',
          _id: 0
        }
      }
    ]);

    if (countries.length===0) {
      countries=await initDB.Countrie()
    }
    return countries;
  } catch (error) {
    console.error('Error al obtener los países:', error);
    throw error;
  }
};
SuppliersModels.findDniDupplierExist=async (dni)=>{
    try { 
    const exists = await Suppliers.exists({ identification: dni });
    return !!exists;
    } catch (error) {
        console.log(error)
       throw error 
    }
}

SuppliersModels.saveSupplier=async (data)=>{
    try { 
    const supplier = new Suppliers(data);
    await supplier.save();
    console.log(supplier)
    return supplier; 
    } catch (error) {
        console.log(error)
       throw error 
    }
}
module.exports = SuppliersModels;