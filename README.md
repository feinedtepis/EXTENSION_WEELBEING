Digital Wellbeing for Firefox

A lightweight, privacy-first Firefox extension (Manifest V3) that tracks how much time you spend on websites and visualizes your daily browsing habits with interactive bar charts.

Features

Real-Time Active Tab Tracking: Counts time only when a normal Firefox window is focused and active, pausing automatically when you switch to another app.

7-Day Local History: Automatically rolls over at midnight and retains the last 7 days of usage data locally via browser.storage.local—no accounts, cloud sync, or external servers.

Sorted Daily Breakdown: Displays websites sorted from highest to lowest time spent, along with percentage tooltips and total daily screen time.

Keyboard & Button Navigation: Step through previous days using the ← / → header buttons, and scroll smoothly across sites using your keyboard's Left and Right arrow keys.

Installation

Option 1: Install Permanently via Mozilla Add-ons (Recommended)

Standard Firefox builds require add-ons to be signed by Mozilla to stay installed across browser restarts.

Download or clone this repository.

Open manifest.json and change browser_specific_settings.gecko.id to a unique add-on ID of your own (e.g., "digital-wellbeing@yourname.addon").

Open the project folder and zip the files directly (manifest.json, background.js, popup.html, popup.js)—make sure manifest.json is at the root of the .zip, not inside a subfolder:

# Mac / Linux
zip -r ../digital-wellbeing.zip .

# Windows (PowerShell)
Compress-Archive -Path * -DestinationPath ../digital-wellbeing.zip


Go to the Mozilla Add-on Developer Hub, sign in, and click Submit a New Add-on.

Choose "On your own" (self-distribution) and upload your .zip file.

Once Mozilla's automated validator finishes signing (~1–2 minutes), go to Manage Status & Versions, download the generated .xpi file, and drag-and-drop it into any Firefox window to install permanently.

Option 2: Install Unsigned (Firefox Developer Edition / Nightly)

Open about:config in Firefox and accept the warning.

Search for xpinstall.signatures.required and set it to false.

Zip the 4 extension files at the root level and rename the archive from .zip to .xpi.

Open about:addons, click the gear icon (⚙️) → Install Add-on From File..., and select your .xpi file.

Option 3: Temporary Load (For Testing / Development)

Open about:debugging#/runtime/this-firefox in Firefox.

Click Load Temporary Add-on... and select manifest.json from this folder.
(Note: Temporary add-ons are removed when Firefox closes.)

Project Structure

├── manifest.json   # Extension configuration, permissions (tabs, storage), and Gecko ID
├── background.js   # Tracks active tabs, window focus, midnight rollovers, and 5s checkpoints
├── popup.html      # Popup layout, Google Fonts, and dark theme styling
└── popup.js        # Renders sorted daily charts, day switcher, and arrow-key scrolling


Privacy

All browsing data stays strictly on your device inside Firefox's local extension storage (browser.storage.local). Nothing is collected, logged externally, or transmitted over the network.
