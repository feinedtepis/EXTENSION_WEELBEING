
let start_time = null;
let current_tab = null;
let time_elapsed = 0;
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

            start = end;
        }
    }

    start_time = now;

    await browser.storage.local.set({ usage });
}

async function getActiveTab() {
    let windows = await browser.windows.getAll();

    let focusedWindow = windows.find(win => win.focused);

    if (!focusedWindow) return null;

    let tabs = await browser.tabs.query({
        active: true,
        windowId: focusedWindow.id
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
        start_time = Date.now();
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
        start_time = Date.now();
    } else {
        current_tab = null;
        current_website = null;
        start_time = null;
    }
}

browser.tabs.onActivated.addListener(() => {
    run(async () => {
        await switchTab();
    });
});

browser.tabs.onUpdated.addListener((tabId, changeInfo) => {
    if (!changeInfo.url) return;

    run(async () => {
        if (tabId === current_tab) {
            let website = getWebsite(changeInfo.url);

            if (website !== current_website) {
                await saveTime();
                current_website = website;
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

browser.windows.onFocusChanged.addListener(() => {
    run(async () => {
        await switchTab();
    });
});

browser.runtime.onMessage.addListener((message) => {
    if (message === "getUsage") {
        return run(async () => {
            await saveTime();

            let today = getDate();

            return { ...(usage[today] || {}) };
        });
    }

    return false;
});
