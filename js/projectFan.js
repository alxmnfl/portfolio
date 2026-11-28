// ---------- Projects: fanned card stack (active card in front, neighbours tilted behind) ----------
const fan = document.querySelector("[data-fan]");
if (fan) {
  const cards = [...fan.querySelectorAll(".fan-card")];
  const count = document.querySelector("[data-fan-count]");
  let active = 0;

  const layout = () => {
    const n = cards.length;
    cards.forEach((card, i) => {
      const off = (i - active + n) % n;
      const pos = off === 0 ? "active" : off === 1 ? "next" : off === n - 1 ? "prev" : "hidden";
      const isActive = pos === "active";
      card.dataset.pos = pos;
      card.setAttribute("aria-hidden", String(!isActive));
      card.querySelectorAll("a, button").forEach((el) => (el.tabIndex = isActive ? 0 : -1));
    });
    count.textContent = `${active + 1} / ${n}`;
  };
  const go = (i) => {
    active = (i + cards.length) % cards.length;
    layout();
  };

  // A click on a background card brings it forward instead of following its links.
  cards.forEach((card, i) =>
    card.addEventListener(
      "click",
      (e) => {
        if (card.dataset.pos === "active") return;
        e.preventDefault();
        e.stopPropagation();
        go(i);
      },
      true,
    ),
  );
  document.querySelector("[data-fan-prev]").addEventListener("click", () => go(active - 1));
  document.querySelector("[data-fan-next]").addEventListener("click", () => go(active + 1));
  layout();
}
