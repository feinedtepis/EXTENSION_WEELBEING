let currentIndex = -1; // -1 means "default to the latest day on first load"

// Hide scrollbar visually while keeping horizontal scroll active
const hideScrollStyle = document.createElement("style");
hideScrollStyle.textContent = `
    .bars-row {
        scrollbar-width: none;
        -ms-overflow-style: none;
    }
    .bars-row::-webkit-scrollbar {
        display: none;
    }
`;
document.head.appendChild(hideScrollStyle);

function formatTime(ms) {
    const sec = Math.floor(ms / 1000);
    if (sec < 60) return `${sec}s`;
    const min = Math.floor(sec / 60);
    if (min < 60) return `${min}m`;
    return `${Math.floor(min / 60)}h ${min % 60}m`;
}

function getTodayStr() {
    const now = new Date();
    return now.getFullYear() + "-" +
        String(now.getMonth() + 1).padStart(2, "0") + "-" +
        String(now.getDate()).padStart(2, "0");
}

function siteDashboard(day, total, dayUsage) {
    let pct = {};

    for (let [site, time] of Object.entries(dayUsage)) {
        pct[site] = total > 0 ? (time * 100) / total : 0;
    }

    const container = document.querySelector(".container");
    let dayBox = Array.from(container.children).find(el => el.dataset.day === day);

    if (!dayBox) {
        dayBox = document.createElement("div");
        dayBox.dataset.day = day;
        dayBox.style.display = "flex";
        dayBox.style.flexDirection = "column";
        dayBox.style.alignItems = "center";
        dayBox.style.width = "100%";

        const header = document.createElement("div");
        header.className = "day-header";

        const dateObj = new Date(day + "T00:00:00");
        const dayMonth = dateObj.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
        const weekday = dateObj.toLocaleDateString("en-GB", { weekday: "short" });

        if (day === getTodayStr()) {
            header.textContent = `Today · ${dayMonth}, ${weekday}`;
        } else {
            header.textContent = `${dayMonth}, ${weekday}`;
        }

        const totalEl = document.createElement("div");
        totalEl.className = "day-total";

        const barsRow = document.createElement("div");
        barsRow.className = "bars-row";
        barsRow.style.display = "flex";
        barsRow.style.flexDirection = "row";
        barsRow.style.alignItems = "flex-end";
        barsRow.style.justifyContent = "flex-start";
        barsRow.style.overflowX = "auto";
        barsRow.style.scrollBehavior = "smooth";
        barsRow.style.gap = "12px";
        barsRow.style.height = "150px";
        barsRow.style.width = "fit-content";
        barsRow.style.maxWidth = "100%";
        barsRow.style.margin = "0 auto";
        barsRow.style.paddingBottom = "6px";

        dayBox.appendChild(header);
        dayBox.appendChild(totalEl);
        dayBox.appendChild(barsRow);
        container.appendChild(dayBox);
    }

    // Index 0 = header, Index 1 = totalEl, Index 2 = barsRow
    const totalEl = dayBox.children[1];
    const barsRow = dayBox.children[2];

    totalEl.textContent = formatTime(total);

    const sortedSites = Object.entries(dayUsage).sort((a, b) => b[1] - a[1]);

    for (let [site, time] of sortedSites) {
        let item = Array.from(barsRow.children).find(el => el.dataset.site === site);

        if (!item) {
            item = document.createElement("div");
            item.dataset.site = site;
            item.style.flexShrink = "0";
            item.style.minWidth = "44px";
            item.style.height = "100%";
            item.style.display = "flex";
            item.style.flexDirection = "column";
            item.style.alignItems = "center";
            item.style.justifyContent = "flex-end";

            const barTrack = document.createElement("div");
            barTrack.style.flex = "1";
            barTrack.style.display = "flex";
            barTrack.style.alignItems = "flex-end";

            const itembody = document.createElement("div");
            itembody.className = "bar-body";

            const itemfooter = document.createElement("div");
            itemfooter.style.marginTop = "6px";
            itemfooter.style.textAlign = "center";

            barTrack.appendChild(itembody);
            item.appendChild(barTrack);
            item.appendChild(itemfooter);
        }

        // Moves existing element to the end so DOM order stays sorted live
        barsRow.appendChild(item);

        const itembody = item.children[0].children[0];
        const itemfooter = item.children[1];

        itembody.style.height = `${pct[site]}%`;
        itembody.title = `${site}: ${formatTime(time)} (${Math.round(pct[site])}%)`;

        itemfooter.innerHTML = `
            <div class="bar-time">${formatTime(time)}</div>
            <div class="bar-site">${site.split(".")[0]}</div>
        `;
    }

    for (let item of Array.from(barsRow.children)) {
        if (!(item.dataset.site in dayUsage)) {
            item.remove();
        }
    }
}

function showCurrentDay() {
    const arr = document.querySelector(".container").children;
    const n = arr.length;
    if (n === 0) return;

    if (currentIndex === -1 || currentIndex >= n) {
        currentIndex = n - 1;
    }

    for (let i = 0; i < n; i++) {
        arr[i].style.display = i === currentIndex ? "flex" : "none";
    }
}

async function usage() {
    let data = await browser.runtime.sendMessage("getUsage");
    let total = {};

    const sortedDays = Object.keys(data).sort();

    for (let day of sortedDays) {
        total[day] = 0;
        for (let time of Object.values(data[day])) {
            total[day] += time;
        }
    }

    for (let day of sortedDays) {
        siteDashboard(day, total[day], data[day]);
    }

    showCurrentDay();
}

const mahead = document.querySelector(".ahead");
const mback = document.querySelector(".back");

if (mahead) {
    mahead.addEventListener("click", () => {
        const n = document.querySelector(".container").children.length;
        if (currentIndex < n - 1) {
            currentIndex++;
            showCurrentDay();
        }
    });
}

if (mback) {
    mback.addEventListener("click", () => {
        if (currentIndex > 0) {
            currentIndex--;
            showCurrentDay();
        }
    });
}

// Scroll bars horizontally with Left/Right arrow keys
document.body.tabIndex = -1;
document.body.focus();

document.addEventListener("keydown", (e) => {
    const arr = document.querySelector(".container").children;
    const activeDayBox = arr[currentIndex];
    if (!activeDayBox) return;

    const barsRow = activeDayBox.children[2];
    if (!barsRow) return;

    if (e.key === "ArrowRight") {
        e.preventDefault();
        barsRow.scrollBy({ left: 120, behavior: "smooth" });
    } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        barsRow.scrollBy({ left: -120, behavior: "smooth" });
    }
});

usage();

setInterval(() => {
    usage();
}, 1000);