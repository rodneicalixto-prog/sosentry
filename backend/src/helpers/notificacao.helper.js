const prisma = require('../lib/prisma');

async function telefonesNotificados() {
  const usuarios = await prisma.user.findMany({
    where: { ativo: true, recebeWhatsapp: true, telefone: { not: null } },
    select: { telefone: true },
  });
  return [...new Set(usuarios.map(u => u.telefone))];
}

module.exports = { telefonesNotificados };
