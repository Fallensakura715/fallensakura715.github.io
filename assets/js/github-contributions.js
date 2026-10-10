(() => {
    const dayMillis = 86400000;

    document.querySelectorAll("[data-github-contributions]").forEach((section, index) => {
        const labels = JSON.parse(section.dataset.labels);
        const locale = section.dataset.locale;
        const dateFormat = new Intl.DateTimeFormat(locale, { dateStyle: "long", timeZone: "UTC" });
        const monthFormat = new Intl.DateTimeFormat(locale, { month: "short", timeZone: "UTC" });
        const weekFormat = new Intl.DateTimeFormat(locale, { weekday: "short", timeZone: "UTC" });
        const numberFormat = new Intl.NumberFormat(locale);
        const status = section.querySelector("[data-github-status]");
        const retry = section.querySelector("[data-github-retry]");
        const scroll = section.querySelector(".github-contributions__scroll");
        const calendar = section.querySelector("[data-github-calendar]");
        const footer = section.querySelector("[data-github-footer]");
        const tooltip = document.createElement("div");
        tooltip.id = `github-contribution-tooltip-${index}`;
        tooltip.className = "github-contributions__tooltip";
        tooltip.setAttribute("role", "tooltip");
        tooltip.hidden = true;
        document.body.appendChild(tooltip);
        let activeDay = null;
        let cells = [];

        const hideTooltip = () => {
            tooltip.hidden = true;
            activeDay?.removeAttribute("aria-describedby");
            activeDay = null;
        };

        const showTooltip = (day) => {
            hideTooltip();
            activeDay = day;
            day.setAttribute("aria-describedby", tooltip.id);
            tooltip.textContent = day.getAttribute("aria-label");
            tooltip.hidden = false;
            const anchor = day.getBoundingClientRect();
            const bounds = tooltip.getBoundingClientRect();
            const left = Math.max(8, Math.min(anchor.x + anchor.width / 2 - bounds.width / 2, innerWidth - bounds.width - 8));
            const above = anchor.top - bounds.height - 8;
            const top = above >= 8 ? above : anchor.bottom + 8;
            tooltip.style.left = `${left}px`;
            tooltip.style.top = `${Math.min(top, innerHeight - bounds.height - 8)}px`;
        };

        const dayFromEvent = (event) => event.target.closest("button[data-date]");
        calendar.addEventListener("pointerover", (event) => {
            const day = dayFromEvent(event);
            if (day) showTooltip(day);
        });
        calendar.addEventListener("pointerout", hideTooltip);
        calendar.addEventListener("focusin", (event) => {
            const day = dayFromEvent(event);
            if (day) showTooltip(day);
        });
        calendar.addEventListener("focusout", hideTooltip);
        calendar.addEventListener("click", (event) => {
            const day = dayFromEvent(event);
            if (day) showTooltip(day);
        });
        document.addEventListener("pointerdown", (event) => {
            if (!calendar.contains(event.target)) hideTooltip();
        });
        document.addEventListener("keydown", (event) => {
            if (event.key === "Escape") hideTooltip();
        });
        window.addEventListener("scroll", () => {
            if (activeDay && activeDay === document.activeElement) {
                const bounds = activeDay.getBoundingClientRect();
                const viewport = scroll.getBoundingClientRect();
                if (bounds.top >= 0 && bounds.bottom <= innerHeight
                    && bounds.left >= viewport.left && bounds.right <= viewport.right) {
                    showTooltip(activeDay);
                    return;
                }
            }
            hideTooltip();
        }, true);
        window.addEventListener("resize", hideTooltip);
        calendar.addEventListener("keydown", (event) => {
            const day = dayFromEvent(event);
            if (!day) return;
            const current = cells.indexOf(day);
            const offsets = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
            let next;
            if (event.key in offsets) next = current + offsets[event.key];
            else if (event.key === "Home") next = current - new Date(`${day.dataset.date}T00:00:00Z`).getUTCDay();
            else if (event.key === "End") next = current + 6 - new Date(`${day.dataset.date}T00:00:00Z`).getUTCDay();
            else return;
            event.preventDefault();
            next = Math.max(0, Math.min(cells.length - 1, next));
            cells.forEach((cell) => { cell.tabIndex = -1; });
            cells[next].tabIndex = 0;
            cells[next].focus({ preventScroll: true });
            cells[next].scrollIntoView({ block: "nearest", inline: "nearest" });
            showTooltip(cells[next]);
        });

        const render = (data) => {
            if (!Array.isArray(data.contributions) || !data.contributions.length) throw new Error("Missing contribution days");
            const days = data.contributions.slice().sort((a, b) => a.date.localeCompare(b.date));
            for (const [dayIndex, day] of days.entries()) {
                const timestamp = Date.parse(`${day.date}T00:00:00Z`);
                if (!/^\d{4}-\d{2}-\d{2}$/.test(day.date) || !Number.isFinite(timestamp)
                    || !Number.isInteger(day.count) || day.count < 0
                    || !Number.isInteger(day.level) || day.level < 0 || day.level > 4
                    || (dayIndex && timestamp - Date.parse(`${days[dayIndex - 1].date}T00:00:00Z`) !== dayMillis)) {
                    throw new Error("Invalid contribution day");
                }
            }
            const firstDate = new Date(`${days[0].date}T00:00:00Z`);
            const padding = firstDate.getUTCDay();
            const weeks = Math.ceil((padding + days.length) / 7);
            const months = document.createElement("div");
            months.className = "github-contributions__months";
            const weekdays = document.createElement("div");
            weekdays.className = "github-contributions__weekdays";
            weekdays.setAttribute("aria-hidden", "true");
            for (const weekday of [1, 3, 5]) {
                const label = document.createElement("span");
                label.style.gridRow = weekday + 1;
                label.textContent = weekFormat.format(new Date(Date.UTC(2024, 0, 7 + weekday)));
                weekdays.appendChild(label);
            }
            const grid = document.createElement("div");
            grid.className = "github-contributions__days";
            cells = days.map((day, dayIndex) => {
                const date = new Date(`${day.date}T00:00:00Z`);
                const column = Math.floor((padding + dayIndex) / 7) + 1;
                if (dayIndex === 0 || date.getUTCDate() === 1) {
                    const label = document.createElement("span");
                    label.style.gridColumn = column;
                    label.textContent = monthFormat.format(date);
                    months.appendChild(label);
                }
                const cell = document.createElement("button");
                cell.type = "button";
                cell.className = "github-contributions__day";
                // GitHub supplies data-level 0–4; preserve those levels without inventing count thresholds.
                cell.dataset.level = day.level;
                cell.dataset.date = day.date;
                cell.dataset.count = day.count;
                cell.style.gridColumn = column;
                cell.style.gridRow = date.getUTCDay() + 1;
                cell.tabIndex = dayIndex === days.length - 1 ? 0 : -1;
                const template = day.count === 0 ? labels.dayZero : day.count === 1 ? labels.dayOne : labels.dayOther;
                cell.setAttribute("aria-label", template.replace("{date}", dateFormat.format(date)).replace("{count}", numberFormat.format(day.count)));
                grid.appendChild(cell);
                return cell;
            });
            const total = days.reduce((sum, day) => sum + day.count, 0);
            section.querySelector("[data-github-summary]").textContent = labels.summary.replace("{count}", numberFormat.format(total));
            calendar.style.setProperty("--contribution-weeks", weeks);
            calendar.replaceChildren(months, weekdays, grid);
            status.hidden = true;
            scroll.hidden = false;
            footer.hidden = false;
            scroll.scrollLeft = scroll.scrollWidth;
        };

        const load = async () => {
            retry.hidden = true;
            status.hidden = false;
            status.textContent = labels.loading;
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000);
            try {
                const url = `https://github-contributions-api.jogruber.de/v4/${encodeURIComponent(section.dataset.username)}?y=last`;
                const response = await fetch(url, { signal: controller.signal, credentials: "omit" });
                if (!response.ok) throw new Error(`HTTP ${response.status}`);
                render(await response.json());
            } catch {
                status.textContent = labels.error;
                retry.hidden = false;
            } finally {
                clearTimeout(timeout);
            }
        };
        retry.addEventListener("click", load);
        load();
    });
})();
