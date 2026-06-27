const prisma   = require('../lib/prisma');
const sseSvc   = require('../services/sse.service');
const evo      = require('../services/evolution.service');
const emailSvc = require('../services/email.service');

// ─── Parser da chave de acesso NF-e (44 dígitos) ─────────────────────────────

const UF_CODIGO = {
  '11':'RO','12':'AC','13':'AM','14':'RR','15':'PA','16':'AP','17':'TO',
  '21':'MA','22':'PI','23':'CE','24':'RN','25':'PB','26':'PE','27':'AL','28':'SE','29':'BA',
  '31':'MG','32':'ES','33':'RJ','35':'SP',
  '41':'PR','42':'SC','43':'RS',
  '50':'MS','51':'MT','52':'GO','53':'DF',
};

function parseChaveNFe(raw) {
  const chave = raw.replace(/\D/g, '');
  if (chave.length !== 44) return null;

  const cUF   = chave.slice(0, 2);
  const aamm  = chave.slice(2, 6);
  const cnpj  = chave.slice(6, 20);
  const mod   = chave.slice(20, 22);
  const serie = chave.slice(22, 25);
  const nNF   = chave.slice(25, 34);

  const ano = '20' + aamm.slice(0, 2);
  const mes = aamm.slice(2, 4);

  return {
    chave,
    uf:        UF_CODIGO[cUF] || cUF,
    cnpj,
    cnpjFmt:   cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, '$1.$2.$3/$4-$5'),
    modelo:    mod === '55' ? 'NF-e' : mod === '65' ? 'NFC-e' : `Modelo ${mod}`,
    serie:     String(parseInt(serie, 10)),
    numeroNF:  String(parseInt(nNF, 10)),
    emissao:   `${mes}/${ano}`,
  };
}

// ─── Busca agendamento compatível com a NF ────────────────────────────────────

async function buscarAgendamentoNF(nfe) {
  // Tenta casar pelo número da NF ou pelo CNPJ do emitente
  const candidatos = await prisma.agendamento.findMany({
    where: {
      status: { in: ['APROVADO', 'NF_RECEBIDA'] },
      OR: [
        { numeroNF: nfe.numeroNF },
        { cnpj: { contains: nfe.cnpj } },
      ],
    },
    include: { portaria: { select: { nome: true } }, criadoPor: { select: { nome: true } } },
    orderBy: { criadoEm: 'desc' },
    take: 1,
  });
  return candidatos[0] || null;
}

// ─── Busca empresa cadastrada pelo CNPJ ───────────────────────────────────────

async function buscarEmpresaPorCNPJ(cnpj) {
  return prisma.empresa.findFirst({
    where: { cnpj: { contains: cnpj }, ativo: true },
  });
}

// ─── Contatos do setor de Faturamento ────────────────────────────────────────

async function contatosFaturamento() {
  const setores = await prisma.notificacaoSetor.findMany({
    where: {
      ativo: true,
      eventos: { has: 'nf_nao_programada' },
    },
  });
  return setores;
}

// ─── Mensagem de alerta para o emissor ───────────────────────────────────────

function mensagemEmissor(nfe) {
  return (
    `*SOS Entry — Aviso de Entrega Não Programada*\n\n` +
    `Sua empresa (CNPJ: ${nfe.cnpjFmt}) tentou realizar uma entrega em nossa portaria sem agendamento prévio.\n\n` +
    `*Dados da NF:* ${nfe.modelo} nº ${nfe.numeroNF} (Série ${nfe.serie}) — ${nfe.emissao}\n\n` +
    `Para que futuras entregas sejam liberadas na portaria, é *obrigatório* realizar o pré-agendamento:\n\n` +
    `1. Solicite ao seu comprador/fornecedor interno o *link de agendamento*\n` +
    `2. Preencha os dados da NF e a data prevista de entrega\n` +
    `3. Aguarde a aprovação — você receberá um *QR Code* para apresentar na portaria\n\n` +
    `Em caso de dúvidas, entre em contato com nosso setor de Logística.`
  );
}

function htmlMensagemEmissor(nfe) {
  return `
    <h2 style="color:#dc2626">SOS Entry — Entrega Não Programada</h2>
    <p>Sua empresa (<strong>CNPJ: ${nfe.cnpjFmt}</strong>) tentou realizar uma entrega em nossa portaria sem agendamento prévio.</p>
    <table style="border-collapse:collapse;margin:12px 0">
      <tr><td style="padding:4px 12px 4px 0;color:#666">Documento:</td><td><strong>${nfe.modelo} nº ${nfe.numeroNF}</strong></td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">Série:</td><td>${nfe.serie}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">Emissão:</td><td>${nfe.emissao}</td></tr>
      <tr><td style="padding:4px 12px 4px 0;color:#666">UF:</td><td>${nfe.uf}</td></tr>
    </table>
    <hr/>
    <h3>Como regularizar — Processo obrigatório de pré-agendamento</h3>
    <ol>
      <li>Solicite ao seu comprador/contato interno o <strong>link de agendamento</strong></li>
      <li>Preencha os dados da NF e a data prevista de entrega</li>
      <li>Aguarde a aprovação — você receberá um <strong>QR Code</strong> para apresentar na portaria</li>
    </ol>
    <p style="color:#666;font-size:12px">Em caso de dúvidas, entre em contato com nosso setor de Logística.</p>
  `;
}

// ─── Controller principal ─────────────────────────────────────────────────────

exports.verificarNF = async (req, res, next) => {
  try {
    const { codigoNF } = req.body;
    if (!codigoNF?.trim()) return res.status(400).json({ error: 'codigoNF obrigatório' });

    // 1. Parsear chave NF-e
    const nfe = parseChaveNFe(codigoNF.trim());
    if (!nfe) {
      return res.status(422).json({ error: 'Código não reconhecido como chave NF-e (44 dígitos numéricos esperados).' });
    }

    // 2. Verificar se há agendamento aprovado
    const agendamento = await buscarAgendamentoNF(nfe);

    if (agendamento) {
      // Programado — retorna os dados para continuar o fluxo normal
      return res.json({ programado: true, nfe, agendamento });
    }

    // 3. Não programado — disparar alertas
    const empresa = await buscarEmpresaPorCNPJ(nfe.cnpj);
    const setoresFat = await contatosFaturamento();

    // SSE — broadcast para todos os usuários logados
    sseSvc.broadcast('nf_nao_programada', {
      nfe,
      empresa: empresa ? { nome: empresa.nome, cnpj: empresa.cnpj } : null,
      operadorId: req.user.id,
    });

    // WhatsApp + e-mail → setores de faturamento cadastrados
    const alertaFat = (
      `🚨 *Entrega Não Programada*\n\n` +
      `Código de barras de NF lido na portaria sem agendamento.\n\n` +
      `*NF:* ${nfe.modelo} nº ${nfe.numeroNF} (Série ${nfe.serie})\n` +
      `*Emitente:* CNPJ ${nfe.cnpjFmt}\n` +
      `*UF:* ${nfe.uf} | *Emissão:* ${nfe.emissao}\n` +
      (empresa ? `*Empresa cadastrada:* ${empresa.nome}\n` : '') +
      `\nNenhum agendamento aprovado encontrado para este CNPJ/NF.`
    );

    for (const setor of setoresFat) {
      evo.enviarMensagem(setor.telefone, alertaFat)
        .catch(e => console.error('[evo] nf_nao_programada setor:', e.message));
    }

    // E-mail aos setores de faturamento com email
    const emailsFat = setoresFat.map(s => s.email).filter(Boolean);
    if (emailsFat.length) {
      emailSvc.send({
        to: emailsFat.join(','),
        subject: `[SOS Entry] Entrega Não Programada — NF ${nfe.numeroNF} (${nfe.cnpjFmt})`,
        html: `
          <h2 style="color:#dc2626">🚨 Entrega Não Programada</h2>
          <p>Um código de barras de NF foi lido na portaria sem agendamento cadastrado.</p>
          <table style="border-collapse:collapse;margin:12px 0">
            <tr><td style="padding:4px 12px 4px 0;color:#666">Documento:</td><td><strong>${nfe.modelo} nº ${nfe.numeroNF}</strong></td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#666">Série:</td><td>${nfe.serie}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#666">CNPJ Emitente:</td><td>${nfe.cnpjFmt}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#666">UF:</td><td>${nfe.uf}</td></tr>
            <tr><td style="padding:4px 12px 4px 0;color:#666">Emissão:</td><td>${nfe.emissao}</td></tr>
            ${empresa ? `<tr><td style="padding:4px 12px 4px 0;color:#666">Empresa cadastrada:</td><td>${empresa.nome}</td></tr>` : ''}
          </table>
          <p><strong>Nenhum agendamento aprovado encontrado para este CNPJ/NF.</strong></p>
          <p>Verifique se a entrega foi pre-agendada ou entre em contato com o emissor.</p>
        `,
        text: alertaFat,
      }).catch(e => console.error('[email] nf_nao_programada faturamento:', e.message));
    }

    // WhatsApp + e-mail → emissor (empresa cadastrada)
    if (empresa) {
      const msgEmissor = mensagemEmissor(nfe);
      evo.enviarMensagem(empresa.whatsapp, msgEmissor)
        .catch(e => console.error('[evo] nf_nao_programada emissor:', e.message));

      emailSvc.send({
        to: empresa.email,
        subject: `SOS Entry — Entrega Não Programada (NF ${nfe.numeroNF})`,
        html: htmlMensagemEmissor(nfe),
        text: msgEmissor,
      }).catch(e => console.error('[email] nf_nao_programada emissor:', e.message));
    }

    return res.json({
      programado: false,
      nfe,
      empresa: empresa ? { nome: empresa.nome, email: empresa.email, whatsapp: empresa.whatsapp } : null,
      setoresNotificados: setoresFat.length,
      emissorNotificado: !!empresa,
    });
  } catch (e) { next(e); }
};
