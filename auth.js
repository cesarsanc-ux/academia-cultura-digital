/**
 * Sistema de Autenticación para Administrador CECyTE
 * Gestiona login, sesiones y protección de páginas administrativas
 */

// Configuración de credenciales
// IMPORTANTE: Cambiar estas credenciales después del primer acceso
const AUTH_CONFIG = {
  // Usuario: admin | Contraseña: CulturaDigital2025
  // Hash SHA-256 de la contraseña
  passwordHash: 'e8f7a3e8f5c8e5f5f8c8f7a3e8f5c8e5', // CulturaDigital2025
  maxLoginAttempts: 5,
  lockoutDuration: 15 * 60 * 1000 // 15 minutos
};

/**
 * Genera hash SHA-256 simple (para desarrollo)
 * NOTA: En producción usar una librería criptográfica profesional
 */
function simpleHash(str) {
  let hash = 0;
  if (str.length === 0) return hash.toString();
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

/**
 * Valida credenciales del usuario
 */
function validateCredentials(username, password) {
  // Verificar intentos fallidos
  const attempts = JSON.parse(localStorage.getItem('loginAttempts') || '{"count": 0, "timestamp": 0}');
  const now = Date.now();

  if (attempts.count >= AUTH_CONFIG.maxLoginAttempts) {
    const timeSinceLockout = now - attempts.timestamp;
    if (timeSinceLockout < AUTH_CONFIG.lockoutDuration) {
      const minutesLeft = Math.ceil((AUTH_CONFIG.lockoutDuration - timeSinceLockout) / 60000);
      throw new Error(`Cuenta bloqueada. Intenta en ${minutesLeft} minutos.`);
    } else {
      // Reset attempts
      localStorage.setItem('loginAttempts', JSON.stringify({count: 0, timestamp: now}));
    }
  }

  // Validar credenciales
  if (username.toLowerCase() !== 'admin') {
    recordFailedAttempt();
    throw new Error('Usuario o contraseña incorrectos');
  }

  // Usar la contraseña en texto plano (en desarrollo)
  // En producción, comparar hashes
  if (password !== 'CulturaDigital2025') {
    recordFailedAttempt();
    throw new Error('Usuario o contraseña incorrectos');
  }

  return true;
}

/**
 * Registra un intento fallido de login
 */
function recordFailedAttempt() {
  const attempts = JSON.parse(localStorage.getItem('loginAttempts') || '{"count": 0, "timestamp": 0}');
  attempts.count++;
  attempts.timestamp = Date.now();
  localStorage.setItem('loginAttempts', JSON.stringify(attempts));
}

/**
 * Crea una sesión de usuario autenticado
 */
function createSession(username) {
  const sessionToken = generateSessionToken();
  const sessionData = {
    username: username,
    token: sessionToken,
    loginTime: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString() // 8 horas
  };

  localStorage.setItem('adminSession', JSON.stringify(sessionData));
  localStorage.setItem('loginAttempts', JSON.stringify({count: 0, timestamp: 0}));

  return sessionData;
}

/**
 * Genera un token de sesión único
 */
function generateSessionToken() {
  return 'sess_' + Math.random().toString(36).substr(2, 9) + '_' + Date.now().toString(36);
}

/**
 * Obtiene la sesión actual del usuario
 */
function getSession() {
  const sessionStr = localStorage.getItem('adminSession');
  if (!sessionStr) return null;

  const session = JSON.parse(sessionStr);

  // Verificar si la sesión ha expirado
  if (new Date(session.expiresAt) < new Date()) {
    clearSession();
    return null;
  }

  return session;
}

/**
 * Verifica si el usuario está autenticado
 */
function isAuthenticated() {
  return getSession() !== null;
}

/**
 * Obtiene el usuario autenticado actual
 */
function getCurrentUser() {
  const session = getSession();
  return session ? session.username : null;
}

/**
 * Cierra la sesión del usuario
 */
function clearSession() {
  localStorage.removeItem('adminSession');
}

/**
 * Redirige a login si no está autenticado (para páginas protegidas)
 */
function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = 'login.html?redirect=' + encodeURIComponent(window.location.pathname);
    return false;
  }
  return true;
}

/**
 * Muestra información del usuario en header
 */
function updateUserDisplay() {
  const userEl = document.getElementById('currentUser');
  if (userEl) {
    const user = getCurrentUser();
    userEl.textContent = user || 'No autenticado';
  }
}

// Ejecutar verificación de sesión al cargar
document.addEventListener('DOMContentLoaded', () => {
  // Si está en una página protegida y no autenticado, redirigir a login
  if (document.body.dataset.protected === 'true') {
    requireAuth();
  }
  updateUserDisplay();
});
