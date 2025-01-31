const permissions = {};
const { GoogleAuth } = require('google-auth-library');
const { RecaptchaEnterpriseServiceClient } = require('@google-cloud/recaptcha-enterprise');
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken'); 
const User= require("../db/users")


// Middleware para verificar el token de reCAPTCHA
permissions.recaptchaToken = async (req, res, next) => {
  try {
    console.log('Request body antes de middleware:', req.body)
    // Credenciales nuevas

    // const projectID = "cheva-448521";
    // const recaptchaKey = "6Lf_C78qAAAAABW1udsb9PmInY4f5e1TBw5C5Z8Y";
    // const token = req.headers['recaptcha-token']; // Obteniendo el token desde los headers
    // const recaptchaAction = "submit"//"action-name";

    if (!token) {
      return res.status(400).json({ message: 'reCAPTCHA es requerido' });
    }

    /////// Descomentar para usar credenciales de google cloud
    // // Rutas de los archivos JSON de credenciales
    // let keyFilePath = path.resolve('./keys/cheva-448521-941d79d7243b.json');
    // const fallbackKeyFilePath = path.resolve('src/keys/cheva-448521-941d79d7243b.json');


    // Verificar si el archivo JSON existe, si no, cambiar a la ruta alternativa
    if (!fs.existsSync(keyFilePath)) { 
      keyFilePath = fallbackKeyFilePath;
    }

    // Autenticación manual usando el archivo JSON de credenciales correcto
    const auth = new GoogleAuth({
      keyFilename: keyFilePath
    });

    // Crea el cliente de reCAPTCHA
    const client = new RecaptchaEnterpriseServiceClient({
      auth: auth
    });

    const projectPath = client.projectPath(projectID);

    // Crea la solicitud de evaluación
    const request = {
      assessment: {
        event: {
          token: token,
          siteKey: recaptchaKey,
        },
      },
      parent: projectPath,
    };

    const [response] = await client.createAssessment(request);

    // Verifica si el token es válido
    if (!response.tokenProperties.valid) { 
      return res.status(400).json({ message: 'Error en la validación de reCAPTCHA' });
    }

    // Verifica si se ejecutó la acción esperada
    if (response.tokenProperties.action === recaptchaAction) {
      // Verificar si la puntuación de riesgo es aceptable (>0.5)
      if (response.riskAnalysis.score > 0.5) {
        // Continuar con el flujo normal (validación exitosa)
        console.log('Validación de reCAPTCHA exitosa');
        console.log('Request body antes de next():', req.body); // Verifica el cuerpo de la solicitud antes de llamar a next()
        next();
      } else {
        // Rechazar la solicitud porque parece ser un bot
        return res.status(400).json({ message: 'Parece ser un bot' });
      }
    } else { 
      return res.status(400).json({ message: 'Error en la validación de reCAPTCHA' });
    }
  } catch (error) {
    // Captura de errores y retorno de un mensaje de error 
    return res.status(500).json({ message: 'Error en la validación de reCAPTCHA' });
  }

}

 // Middleware para verificar si el usuario está autenticado
 permissions.logged = async (req, res, next) => {
  // const token = req.headers.authorization;
    // Obtener el token del header Authorization
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  try {
    // Verificar el token (por ejemplo, con JWT)
    const decoded = jwt.verify(token, "process.env.JWT_SECRET");
       // Buscar al usuario en la base de datos
       const user = await User.findById(decoded.id).populate('roles'); // Llenar el campo 'roles'

       if (!user) {
         return res.status(401).json({ message: 'Unauthorized: User not found' });
       }
   
       // Verificar si el sessionId coincide
       if (user.sessionId !== decoded.sessionId) {
         return res.status(401).json({ message: 'Unauthorized: Invalid session' });
       }
   
       // Guardar la información del usuario en la request para usarla en otros middlewares
       req.user = user;

    next();  // El usuario está autenticado, pasar al siguiente middleware
  } catch (err) {
    console.log(err)
    return res.status(401).json({ message: 'Unauthorized: Invalid token' });
  }
};
// Middleware para verificar si el usuario tiene uno de los roles permitidos
permissions.hasRole = (...roles) => {
  return (req, res, next) => {
    const userRoles = req.user.roles.map(role => role.name); // Extrae los nombres de los roles del usuario

    // Verificar si el usuario tiene al menos uno de los roles permitidos
    if (roles.some(role => userRoles.includes(role))) {
      next();  // Tiene el rol necesario
    } else {
      return res.status(403).json({ message: 'Forbidden: Access denied' });
    }
  };
};
  /**
    * Crea una evaluación para analizar el riesgo de una acción de la IU.
    *
    * projectID: El ID del proyecto de Google Cloud.
    * recaptchaSiteKey: La clave reCAPTCHA asociada con el sitio o la aplicación
    * token: El token generado obtenido del cliente.
    * recaptchaAction: El nombre de la acción que corresponde al token.
    */

  async function createAssessment(tokens) {
    const projectID = "chevalier-proyec-1727896169741";
    const recaptchaKey = "6Le83VUqAAAAAAdwGCtIGFF5QTEc82FNsFYWIbKt";
    const token = tokens;
    const recaptchaAction = "action-name";
  
    // Autenticación manual usando el archivo JSON de credenciales
    const auth = new GoogleAuth({
      keyFilename: path.resolve('/home/teamcellmania/Descargas/chevalier-proyec-1727896169741-1e030ca111c3.json')
    });
  
    // Crea el cliente de reCAPTCHA.
    const client = new RecaptchaEnterpriseServiceClient({
      auth: auth
    });
    
    const projectPath = client.projectPath(projectID);
  
    // Crea la solicitud de evaluación.
    const request = {
      assessment: {
        event: {
          token: token,
          siteKey: recaptchaKey,
        },
      },
      parent: projectPath,
    };
  
    const [response] = await client.createAssessment(request);
  
    // Verifica si el token es válido.
    if (!response.tokenProperties.valid) {
      console.log(`The CreateAssessment call failed because the token was: ${response.tokenProperties.invalidReason}`);
      return null;
    }
  
    // Verifica si se ejecutó la acción esperada.
    if (response.tokenProperties.action === recaptchaAction) {
      console.log(`The reCAPTCHA score is: ${response.riskAnalysis.score}`);
      response.riskAnalysis.reasons.forEach((reason) => {
        console.log(reason);
      });
  
      return response.riskAnalysis.score;
    } else {
      console.log("The action attribute in your reCAPTCHA tag does not match the action you are expecting to score");
      return null;
    }
  }

module.exports = permissions;
