$(document).ready(function() {
    $("#callsign").text(" "+localStorage.callsign);
});

var websocket = new WebSocket("wss://"+window.location.host+"/ws");
websocket.onopen = function(evt) {
    console.log("WS Opened");
};

function regularTime(time) {
    if(time < 10) {
        return "0"+time;
    }
    return time;
}

var ptimer = -1;
var ptimer_start = -1;
websocket.onmessage = function(evt) {
    let data = JSON.parse(evt.data);
    switch(data.event) {
        case 'hello':
            websocket.send(JSON.stringify({event: "ident", callsign: localStorage.callsign}));
            setInterval(function() {
                websocket.send(JSON.stringify({event: "heartbeat"}));
            }, data.heartbeat_interval);
            break;
        case 'info':
            ptimer = data.ptimer;
            ptimer_start = data.ptimer_start;
            $(".loading-icon").css("display", "none");
            setInterval(function() {
                if(ptimer === -1) {
                    $("#ptimer").text(" ACTIVE PRIORITY");
                } else {
                    var minutes = Math.floor(ptimer/60000);
                    var seconds = (ptimer/1000)-((minutes*60000)/1000);
                    $("#ptimer").text(" "+regularTime(minutes)+":"+regularTime(seconds));
                }
                if(ptimer <= 0) return;
                ptimer -= 1000;
            }, 1000);
            break;
        case 'sig100':
            if(data.enable) {
                ptimer = -1;
            } else {
                ptimer = ptimer_start;
            }
            break;
    }
};

websocket.onclose = function() {
    window.location = "/unavailable";
};

window.onbeforeunload = function(event) {
    websocket.close();
};