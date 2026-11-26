// ---------- Typing effect ----------
const roles = ["Back-End Developer", "PHP", "Laravel", "MySQL", "REST APIs"];
const typed = document.getElementById("typed");
let roleIdx = 0,
  charIdx = 0,
  deleting = false;

function type() {
  const word = roles[roleIdx];
  typed.textContent = word.slice(0, charIdx);
  if (!deleting && charIdx < word.length) {
    charIdx++;
    setTimeout(type, 70);
  } else if (!deleting && charIdx === word.length) {
    deleting = true;
    setTimeout(type, 1800);
  } else if (deleting && charIdx > 0) {
    charIdx--;
    setTimeout(type, 40);
  } else {
    deleting = false;
    roleIdx = (roleIdx + 1) % roles.length;
    setTimeout(type, 300);
  }
}
if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
  charIdx = roles[0].length;
  setTimeout(type, 2000);
}

