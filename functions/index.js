const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

// ── HELPER: llamada a Claude ──────────────────────────────────────────────────
async function callClaude(apiKey, { system, messages, max_tokens = 512 }) {
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens, system, messages })
  });
  if (!response.ok) {
    const err = await response.text();
    functions.logger.error('Anthropic error', { status: response.status, body: err });
    throw new functions.https.HttpsError('internal', 'Error al contactar el servicio de IA. Intenta de nuevo.');
  }
  const result = await response.json();
  return (result.content[0].text || '').trim();
}

const ALLOWED_EMAILS = ['cesar.sanchezcoyotzi@cecytlax.edu.mx'];

// ── ASISTENTE PARA DOCENTES (público) ────────────────────────────────────────
exports.consultarAsistente = functions.https.onCall(async (data, context) => {
  // Validar y sanitizar mensajes de la conversación
  const rawMensajes = Array.isArray(data.mensajes) ? data.mensajes : [];
  if (rawMensajes.length === 0) {
    throw new functions.https.HttpsError('invalid-argument', 'Envía al menos un mensaje.');
  }

  const mensajes = rawMensajes
    .slice(-8)
    .filter(m => m && typeof m.content === 'string' && m.content.trim())
    .map(m => ({
      role: m.role === 'assistant' ? 'assistant' : 'user',
      content: String(m.content).slice(0, 1000)
    }));

  if (!mensajes.length || mensajes[mensajes.length - 1].role !== 'user') {
    throw new functions.https.HttpsError('invalid-argument', 'El último mensaje debe ser del usuario.');
  }

  // Contexto enviado por el cliente (noticias y repositorio ya cargados)
  const noticias   = Array.isArray(data.noticias)    ? data.noticias.slice(0, 25)    : [];
  const repositorio = Array.isArray(data.repositorio) ? data.repositorio.slice(0, 25) : [];

  const newsCtx = noticias.length
    ? noticias.map(n => `• [${n.tag || 'Aviso'}] "${n.title}" (${n.date || ''}): ${n.desc || ''}`).join('\n')
    : 'Sin noticias disponibles actualmente.';

  const repoCtx = repositorio.length
    ? repositorio.map(r => `• [${r.fileType || 'DOC'}][${r.cat || ''}] "${r.name}": ${r.meta || ''}`).join('\n')
    : 'Sin documentos disponibles actualmente.';

  const cfg = functions.config();
  const apiKey = cfg.anthropic && cfg.anthropic.key;
  if (!apiKey) {
    throw new functions.https.HttpsError('internal', 'Servicio de IA no configurado.');
  }

  const system = `Eres el asistente virtual del área de Cultura Digital del CECyTE (Colegio de Estudios Científicos y Tecnológicos). Ayudas a los docentes a encontrar información, recursos y avisos del portal web del área.

Responde en español con tono amigable y conciso (máximo 3-4 oraciones). Si la información no está en los datos disponibles, dilo honestamente y sugiere contactar al coordinador: culturadigital@CECyTE.edu.mx. No inventes datos.

NOTICIAS Y AVISOS RECIENTES:
${newsCtx}

DOCUMENTOS EN EL REPOSITORIO:
${repoCtx}`;

  const respuesta = await callClaude(apiKey, { system, messages: mensajes });
  return { respuesta };
});

const VALID_TAGS = ['Academia', 'Calendario', 'Formatos', 'Capacitación', 'Plataformas', 'Anuncio'];

const SYSTEM_PROMPT = `Eres un asistente de redacción para el área de Cultura Digital del CECyTE \
(Colegio de Estudios Científicos y Tecnológicos). Ayudas al coordinador académico a redactar \
noticias y avisos institucionales para el portal web del área. Siempre escribes en español, \
con tono formal, claro y accesible para docentes de nivel medio superior.`;

exports.generarNoticia = functions.https.onCall(async (data, context) => {
  // Verificar autenticación
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Debes iniciar sesión para usar esta función.');
  }
  const email = (context.auth.token.email || '').toLowerCase().trim();
  if (!ALLOWED_EMAILS.includes(email)) {
    throw new functions.https.HttpsError('permission-denied', 'No tienes permiso para usar esta función.');
  }

  // Validar entrada
  const borrador = String(data.borrador || '').trim();
  if (borrador.length < 10) {
    throw new functions.https.HttpsError('invalid-argument', 'Describe el aviso con más detalle (mínimo 10 caracteres).');
  }
  if (borrador.length > 2000) {
    throw new functions.https.HttpsError('invalid-argument', 'El borrador es demasiado largo (máximo 2000 caracteres).');
  }

  // Obtener API key de la configuración de Firebase
  const cfg = functions.config();
  const apiKey = cfg.anthropic && cfg.anthropic.key;
  if (!apiKey) {
    throw new functions.https.HttpsError(
      'internal',
      'API key no configurada. Ejecuta: firebase functions:config:set anthropic.key="tu-clave"'
    );
  }

  // Llamar a Claude
  const rawText = await callClaude(apiKey, {
    system: SYSTEM_PROMPT,
    max_tokens: 1024,
    messages: [{
      role: 'user',
      content: `Redacta una noticia formal para el portal del área de Cultura Digital, \
basándote en este borrador del coordinador:

"${borrador}"

Devuelve ÚNICAMENTE un objeto JSON válido (sin bloques de código markdown, sin texto adicional):
{
  "title": "Título formal de la noticia (máx 80 caracteres, claro y directo)",
  "desc": "Resumen breve para el portal (máx 150 caracteres)",
  "detail": "Descripción completa con detalles relevantes para los docentes (2-3 párrafos, tono institucional)",
  "tag": "una opción exacta de: Academia, Calendario, Formatos, Capacitación, Plataformas, Anuncio",
  "icon": "un emoji que represente visualmente la noticia"
}`
    }]
  });

  // Parsear JSON de la respuesta
  let parsed;
  try {
    const jsonMatch = rawText.match(/\{[\s\S]*\}/);
    parsed = JSON.parse(jsonMatch ? jsonMatch[0] : rawText);
  } catch (e) {
    functions.logger.error('JSON parse error', { rawText });
    throw new functions.https.HttpsError('internal', 'La IA devolvió un formato inesperado. Intenta de nuevo.');
  }

  return {
    title:  String(parsed.title  || '').slice(0, 80).trim(),
    desc:   String(parsed.desc   || '').slice(0, 150).trim(),
    detail: String(parsed.detail || '').trim(),
    tag:    VALID_TAGS.includes(parsed.tag) ? parsed.tag : 'Anuncio',
    icon:   String(parsed.icon   || '📢').replace(/\s/g, '').slice(0, 2)
  };
});
