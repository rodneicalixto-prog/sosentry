require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando seed SOS Entry...');
  await prisma.portaria.upsert({ where:{ numero:1 }, update:{},
    create:{ numero:1, nome:'Portaria 1 — Transportes', tipo:'transportes' } });
  await prisma.portaria.upsert({ where:{ numero:2 }, update:{},
    create:{ numero:2, nome:'Portaria 2 — Pedestres', tipo:'pedestres' } });
  const hash = await bcrypt.hash(process.env.SEED_SUPERADMIN_SENHA||'Trocar@123', 12);
  await prisma.user.upsert({ where:{ login:'superadmin' }, update:{},
    create:{ nome:'Super Administrador', login:'superadmin',
             passwordHash: hash, role:'superadmin', ativo:true } });
  console.log('✓ Portarias criadas');
  console.log('✓ Superadmin: login=superadmin senha=Rcs@1504820969');
  console.log('Seed concluído!');
}
main().catch(e => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());
