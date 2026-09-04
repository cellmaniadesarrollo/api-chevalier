const { PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const s3Client = require('../config/s3');
const crypto = require('crypto');
const path = require('path');

async function uploadFileToS3(file, folder = 'cash-movements') {
    const ext = path.extname(file.originalname);
    const key = `${folder}/${Date.now()}-${crypto.randomBytes(8).toString('hex')}${ext}`;

    await s3Client.send(new PutObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
    }));

    // 🔹 Guardamos solo el key en vez de la URL pública completa
    return key;
}

async function uploadMultipleFilesToS3(files, folder = 'cash-movements') {
    if (!files || !files.length) return [];
    return Promise.all(files.map(file => uploadFileToS3(file, folder)));
}

// 🔹 Extrae el key de S3 a partir de una URL pública ya guardada (soporta datos viejos)
function extractS3Key(urlOrKey) {
    if (!urlOrKey.startsWith('http')) {
        return urlOrKey; // ya es un key limpio
    }
    const bucketUrlPrefix = `https://${process.env.AWS_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`;
    return urlOrKey.startsWith(bucketUrlPrefix)
        ? urlOrKey.replace(bucketUrlPrefix, '')
        : urlOrKey;
}

// 🔹 Genera una URL firmada de lectura, válida por `expiresInSeconds`
async function getSignedAttachmentUrl(urlOrKey, expiresInSeconds = 300) {
    const key = extractS3Key(urlOrKey);

    const command = new GetObjectCommand({
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: key,
    });

    return getSignedUrl(s3Client, command, { expiresIn: expiresInSeconds });
}

async function getSignedAttachmentUrls(attachments = [], expiresInSeconds = 300) {
    return Promise.all(attachments.map(a => getSignedAttachmentUrl(a, expiresInSeconds)));
}

module.exports = {
    uploadFileToS3,
    uploadMultipleFilesToS3,
    getSignedAttachmentUrl,
    getSignedAttachmentUrls,
};