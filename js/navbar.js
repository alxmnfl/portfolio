// ---------- Mobile sidebar drawer ----------
const sidebar = document.getElementById("sidebar");
const burger = document.getElementById("burger");

const setOpen = (open) => {
  sidebar.classList.toggle("open", open);
  burger.classList.toggle("open", open);
  burger.setAttribute("aria-expanded", String(open));
};

burger.addEventListener("click", () => setOpen(!sidebar.classList.contains("open")));
sidebar.querySelectorAll("a").forEach((a) => a.addEventListener("click", () => setOpen(false)));
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") setOpen(false);
});
