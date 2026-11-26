// ---------- Contact form (demo) ----------
const form = document.getElementById("contactForm");
const note = document.getElementById("formNote");
form.addEventListener("submit", (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));
  // Hook this up to a PHP mailer or a service like Formspree / EmailJS.
  console.log("Contact form:", data);
  note.textContent = "Thanks! Your message has been noted (demo mode).";
  form.reset();
  setTimeout(() => (note.textContent = ""), 4000);
});

