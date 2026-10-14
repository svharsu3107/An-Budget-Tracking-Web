const authScreen = document.getElementById("authScreen");
const dashboard = document.getElementById("dashboard");
const authStatus = document.getElementById("authStatus");

let currentUserId = null;

document.getElementById("signupBtn").addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth.createUserWithEmailAndPassword(email, password)
    .then((cred) => initUserProfile(cred.user.uid))
    .catch((err) => alert(err.message));
});

document.getElementById("loginBtn").addEventListener("click", () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  auth.signInWithEmailAndPassword(email, password)
    .catch((err) => alert(err.message));
});

auth.onAuthStateChanged((user) => {
  if (user) {
    currentUserId = user.uid;
    authScreen.classList.add("hidden");
    dashboard.classList.remove("hidden");
    authStatus.innerHTML = `${user.email} <button id="logoutBtn" style="width:auto;display:inline;padding:4px 10px;">Logout</button>`;
    document.getElementById("logoutBtn").addEventListener("click", () => auth.signOut());

    loadUserData(currentUserId);
  } else {
    currentUserId = null;
    authScreen.classList.remove("hidden");
    dashboard.classList.add("hidden");
    authStatus.innerHTML = "";
  }
});

// Creates a blank profile doc for a new user
function initUserProfile(uid) {
  return db.collection("users").doc(uid).set({
    monthlyIncome: 0,
    createdAt: new Date().toISOString()
  }, { merge: true });
}
