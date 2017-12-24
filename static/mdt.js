var status1 = "10-42";
var status2 = "";

if("WebSocket" in window) {

} else {
    window.location = "/unsupported";
}

var websocket = new WebSocket("wss://"+window.location.host+"/ws");
var sign100initial = new Audio('/static/tones/1sig100.wav');
var sign100 = new Audio('/static/tones/1sig100.1.wav');
var callAttached = new Audio('/static/tones/callAttached.wav');

var current100 = -1;

function esc(text) {
    return $("<div>").text(text).html();
}

function play100tone() {
    sign100initial.play();
    if(current100 === -1) current100 = setInterval(function() {
        console.log("play");
        sign100.play();
    }, 30000);
}

function end100tone() {
    clearInterval(current100);
    current100 = -1;
}

websocket.onopen = function(evt) {
    console.log("WS Opened");
};

var currentCall = null;

websocket.onmessage = function(evt) {
    let data = JSON.parse(evt.data);
    if(data.event === "hello") {
        websocket.send(JSON.stringify({event: "ident", callsign: localStorage.callsign}));
        setInterval(function() {
            websocket.send(JSON.stringify({event: "heartbeat"}));
        }, 60000);
    }
    if(data.event === "info") {
        $(".loading-icon").css("display", "none");
        $("#std").prop("disabled", false);
        if(data.sig100) {
            play100tone();
            $(".sig100banner").css("display", "block");
        }
        if(data.st) {
            sign100initial.play();
            $(".stb").css("display", "block");
        }
        data.bolos.forEach(function(e) {
            $("#boloList").html($("#boloList").html()+"<div class=\"card activeBolo\" style='margin-top: 50px;'><div class=\"card-body\"><div class=\"row\"><div class=\"col\"><h4 class=\"card-title cardBoloType\">"+esc(e.type)+"</h4><pre class=\"cardBoloDescription\">"+esc(e.description)+"</pre></div><div class=\"col\" style=\"text-align: right;\"><span class=\"cardBoloID\" style=\"display: none;\">"+esc(e.id)+"</span><p>Last seen:<span class=\"cardBoloLastSeen\"> "+esc(e.last_seen)+"</span></p>Reason:<span class=\"cardBoloReason\"> "+esc(e.reason)+"</span></div></div></div></div>");
        });
        if(data.st) {
            sign100initial.play();
            $(".stb").css("display", "block");
        }
    } else if(data.event === "sig100") {
        if(data.enable) {
            play100tone();
            $(".sig100banner").css("display", "block");
        } else {
            end100tone();
            $(".sig100banner").css("display", "none");
        }
    } else if(data.event === "st") {
        if(data.enable) {
            sign100initial.play();
            $(".stb").css("display", "block");
        } else {
            $(".stb").css("display", "none");
        }
    } else if(data.event === "statusUpdate") {
        if(data.unit !== localStorage.callsign) return;
        switch(data.status) {
            case "10-41":
                status1 = "10-41";
                $("#std").parent().click();
                $("#status").html(" "+status1);
                break;
            case "10-42":
                $("#avail").parent().addClass("disabled");
                $("#busy").parent().addClass("disabled");
                $("#oos").parent().addClass("disabled");
                $("#avail").parent().removeClass("active");
                $("#busy").parent().removeClass("active");
                $("#oos").parent().removeClass("active");
                $("#etd").parent().click();
                $("#status").html(" "+status1);
                break;
            case "10-8":
                status2 = "10-8";
                $("#avail").parent().click();
                $("#status").html(" "+status2);
                if(currentCall !== null) {
                    currentCall = null;
                    $("#call_assignment").css('display', 'none');
                    $("#bolos").css('display', 'block');
                    $("#busy").parent().removeClass("disabled");
                    $("#oos").parent().removeClass("disabled");
                    $("#enroute").parent().removeClass("active");
                    $("#os").parent().removeClass("active");
                    $("#tran").parent().removeClass("active");
                    $("#enroute").parent().addClass("disabled");
                    $("#os").parent().addClass("disabled");
                    $("#tran").parent().addClass("disabled");
                }
                break;
            case "10-7":
                status2 = "10-7";
                $("#oos").parent().click();
                $("#status").html(" "+status2);
                break;
            case "10-6":
                status2 = "10-6";
                $("#busy").parent().click();
                $("#status").html(" "+status2);
                break;
            case "10-97":
                status2 = "10-97";
                $("#enroute").parent().click();
                $("#status").html(" "+status2);
                break;
            case "10-23":
                status2 = "10-23";
                $("#os").parent().click();
                $("#status").html(" "+status2);
                break;
            case "10-15":
                status2 = "10-15";
                $("#tran").parent().click();
                $("#status").html(" "+status2);
                break;
        }
    } else if(data.event === "assignCall") {
        if(data.unit !== localStorage.callsign) return;
        callAttached.play();
        $("#avail").parent().removeClass("active");
        $("#enroute").parent().removeClass("disabled");
        $("#os").parent().removeClass("disabled");
        $("#tran").parent().removeClass("disabled");
        $("#busy").parent().addClass("disabled");
        $("#oos").parent().addClass("disabled");
        $("#callOrigin").text("Origin: "+data.call.origin);
        $("#callNum").text("#"+data.call.id);
        $("#callTitle").text(data.call.type+" // "+data.call.title);
        $("#callLocation").text(data.call.location);
        $("#callDescription").text(data.call.description);
        $(".call-log").html("");
        data.call.log.forEach((e) => {
            var ts = new Date(e.timestamp);
            $(".call-log").html($(".call-log").html()+"<div class='call-log-entry'>["+esc(regularTime(ts.getUTCHours())+":"+regularTime(ts.getUTCMinutes()))+"] "+esc(e.info)+"</div>");
        });
        currentCall = data.call;
        $("#bolos").css('display', 'none');
        $("#call_assignment").css('display', 'block');
    } else if(data.event === "archiveCall") {
        if(currentCall !== null && currentCall.id == data.id) {
            currentCall = null;
            $("#call_assignment").css('display', 'none');
            $("#bolos").css('display', 'block');
            $("#busy").parent().removeClass("disabled");
            $("#oos").parent().removeClass("disabled");
            $("#enroute").parent().removeClass("active");
            $("#os").parent().removeClass("active");
            $("#tran").parent().removeClass("active");
            $("#enroute").parent().addClass("disabled");
            $("#os").parent().addClass("disabled");
            $("#tran").parent().addClass("disabled");
            $("#avail").click();
        }
    } else if(data.event === "editCall") {
        if(currentCall !== null && currentCall.id == data.call.id) {
            currentCall = data.call;
            $("#callTitle").text(data.call.type+" // "+data.call.title);
            $("#callLocation").text(data.call.location);
            $("#callDescription").text(data.call.description);
        }
    } else if(data.event === "createBolo") {
        $("#boloList").html($("#boloList").html()+"<div class=\"card activeBolo\" style='margin-top: 50px;'><div class=\"card-body\"><div class=\"row\"><div class=\"col\"><h4 class=\"card-title cardBoloType\">"+esc(data.type)+"</h4><pre class=\"cardBoloDescription\">"+esc(data.description)+"</pre></div><div class=\"col\" style=\"text-align: right;\"><span class=\"cardBoloID\" style=\"display: none;\">"+esc(data.id)+"</span><p>Last seen:<span class=\"cardBoloLastSeen\"> "+esc(data.last_seen)+"</span></p>Reason:<span class=\"cardBoloReason\"> "+esc(data.reason)+"</span></div></div></div></div>");
    } else if(data.event === "editBolo") {
        $(".activeBolo").each(function(e) {
            var obj = $(this);
            if(obj.find(".cardBoloID").text() === data.id) {
                obj.find(".cardBoloType").text(data.type);
                obj.find(".cardBoloDescription").text(data.description);
                obj.find(".cardBoloReason").text(" "+data.reason);
                obj.find(".cardBoloLastSeen").text(" "+data.last_seen);
            }
        });
    } else if(data.event === "archiveBolo") {
        $(".activeBolo").each(function(e) {
            var obj = $(this);
            if(obj.find(".cardBoloID").text() === data.id) {
                obj.remove();
            }
        });
    } else if(data.event === "callLogEntry") {
        if(currentCall !== null && data.call != currentCall.id) return;
        var ts = new Date(data.timestamp);
        $(".call-log").html($(".call-log").html()+"<div class='call-log-entry'>["+esc(regularTime(ts.getUTCHours())+":"+regularTime(ts.getUTCMinutes()))+"] "+esc(data.info)+"</div>");
    }
    console.log(evt.data);
};

function regularTime(time) {
    if(time < 10) {
        return "0"+time;
    }
    return time;
}

websocket.onclose = function() {
    window.location = "/unavailable";
};

window.onbeforeunload = function(event) {
    websocket.close();
};

function changeStatus1(newStatus) {
    status1 = newStatus;
    websocket.send(JSON.stringify({event: "statusUpdate", newStatus: status1}));
    $("#status").html(" "+status1);
}

function changeStatus2(newStatus) {
    status2 = newStatus;
    websocket.send(JSON.stringify({event: "statusUpdate", newStatus: status2}));
    $("#status").html(" "+status2);
}

function std() {
    if(status1 === "10-41") return;
    status2 = "";
    $("#avail").prop("disabled", false);
    $("#busy").prop("disabled", false);
    $("#oos").prop("disabled", false);
    $("#avail").parent().removeClass("disabled");
    $("#busy").parent().removeClass("disabled");
    $("#oos").parent().removeClass("disabled");
    changeStatus1("10-41");
}

function etd() {
    if(status1 === "10-42") return;
    $("#avail").parent().addClass("disabled");
    $("#busy").parent().addClass("disabled");
    $("#oos").parent().addClass("disabled");
    $("#avail").parent().removeClass("active");
    $("#busy").parent().removeClass("active");
    $("#oos").parent().removeClass("active");
    $("#enroute").parent().addClass("disabled");
    $("#os").parent().addClass("disabled");
    $("#tran").parent().addClass("disabled");
    $("#call_assignment").css('display', 'none');
    $("#bolos").css('display', 'block');
    changeStatus1("10-42");
}

function enroute() {
    if(status2 === "10-97") return;
    if($("#enroute").parent().hasClass("disabled")) return;
    changeStatus2("10-97");
}

function os() {
    if(status2 === "10-23") return;
    if($("#os").parent().hasClass("disabled")) return;
    changeStatus2("10-23");
}

function tran() {
    if(status2 === "10-15") return;
    if($("#tran").parent().hasClass("disabled")) return;
    changeStatus2("10-15");
}

function avail() {
    if(status2 === "10-8") return;
    if($("#avail").parent().hasClass("disabled")) return;
    changeStatus2("10-8");
}

function busy() {
    if(status2 === "10-6") return;
    if($("#busy").parent().hasClass("disabled")) return;
    changeStatus2("10-6");
}

function oos() {
    if(status2 === "10-7") return;
    if($("#oos").parent().hasClass("disabled")) return;
    changeStatus2("10-7");
}

$(document).ready(function() {
    if(localStorage.callsign == null) {
        window.location = "/";
        return;
    }
    $("#callsign").html(" "+localStorage.callsign);
    $("#status").html(" "+status1);
});

