// ---------- Active nav link while scrolling ----------
const sections = [...document.querySelectorAll("section[id]")];
const linkFor = (id) => navLinks.querySelector(`a[href="#${id}"]`);

const activeObserver = new IntersectionObserver(
  (entries) => {
    entries.forEach((e) => {
      if (e.isIntersecting) {
        navLinks
          .querySelectorAll("a")
          .forEach((a) => a.classList.remove("active"));
        linkFor(e.target.id)?.classList.add("active");
      }
    });
  },
  { rootMargin: "-45% 0px -50% 0px" },
);
sections.forEach((s) => activeObserver.observe(s));

