function updateUserDisplay() {
  const userSpan = document.getElementById('currentUser');
  if (!userSpan) return;
  const user = auth.currentUser;
  userSpan.textContent = user ? (user.displayName || user.email || 'Admin') : 'usuario';
}

async function clearSession() {
  await auth.signOut();
}

function getSession() {
  return auth.currentUser;
}
