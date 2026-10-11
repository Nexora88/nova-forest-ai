/* Accessible, bilingual navigation shared by every NexoraWildfire page. */
(() => {
  function initNavigation() {
    document.querySelectorAll('body > nav:not([aria-label="Personal workspace shortcuts"])').forEach((nav, index) => {
      if (nav.dataset.nxReady === "true") return;
      nav.dataset.nxReady = "true";
      nav.classList.add("nx-nav");
      const links = Array.from(nav.querySelectorAll(":scope > a"));
      if (!links.length) return;

      if (!nav.id) nav.id = "nx-nav-" + index;
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "nx-nav-toggle";
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", nav.id);
      toggle.innerHTML = '<span aria-hidden="true">☰</span><span class="nx-nav-toggle-label"></span>';
      const more = document.createElement("div");
      more.className = "nx-nav-more";
      const moreToggle = document.createElement("button");
      moreToggle.type = "button";
      moreToggle.className = "nx-nav-more-toggle";
      moreToggle.setAttribute("aria-expanded", "false");
      const moreLabel = document.createElement("span");
      const moreChevron = document.createElement("span");
      moreChevron.setAttribute("aria-hidden", "true");
      moreChevron.textContent = "▾";
      moreToggle.append(moreLabel, document.createTextNode(" "), moreChevron);
      const moreLinks = document.createElement("div");
      moreLinks.className = "nx-nav-more-links";
      moreLinks.id = "nx-nav-more-links-" + index;
      moreToggle.setAttribute("aria-controls", moreLinks.id);
      links.forEach((link, i) => {
        if (i < Math.min(3, links.length)) nav.appendChild(link);
        else moreLinks.appendChild(link);
      });
      more.append(moreToggle, moreLinks);
      nav.insertBefore(toggle, nav.firstChild);
      if (moreLinks.children.length) nav.appendChild(more);

      function syncLabels() {
        const lang = document.documentElement.dataset.language || document.documentElement.lang || "tr";
        const tr = /^tr(?:-|$)/i.test(lang);
        const open = nav.classList.contains("nx-nav-open");
        toggle.querySelector(".nx-nav-toggle-label").textContent = tr ? (open ? "Kapat" : "Menü") : (open ? "Close" : "Menu");
        toggle.setAttribute("aria-label", tr ? (open ? "Menüyü kapat" : "Menüyü aç") : (open ? "Close menu" : "Open menu"));
        moreLabel.textContent = tr ? "Diğer" : "More";
        moreToggle.setAttribute("aria-label", tr ? "Diğer menü bağlantıları" : "More navigation links");
      }
      function closeMenu() {
        nav.classList.remove("nx-nav-open");
        more.classList.remove("nx-nav-more-open");
        document.body.classList.remove("nx-menu-open");
        document.body.style.overflow = "";
        document.body.style.overscrollBehavior = "";
        toggle.setAttribute("aria-expanded", "false");
        moreToggle.setAttribute("aria-expanded", "false");
        syncLabels();
      }
      toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("nx-nav-open");
        document.body.classList.toggle("nx-menu-open", open);
        document.body.style.overflow = open ? "hidden" : "";
        document.body.style.overscrollBehavior = open ? "none" : "";
        toggle.setAttribute("aria-expanded", String(open));
        syncLabels();
      });
      moreToggle.addEventListener("click", () => {
        const open = more.classList.toggle("nx-nav-more-open");
        moreToggle.setAttribute("aria-expanded", String(open));
      });
      nav.addEventListener("click", event => {
        if (event.target.closest("a") && nav.classList.contains("nx-nav-open")) closeMenu();
      });
      nav.addEventListener("keydown", event => {
        if (event.key === "Escape") {
          closeMenu();
          toggle.focus();
        }
      });
      window.addEventListener("nexora:languagechange", syncLabels);
      syncLabels();
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initNavigation, { once: true });
  else initNavigation();
})();
