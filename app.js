// Show splash screen only on first app open
document.addEventListener("DOMContentLoaded", () => {
  const splashScreen = document.getElementById("splash-screen");

  if (!sessionStorage.getItem("splashShown")) {
    setTimeout(() => {
      splashScreen.style.opacity = "0";
      splashScreen.style.visibility = "hidden";
    }, 1500); // Show splash for 1.5 seconds
    sessionStorage.setItem("splashShown", "true");
  } else {
    splashScreen.style.display = "none";
  }
});
