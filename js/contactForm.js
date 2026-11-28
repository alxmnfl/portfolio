// ---------- Contact form (Web3Forms) ----------
// Get a free access key at https://web3forms.com (sent to the inbox that should receive inquiries).
// The key is public by design; it only allows sending submissions to that inbox.
const WEB3FORMS_ACCESS_KEY = "2771b663-8e1a-4579-894f-5b354f64ae0b";

const form = document.getElementById("contactForm");
const note = document.getElementById("formNote");
const sendBtn = form.querySelector(".btn-send");

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form));

  // Honeypot: real users never fill this hidden field.
  if (data.botcheck) return;
  delete data.botcheck;

  sendBtn.disabled = true;
  note.textContent = "Sending…";

  try {
    const res = await fetch("https://api.web3forms.com/submit", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        access_key: WEB3FORMS_ACCESS_KEY,
        subject: `New inquiry: ${data.project} (from ${data.name})`,
        from_name: "Portfolio contact form",
        ...data,
      }),
    });
    const result = await res.json();
    if (!res.ok || !result.success)
      throw new Error(result.message || "Request failed");

    note.textContent =
      "Thanks! Your message was sent. I'll get back to you soon.";
    form.reset();
  } catch (err) {
    console.error("Contact form error:", err);
    note.textContent =
      "Sorry, something went wrong. Please email me directly at alexmonfiel@gmail.com.";
  } finally {
    sendBtn.disabled = false;
  }
});
