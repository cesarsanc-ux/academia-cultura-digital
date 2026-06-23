const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();

const ALLOWED_EMAILS = ['cesar.sanchezcoyotzi@cecytlax.edu.mx'];

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
  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
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
    })
  });

  if (!response.ok) {
    const errText = await response.text();
    functions.logger.error('Anthropic API error', { status: response.status, body: errText });
    throw new functions.https.HttpsError('internal', 'Error al contactar el servicio de IA. Intenta de nuevo.');
  }

  const result = await response.json();
  const rawText = (result.content[0].text || '').trim();

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
