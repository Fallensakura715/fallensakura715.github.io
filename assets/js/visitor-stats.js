(() => {
    const config = document.currentScript;

    // Vercount updates one element per ID; mirror the footer totals in the sidebar.
    for (const metric of ["site_pv", "site_uv"]) {
        const source = document.getElementById(`vercount_value_${metric}`);
        if (!source) continue;
        const mirrors = document.querySelectorAll(`[data-vercount-value="${metric}"]`);
        const sync = () => mirrors.forEach((element) => {
            element.textContent = source.textContent;
        });
        sync();
        new MutationObserver(sync).observe(source, { childList: true, characterData: true, subtree: true });
    }

    // Keep local previews and alternate hosts out of the production counters.
    if (window.location.host !== config.dataset.siteHost) return;

    if (config.dataset.vercountSrc) {
        const counter = document.createElement("script");
        counter.src = config.dataset.vercountSrc;
        counter.async = true;
        document.head.appendChild(counter);
    }

    const map = document.querySelector("[data-visitor-map-id]");
    if (!map) return;
    const desktop = window.matchMedia("(min-width: 1024px)");
    const loadMap = () => {
        if (!desktop.matches || document.getElementById("mapmyvisitors")) return;
        const style = getComputedStyle(map);
        const toHex = (color, fallback) => {
            const rgb = color.match(/\d+/g);
            return rgb && rgb.length >= 3
                ? rgb.slice(0, 3).map((value) => Number(value).toString(16).padStart(2, "0")).join("")
                : fallback;
        };
        const url = new URL("https://mapmyvisitors.com/map.js");
        url.search = new URLSearchParams({
            d: map.dataset.visitorMapId,
            w: "a",
            t: "n",
            cl: "488ccc",
            co: toHex(style.backgroundColor, "ffffff"),
            ct: toHex(style.getPropertyValue("--card-text-color-secondary"), "808080"),
            cmo: "3acc3a",
            cmn: "ff5353"
        }).toString();
        const observer = new MutationObserver(() => {
            if (map.querySelector("#mapmyvisitors-widget")) {
                map.querySelector(".visitor-map-placeholder").hidden = true;
                observer.disconnect();
            }
        });
        observer.observe(map, { childList: true, subtree: true });
        const script = document.createElement("script");
        script.id = "mapmyvisitors";
        script.src = url.href;
        script.async = true;
        script.addEventListener("error", () => observer.disconnect(), { once: true });
        map.appendChild(script);
    };
    loadMap();
    desktop.addEventListener("change", loadMap);
})();
