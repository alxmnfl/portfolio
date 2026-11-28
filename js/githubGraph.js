// ---------- GitHub contributions dot graph (last year) ----------
// Data: github-contributions-api.jogruber.de (public, CORS-enabled mirror of the
// GitHub contribution calendar). One dot per day, one column per week.
const gh = document.querySelector("[data-gh-user]");
if (gh) {
  const user = gh.dataset.ghUser;
  const grid = gh.querySelector("[data-gh-grid]");
  const total = gh.querySelector("[data-gh-total]");

  fetch(`https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(user)}?y=last`)
    .then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    })
    .then(({ total: t, contributions: days }) => {
      const frag = document.createDocumentFragment();
      // pad the first column so each row is one weekday (Sunday on top)
      const lead = new Date(`${days[0].date}T00:00:00`).getDay();
      for (let i = 0; i < lead; i++) {
        const pad = document.createElement("span");
        pad.className = "pad";
        frag.append(pad);
      }
      for (const d of days) {
        const cell = document.createElement("span");
        cell.dataset.l = d.level;
        cell.title = `${d.count} contribution${d.count === 1 ? "" : "s"} on ${d.date}`;
        frag.append(cell);
      }
      grid.append(frag);
      total.textContent = `${t.lastYear.toLocaleString("en-US")} contributions in the last year`;
    })
    .catch(() => {
      total.innerHTML = `Couldn't load contributions. <a href="https://github.com/${user}" target="_blank" rel="noopener">See them on GitHub</a>`;
    });
}
