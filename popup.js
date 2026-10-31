async function usage(){
    let usage= await browser.runtime.sendMessage("getUsage");
    let total=0;
    for(let time of Object.values(usage)){
        total+=time;
    }
    document.getElementById("total-time").textContent
    = (total/60000).toFixed(1)+"min"
    let container=document.getElementById("tab-list");
    container.innerHTML="";
    for (let [tabId, time] of Object.entries(usage)){
        let tab=document.createElement("div");
        tab.className="tab";
        let percentage=total>0?(time/total)*100:0;
            tab.innerHTML = `
            <div class="tab-name">
                <span>Tab ${tabId}</span>
                <span>${(time / 1000).toFixed(1)} sec</span>
            </div>
            <div class="bar">
                <div class="progress" style="width: ${percentage}%"></div>
            </div>
        `;
        container.appendChild(tab);
    }
}
usage();


setInterval(() => {
    usage();
}, 1000);