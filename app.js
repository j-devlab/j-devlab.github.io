const $ = (sel) => document.querySelector(sel);

const grid = $("#grid");
const search = $("#search");
const filter = $("#filter");
const projectCount = $("#projectCount");

const template = $("#cardTemplate");

let allProjects = [];
let activeTag = "all";

function normalize(str) {
  return (str || "").toLowerCase().trim();
}

function uniqueTags(projects) {
  const set = new Set();
  projects.forEach(p => (p.tags || []).forEach(t => set.add(t)));
  return Array.from(set).sort((a,b) => a.localeCompare(b));
}

function populateTagFilter(tags) {
  const existing = new Set(Array.from(filter.options).map(o => o.value));
  tags.forEach(tag => {
    if (existing.has(tag)) return;
    const opt = document.createElement("option");
    opt.value = tag;
    opt.textContent = tag;
    filter.appendChild(opt);
  });
}

function matches(project, q) {
  const hay = [
    project.title,
    project.description,
    (project.tags || []).join(" "),
    project.year
  ].map(normalize).join(" ");
  return hay.includes(q);
}

function render(projects) {
  grid.innerHTML = "";
  projectCount.textContent = String(projects.length);

  const frag = document.createDocumentFragment();

  projects.forEach((p, i) => {
    const node = template.content.cloneNode(true);

    const title = node.querySelector("[data-title]");
    const year = node.querySelector("[data-year]");
    const desc = node.querySelector("[data-desc]");
    const tagsWrap = node.querySelector("[data-tags]");

    const thumbImg = node.querySelector("[data-thumb]");
    const thumbLink = node.querySelector("[data-thumblink]");

    const demoLink = node.querySelector("[data-demolink]");
    const repoLink = node.querySelector("[data-repolink]");

    title.textContent = p.title || "Untitled";
    year.textContent = p.year || "";
    desc.textContent = p.description || "";

    // Tags
    (p.tags || []).forEach(t => {
      const s = document.createElement("span");
      s.className = "tag";
      s.textContent = t;
      tagsWrap.appendChild(s);
    });

    // Image + links
    thumbImg.src = p.image || "";
    thumbImg.alt = p.title ? `${p.title} preview` : "Project preview";

    const demo = p.demoUrl || p.repoUrl || "#";
    thumbLink.href = demo;
    demoLink.href = demo;

    if (p.repoUrl) {
      repoLink.href = p.repoUrl;
    } else {
      repoLink.style.display = "none";
    }

    // Stagger reveal
    const card = node.querySelector(".projCard");
    card.style.transitionDelay = `${Math.min(i * 55, 250)}ms`;

    frag.appendChild(node);
  });

  grid.appendChild(frag);
  observeReveals();
}

function applyFilters() {
  const q = normalize(search.value);
  const out = allProjects.filter(p => {
    const tagOk = activeTag === "all" || (p.tags || []).includes(activeTag);
    const qOk = !q || matches(p, q);
    return tagOk && qOk;
  });
  render(out);
}

async function loadProjects() {
  const res = await fetch("./projects.json", { cache: "no-store" });
  allProjects = await res.json();

  populateTagFilter(uniqueTags(allProjects));
  render(allProjects);
}

let revealObserver;
function observeReveals() {
  if (revealObserver) revealObserver.disconnect();

  const nodes = document.querySelectorAll(".reveal:not(.in)");
  revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (e.isIntersecting) {
        e.target.classList.add("in");
        revealObserver.unobserve(e.target);
      }
    });
  }, { threshold: 0.12 });

  nodes.forEach(n => revealObserver.observe(n));
}

// Smooth year
$("#year").textContent = String(new Date().getFullYear());

// Events
search.addEventListener("input", () => applyFilters());
filter.addEventListener("change", () => {
  activeTag = filter.value;
  applyFilters();
});

// Init
loadProjects().catch(err => {
  console.error(err);
  grid.innerHTML = `<div class="card" style="grid-column:1/-1;">
    <h3 class="title">Couldn’t load projects</h3>
    <p class="muted">Make sure <code>projects.json</code> exists in the repo root and is valid JSON.</p>
  </div>`;
  projectCount.textContent = "0";
});

