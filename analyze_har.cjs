const fs = require('fs');
try {
    const data = JSON.parse(fs.readFileSync('C:\\\\Users\\\\USER\\\\Downloads\\\\localhost.har', 'utf8'));
    const entries = data.log.entries;
    const stats = {};
    
    entries.forEach(e => {
        const url = e.request.url.split('?')[0];
        const time = e.time || 0;
        if(!stats[url]) stats[url] = {count: 0, totalTime: 0, maxTime: 0};
        stats[url].count++;
        stats[url].totalTime += time;
        if(time > stats[url].maxTime) stats[url].maxTime = time;
    });
    
    const sorted = Object.entries(stats).sort((a,b) => b[1].totalTime - a[1].totalTime);
    console.log('Top 15 endpoints by total time:');
    sorted.slice(0, 15).forEach(([url, stat]) => {
        console.log(`${url}`);
        console.log(`  Count: ${stat.count}, Total Time: ${stat.totalTime.toFixed(0)}ms, Max Time: ${stat.maxTime.toFixed(0)}ms, Avg Time: ${(stat.totalTime/stat.count).toFixed(0)}ms`);
    });
} catch (e) {
    console.error("Error:", e);
}
