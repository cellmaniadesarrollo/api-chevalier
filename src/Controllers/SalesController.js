const SalesController = {};
const ProductsModels = require('../models/ProductsModels');
const users = require("../models/UsersModels")
const SalesModels = require("../models/SalesModels");
const sales = require('../db/sales');
const { updateBirthdayDiscount } = require('../functions/functions')

SalesController.getnewsalesdata = async (req, res) => {
    try {
        //await updateBirthdayDiscount()
        let response = {
            user: req.user.username,
            date: new Date().toISOString().split('T')[0]
        }
        response.services = await ProductsModels.find();
        response.hairdresser = await users.gethairdresser()
        response.paymentmethods = await SalesModels.findpaymentMethods()
        //const sales = await SalesModels.list({ page: 1, limit: 5 })
        const sales = await SalesModels.get5sales()
        // console.log(JSON.stringify(response.services , null, 2)) 
        response.products = sales
        res.status(200).json(response);
    } catch (error) {
        console.log(error)
        // Cualquier otro error no controlado
        res.status(500).json({
            message: 'Error interno del servidor: ' + error.message,
        });
    }
};
SalesController.getnewsalesdiscount = async (req, res) => {
    try {
        const data = await SalesModels.finddiscounts(req.body.find)
        //console.log(JSON.stringify(data , null, 2))
        res.status(200).json(data);
    } catch (error) {
        console.log(error)
        // Cualquier otro error no controlado
        res.status(500).json({
            message: 'Error interno del servidor: ' + error.message,
        });
    }
};
SalesController.getfinancialentitys = async (req, res) => {
    try {
        const data = await SalesModels.findgetfinancialentitys()
        res.status(200).json(data);
    } catch (error) {
        console.log(error)
        // Cualquier otro error no controlado
        res.status(500).json({
            message: 'Error interno del servidor: ' + error.message,
        });
    }

}

SalesController.save = async (req, res) => {
    try {
        //console.log(JSON.stringify(req.body, null, 2))
        //console.log(req.body)
        const data = await SalesModels.save(req.body, req.user._id)

        const sales = await SalesModels.finddocument(data._id)

        res.status(200).json(sales)
    } catch (error) {
        console.log(error)
        // Cualquier otro error no controlado
        res.status(500).json({
            message: 'Error interno del servidor: ' + error.message,
        });
    }
}

SalesController.list = async (req, res) => {
    try {
        let response = {}
        response = await SalesModels.list(req.body)
        response.hairdresser = await users.gethairdresser()
        response.getproductservicestypes = await SalesModels.getproductservicestypes()
        res.status(200).json(response)
    } catch (error) {
        console.log(error)
        // Cualquier otro error no controlado
        res.status(500).json({
            message: 'Error interno del servidor: ' + error.message,
        });
    }
}
SalesController.reports = async (req, res) => {
    try {
        //console.log(req.body)
        let response = {}
        response.hairdresser = await users.gethairdresser()
        response.report = await SalesModels.reports(req.body.fecha, req.body.barbero)
        // console.log(response.report.resumenIngresos)
        // console.log(sales)
        // console.log(JSON.stringify(sales[0], null, 2))
        res.status(200).json(response)
    } catch (error) {
        console.log(error)
        // Cualquier otro error no controlado
        res.status(500).json({
            message: 'Error interno del servidor: ' + error.message,
        });
    }
}
SalesController.reportsminimal = async (req, res) => {
    try {
        const report = await SalesModels.reports(req.body.fecha, req.body.barbero)
        //console.log(JSON.stringify(report, null, 2))
        const report1 = await SalesModels.reportspdfresumen(report, req.body.fecha, req.body.barbero)

        res.status(200).json({ pdfBase64: report1 })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: 'Error interno del servidor: ' + error.message,
        });
    }
}
SalesController.dataprintticket = async (req, res) => {
    try {
        let sales = await SalesModels.finddocument(req.body.id)
        sales.copia = true
        res.status(200).json(sales)
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: 'Error interno del servidor: ' + error.message,
        });
    }
}
SalesController.reportgraph = async (req, res) => {
    try {
        let sales = {}
        sales.thisWeek = await SalesModels.getWeeklySales()
        sales.lastWeek = await SalesModels.getLastWeekSales()
        sales.thisWeekpeerbarber = await SalesModels.getthisWeekSalesBaerber()
        sales.lastWeekpeerbarber = await SalesModels.getLastWeekSalesBarber()
        sales.thisWeekservices = await SalesModels.getWeeklySalesSummary()

        //console.log(sales.lastWeekpeerbarber)
        res.status(200).json(sales)
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: 'Error interno del servidor: ' + error.message,
        });
    }
}
SalesController.reportmediumpdf = async (req, res) => {
    try {
        const datass = await SalesModels.reportWeeklySalesresumen(req.body)
        //console.log(JSON.stringify(datass , null, 2))
        const pdf = await SalesModels.reportWeeklySalesresumenpdf(datass)
           
        res.status(200).json({ pdfBase64: pdf })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: 'Error interno del servidor: ' + error.message,
        });
    }
}
SalesController.repordetailpdf = async (req, res) => {
    try {

        const datass = await SalesModels.reportWeeklySales(req.body)
        //console.log(JSON.stringify(datass [0 ], null, 2))
        const pdf = await SalesModels.reportWeeklySalespdf(datass)
        res.status(200).json({ pdfBase64: pdf })
    } catch (error) {
        console.log(error)
        res.status(500).json({
            message: 'Error interno del servidor: ' + error.message,
        });
    }
}
module.exports = SalesController;