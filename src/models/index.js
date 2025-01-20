const index = {};
const axios = require('axios');
const ticktockdatas = require('../db/ticktockdatas')
const nodemailer = require('nodemailer');
index.tictock = async () => {



  const options = {
    method: 'GET',
    url: 'https://tiktok-scraper7.p.rapidapi.com/user/posts',
    params: {
      user_id: '7112468023785112582',
      count: '99',
      cursor: '0'
    },
    headers: {
      'x-rapidapi-key': '8cb602eca7msha772050d0267b7cp100c10jsn3264e1e3eba0',
      'x-rapidapi-host': 'tiktok-scraper7.p.rapidapi.com'
    }
  };

  try {

    const response = await axios.request(options);
    const ainsertvideos = await response.data.data.videos.map((video) => ({

      video_id: video.video_id,
      title: video.title,
      duration: video.duration,
      create_time: video.create_time,
      is_top: video.is_top,
      play_count: video.play_count,
    }));
    // console.log(ainsertvideos)
    // console.log(response.data.data.videos);
    // // Usando await para esperar la inserción
    const result = await ticktockdatas.insertMany(ainsertvideos);


    return response.data.data.videos
  } catch (error) {
    console.error(error);
    throw error
  }


}
index.tictockupdate = async () => {
 

  const options = {
    method: 'GET',
    url: 'https://tiktok-scraper7.p.rapidapi.com/user/posts',
    params: {
      user_id: '7112468023785112582',
      count: '10',
      cursor: '0'
    },
    headers: {
      'x-rapidapi-key': '8cb602eca7msha772050d0267b7cp100c10jsn3264e1e3eba0',
      'x-rapidapi-host': 'tiktok-scraper7.p.rapidapi.com'
    }
  };

  try {

    const response = await axios.request(options);
    const videos = await response.data.data.videos;

    const operations = videos.map((video) => {
      // Preparamos el objeto de actualización
      const updateFields = {
        title: video.title,
        duration: video.duration,
        create_time: video.create_time,
        is_top: video.is_top,
      };

      // Solo añadimos play_count si es mayor que 0
      if (video.play_count > 0) {
        updateFields.play_count = video.play_count;
      }

      return {
        updateOne: {
          filter: { video_id: video.video_id }, // Filtra por video_id
          update: {
            $set: updateFields,
          },
          upsert: true, // Crea si no existe
        },
      };
    });

    // Ejecuta las operaciones de actualización/inserción
    const result = await ticktockdatas.bulkWrite(operations);

    console.log('Resultado:', result);

    return true;
  } catch (error) {
    console.error(error);
    throw error
  }


}
index.tdata = async () => {

  try {
    // 1. Obtener hasta 6 videos con `is_top: 1`
    const topVideos = await ticktockdatas.find({ is_top: '1' }).limit(6);

    const topVideosCount = topVideos.length;

    // 2. Si hay menos de 6 videos con `is_top: 1`, obtener videos recientes
    if (topVideosCount < 6) {
      // Calcular cuántos videos recientes necesitamos
      const remainingCount = 6 - topVideosCount;

      // Obtener videos recientes excluyendo los ya obtenidos
      const recentVideos = await ticktockdatas.find({
        is_top: { $ne: '1' }, // Excluir los videos con `is_top: 1`
        _id: { $nin: topVideos.map(video => video._id) } // Evitar duplicados
      })
        .sort({ create_time: -1 }) // Ordenar por `create_time` en orden descendente (recientes primero)
        .limit(remainingCount);

      // 3. Combinar ambos conjuntos de videos
      return [...recentVideos, ...topVideos];
    }

    // Si ya tenemos 6 videos con `is_top: 1`, devolvemos esos
    return topVideos;
  } catch (error) {
    console.error('Error al obtener los videos:', error);
    throw error;
  }
}

index.facebook = async () => {
  try {
    console.log('si')

    return true
  } catch (error) {
    throw error
  }
}
index.email = async (data) => {
  try {
    // Crea el transportador con los datos de tu cuenta de Gmail
    if (data.comments.trim() === "") {
      throw new Error('El campo de comentarios no puede estar vacío.');
    }
    let transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'christians9210023.tcm@gmail.com', // Tu correo electrónico
        pass: 'qmaz tmuy tfwl iebb',     // La contraseña de aplicación generada
      },
    });

    // Configuración del correo electrónico
    let mailOptions = {
      from: 'christians9210023.tcm@gmail.com',
       to: 'chevalierbarbershop13@gmail.com',
     // to: 'suarezchristian925@gmail.com',
      subject: '💬💬Comentarios de la pagina web💬💬', 
      html: `<b>${data.comments}</b>`,
    };

    // Enviar el correo electrónico
    transporter.sendMail(mailOptions, (error, info) => {
      if (error) {
        return console.log(error);
      }
      console.log('Correo enviado: %s', info.messageId);
    });
  } catch (error) {
    console.log(error)
    throw error
  }
}
module.exports = index;