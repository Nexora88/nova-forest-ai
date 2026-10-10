/* Accessible, compact navigation shared by every NexoraWildfire page. */
(() => {
  function initNavigation() {
    document.querySelectorAll("body > nav").forEach((nav, index) => {
      if (nav.dataset.nxReady === "true") return;
      nav.dataset.nxReady = "true";
      nav.classList.add("nx-nav");
      const links = Array.from(nav.querySelectorAll(":scope > a"));
      if (!links.length) return;

      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "nx-nav-toggle";
      toggle.setAttribute("aria-expanded", "false");
      toggle.setAttribute("aria-controls", "nx-nav-links-" + index);
      toggle.innerHTML = '<span aria-hidden="true">☰</span><span class="nx-nav-toggle-label">Menu</span>';
      const linksId = "nx-nav-links-" + index;
      const more = document.createElement("div");
      more.className = "nx-nav-more";
      const moreToggle = document.createElement("button");
      moreToggle.type = "button";
      moreToggle.className = "nx-nav-more-toggle";
      moreToggle.setAttribute("aria-expanded", "false");
      moreToggle.innerHTML = 'More <span aria-hidden="true">▾</span>';
      const moreLinks = document.createElement("div");
      moreLinks.className = "nx-nav-more-links";
      moreLinks.id = linksId;
      const keepPrimary = Math.min(3, links.length);
      links.forEach((link, i) => {
        if (i < keepPrimary) nav.appendChild(link);
        else moreLinks.appendChild(link);
      });
      more.append(moreToggle, moreLinks);
      nav.insertBefore(toggle, nav.firstChild);
      if (moreLinks.children.length) nav.appendChild(more);
      else more.remove();

      toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("nx-nav-open");
        document.body.classList.toggle("nx-menu-open", open);
        document.body.style.overflow = open ? "hidden" : "";
        document.body.style.overscrollBehavior = open ? "none" : "";
        toggle.setAttribute("aria-expanded", String(open));
        toggle.querySelector(".nx-nav-toggle-label").textContent = open ? "Close" : "Menu";
      });
      moreToggle.addEventListener("click", () => {
        const open = more.classList.toggle("nx-nav-more-open");
        moreToggle.setAttribute("aria-expanded", String(open));
      });
      nav.addEventListener("click", event => {
        if (event.target.closest("a") && nav.classList.contains("nx-nav-open")) {
          nav.classList.remove("nx-nav-open");
          document.body.classList.remove("nx-menu-open");
          document.body.style.overflow = "";
          document.body.style.overscrollBehavior = "";
          toggle.setAttribute("aria-expanded", "false");
        }
      });
      nav.addEventListener("keydown", event => {
        if (event.key === "Escape") {
          nav.classList.remove("nx-nav-open");
          more.classList.remove("nx-nav-more-open");
          document.body.classList.remove("nx-menu-open");
          document.body.style.overflow = "";
          document.body.style.overscrollBehavior = "";
          toggle.setAttribute("aria-expanded", "false");
          moreToggle.setAttribute("aria-expanded", "false");
          toggle.focus();
        }
      });
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initNavigation, {once:true});
  else initNavigation();
})();