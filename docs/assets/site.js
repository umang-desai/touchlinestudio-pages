(() => {
  const tabButtons = Array.from(document.querySelectorAll("[data-tab-button]"));
  const tabPanels = Array.from(document.querySelectorAll("[data-tab-panel]"));
  if (tabButtons.length === 0 || tabPanels.length === 0) return;

  const setActive = (tabName) => {
    tabButtons.forEach((button) => {
      const isSelected = button.getAttribute("data-tab-button") === tabName;
      button.setAttribute("aria-selected", String(isSelected));
    });

    tabPanels.forEach((panel) => {
      const isActive = panel.getAttribute("data-tab-panel") === tabName;
      panel.classList.toggle("active", isActive);
    });
  };

  tabButtons.forEach((button) => {
    button.addEventListener("click", () => setActive(button.getAttribute("data-tab-button")));
  });

  setActive("iphone");
})();

