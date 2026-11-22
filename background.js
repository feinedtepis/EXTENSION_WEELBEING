let start_time = null;
let current_tab = null;
let usage = {};
let current_website = null;

function getDate(date = new Date()) {
    return date.getFullYear() + "-" +
        String(date.getMonth() + 1).padStart(2, "0") + "-" +
        String(date.getDate()).padStart(2, "0");
}

function getWebsite(url) {
    try {
        let parsed = new URL(url);
        if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
            return null;
        }
        return parsed.hostname.replace(/^www\./, "");
    } catch {
        return null;
    }
}

async function saveTime() {
    let now = Date.now();

    if (current_website != null && start_time != null) {
        let start = start_time;

        while (start < now) {
            let date = new Date(start);
            let today = getDate(date);

            let nextMidnight = new Date(
                date.getFullYear(),
                date.getMonth(),
                date.getDate() + 1
            ).getTime();

            let end = Math.min(now, nextMidnight);

            usage[today] = usage[today] || {};
            usage[today][current_website] =
                (usage[today][current_website] || 0) + (end - start);

            // Keep only the most recent 7 days
            const days = Object.keys(usage).sort();
            while (days.length > 7) {
                delete usage[days.shift()];
            }

            start = end;
        }
    }

    start_time = current_website != null ? now : null;
    await browser.storage.local.set({ usage });
}

async function getActiveTab() {
    let win = await browser.windows.getLastFocused({ windowTypes: ["normal"] }).catch(() => null);
    if (!win || !win.focused) return null;

    let tabs = await browser.tabs.query({
        active: true,
        windowId: win.id
    });

    return tabs.length > 0 ? tabs[0] : null;
}

async function initialize() {
    let data = await browser.storage.local.get("usage");
    usage = data.usage || {};

    let tab = await getActiveTab();
    if (tab != null) {
        current_tab = tab.id;
        current_website = getWebsite(tab.url);
        start_time = current_website != null ? Date.now() : null;
    }
}

let ready = initialize();
let queue = Promise.resolve();

function run(task) {
    let result = queue.then(async () => {
        await ready;
        return await task();
    });

    queue = result.catch(console.error);
    return result;
}

async function switchTab() {
    await saveTime();

    let tab = await getActiveTab();
    if (tab != null) {
        current_tab = tab.id;
        current_website = getWebsite(tab.url);
        start_time = current_website != null ? Date.now() : null;
    } else {
        current_tab = null;
        current_website = null;
        start_time = null;
    }
}

browser.tabs.onActivated.addListener(() => run(switchTab));

browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (!changeInfo.url) return;

    run(async () => {
        if (tabId === current_tab) {
            let website = getWebsite(changeInfo.url);

            if (website !== current_website) {
                await saveTime();
                current_website = website;
                start_time = current_website != null ? Date.now() : null;
            }
        }
    });
});

browser.tabs.onRemoved.addListener((tabId) => {
    run(async () => {
        if (tabId === current_tab) {
            await switchTab();
        }
    });
});

browser.windows.onFocusChanged.addListener((windowId) => {
    run(async () => {
        if (windowId === browser.windows.WINDOW_ID_NONE) {
            // User switched away from Firefox to another application
            await saveTime();

            current_tab = null;
            current_website = null;
            start_time = null;
            return;
        }

        // Ignore popup/devtools windows so opening the extension popup doesn't pause tracking
        let win = await browser.windows.get(windowId).catch(() => null);
        if (!win || win.type !== "normal") return;

        // Firefox regained focus
        await switchTab();
    });
});

// Checkpoint every 5 seconds & self-heal if focus state recovered
setInterval(() => {
    run(async () => {
        let tab = await getActiveTab();
        let website = tab ? getWebsite(tab.url) : null;

        if (website === current_website && current_website != null) {
            await saveTime();
        } else if (website !== current_website) {
            await switchTab();
        }
    });
}, 5000);

browser.runtime.onMessage.addListener((message) => {
    if (message === "getUsage") {
        return run(async () => {
            await saveTime();
            return structuredClone(usage || {});
        });
    }
    return false;
});