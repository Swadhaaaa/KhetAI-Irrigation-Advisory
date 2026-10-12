if (Auth.isLoggedIn()) window.location.replace("dashboard.html");

const form = document.getElementById("signup-form");
const errorBox = document.getElementById("form-error");
const submitBtn = document.getElementById("submit-btn");

form.addEventListener("submit", async (event) => {
  event.preventDefault();
  errorBox.textContent = "";
  errorBox.classList.remove("show");
  submitBtn.disabled = true;
  submitBtn.textContent = "Creating account...";

  const payload = {
    name: document.getElementById("name").value.trim(),
    mobile: document.getElementById("mobile").value.trim(),
    password: document.getElementById("password").value,
    village: document.getElementById("village").value.trim(),
    taluk: document.getElementById("taluk").value.trim(),
    district: document.getElementById("district").value.trim(),
  };

  try {
    const { token, user } = await api.register(payload);
    Auth.setSession(token, user);
    window.location.assign("dashboard.html?onboarding=1");
  } catch (error) {
    errorBox.textContent = error.message || "Could not create your account. Please try again.";
    errorBox.classList.add("show");
    submitBtn.disabled = false;
    submitBtn.textContent = "Create account";
  }
});
