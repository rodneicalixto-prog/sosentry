const QRCode = require('qrcode');

async function gerarQRCodeBase64(dados) {
  const texto = JSON.stringify(dados);
  return QRCode.toDataURL(texto, {
    errorCorrectionLevel: 'M',
    width: 300,
    margin: 2,
  });
}

async function gerarQRCodeBuffer(dados) {
  const texto = JSON.stringify(dados);
  return QRCode.toBuffer(texto, {
    errorCorrectionLevel: 'M',
    width: 300,
    margin: 2,
  });
}

module.exports = { gerarQRCodeBase64, gerarQRCodeBuffer };
