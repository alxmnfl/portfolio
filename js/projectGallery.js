// ---------- Project gallery: slow auto-sliding screenshots ----------
const SLIDE_MS = 5000;
document.querySelectorAll("[data-gallery]").forEach((gallery) => {
  const slides = [...gallery.querySelectorAll(".gallery-slide")];
  const dots = [...gallery.querySelectorAll(".gallery-dot")];
  let i = 0,
    timer;

  const show = (n) => {
    slides[i].classList.remove("active");
    dots[i].classList.remove("active");
    i = (n + slides.length) % slides.length;
    slides[i].classList.add("active");
    dots[i].classList.add("active");
  };
  const start = () => {
    if (!reduceMotionGallery) timer = setInterval(() => show(i + 1), SLIDE_MS);
  };
  const stop = () => clearInterval(timer);
  const reduceMotionGallery = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  dots.forEach((d, n) =>
    d.addEventListener("click", () => {
      stop();
      show(n);
      start();
    }),
  );
  gallery.addEventListener("mouseenter", stop);
  gallery.addEventListener("mouseleave", start);
  start();
});
