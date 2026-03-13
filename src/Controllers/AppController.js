const AppController = {};
const index = require('../models');
const AppModels = require('../models/AppModels');
const NotFoundError = require('../errors/NotFoundError');



AppController.index = async (req, res) => {
  res.sendFile(__dirname + "/views/");
  //res.send('exito aqui') 
};

AppController.ticktockupdate = async () => {
  try {
    await index.tictockupdate()

    // res.json(data) 
  } catch (error) {
    console.error('Error scraping TikTok:', error);
    // res.status(500).json({ success: false, error: error.message });
  }

}

AppController.ticktock = async (req, res) => {
  try {
    const data = await index.ticktock()

    res.json(data)
  } catch (error) {
    console.error('Error scraping TikTok:', error);
    res.status(500).json({ success: false, error: error.message });
  }

}
AppController.tdata = async (req, res) => {
  try {
    const data = await index.tdata()

    res.json(data)
  } catch (error) {
    console.error('Error scraping TikTok:', error);
    res.status(500).json({ success: false, error: error.message });
  }

}

AppController.facebook = async (req, res) => {
  try {
    const data = await index.facebook()

    res.json(data)
  } catch (error) {
    console.error('Error scraping TikTok:', error);
    res.status(500).json({ success: false, error: error.message });
  }

}

AppController.sendemail = async (req, res) => {
  try {
    // await index.email(req.body)
    res.sendStatus(200);
  } catch (error) {
    console.error(error);
    res.status(500).json({ success: false, error: error.message });
  }

}

AppController.consultaCortes = async (req, res) => {
  try {
    const data = await AppModels.consultscounts(req.body);
    const discounts= await AppModels.consultsdiscounts(req.body);  
  //  console.log(data[0].relatedSales)
    res.json({data, discounts});
  } catch (error) {
    console.error('Error en consultaCortes:', error);
    const status = error.statusCode || 500;
    res.status(status).json({ success: false, error: error.message });
  }
}

module.exports = AppController;