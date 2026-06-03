// Funciones de autenticación básicas

function updateUserDisplay() {
  const userSpan = document.getElementById('currentUser');
  if (userSpan) {
    userSpan.textContent = localStorage.getItem('cecytes_user') || 'usuario';
  }
}

function clearSession() {
  localStorage.removeItem('cecytes_session');
  localStorage.removeItem('cecytes_user');
}

function getSession() {
  return localStorage.getItem('cecytes_session');
}
