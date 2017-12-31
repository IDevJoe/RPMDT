// let status = "10-42";

if("WebSocket" in window) {

} else {
    window.location = "/unsupported";
}

let websocket = new WebSocket("wss://"+window.location.host+"/ws");

websocket.onopen = function(evt) {
    console.log("WS Opened");
};

function esc(text) {
    return $("<div>").text(text).html();
}

var active_leo_count = 0;
var calls = {};

function changestatus(elem) {
    var e = $(elem);
    var to = e.text();
    var unitcard = e.parent().parent().parent().parent().parent();
    var unit = unitcard.find('.unit-num').text();
    websocket.send(JSON.stringify({event: 'forceStatus', unit: unit, to: to}));
}

websocket.onmessage = function(evt) {
    let data = JSON.parse(evt.data);
    if(data.event === "hello") {
        websocket.send(JSON.stringify({event: "ident", callsign: localStorage.callsign}));
        setInterval(function() {
            websocket.send(JSON.stringify({event: "heartbeat"}));
        }, 60000);
    }
    else if(data.event === "info") {
        $(".loading-icon").css("display", "none")
        active_leo_count = data.leos.length;
        $("#active_leos").html(active_leo_count+" ");
        data.leos.forEach((e) => {
            $("#active-units").html($("#active-units").html()+'<div class="card active-unit"><div class="card-body"><div class="row"><div class="col"><h4 class="card-title unit-num">'+esc(e.unit)+'</h4></div><div class="col" style="text-align: right;"><span class="unit-status" style="color: gray;">'+e.status+'</span><span class="unit-call-num"></span></div></div><div style="text-align: center;"><div class="dropdown" style="margin-left: 10px;float:right;"><button class="btn btn-success btn-sm dropdown-toggle ac-button" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Assign Call</button><div class="dropdown-menu"></div></div><div class="dropdown" style="float: right;"><button class="btn btn-success btn-sm dropdown-toggle s-button" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Change Status</button><div class="dropdown-menu"><a class="dropdown-item" href="javascript:void(0);" onclick="changestatus(this)">10-8</a><a class="dropdown-item" href="javascript:void(0);" onclick="changestatus(this)">10-7</a><a class="dropdown-item" href="javascript:void(0);" onclick="changestatus(this)">10-6</a><a class="dropdown-item" href="javascript:void(0);" onclick="changestatus(this)">10-97</a><a class="dropdown-item" href="javascript:void(0);" onclick="changestatus(this)">10-23</a><a class="dropdown-item" href="javascript:void(0);" onclick="changestatus(this)">10-15</a><a class="dropdown-item" href="javascript:void(0);" style="color: red;" onclick="changestatus(this)">10-42</a></div></div></div></div></div>');
            var elem = getUnitJqueryElement(e.unit);
            var us = elem.find('.unit-status');
            us.text(e.status);
            switch(e.status) {
                case "10-41":
                case "10-7":
                case "10-6":
                    us.css("color", "red");
                    break;
                case "10-8":
                    us.css("color", "green");
                    break;
                case "10-15":
                case "10-23":
                case "10-97":
                    us.css("color", "orange");
                    break;
                default:
                    us.css("color", "gray");
                    break;
            }
            var acbutton = elem.find('.ac-button');
            if(e.status !== "10-8") {
                acbutton.addClass("disabled");
            }
            if(e.call !== null) {
                acbutton.addClass("disabled");
                elem.find(".unit-call-num").text("CN "+e.call);
                elem.find(".unit-call-num").css("display", 'inline');
            }
            $("#primaryUnit").html($("#primaryUnit").html()+"<option class='unit-option'>"+esc(e.unit)+"</option>");
        });
        data.bolos.forEach(function(e) {
            $("#boloList").html($("#boloList").html()+"<div class=\"card activeBolo\" style='margin-top: 50px;'><div class=\"card-body\"><div class=\"row\"><div class=\"col\"><h4 class=\"card-title cardBoloType\">"+esc(e.type)+"</h4></div><div class=\"col\" style=\"text-align: right;\"><span class=\"cardBoloID\" style=\"display: none;\">"+esc(e.id)+"</span><button class=\"btn btn-sm btn-secondary\" onclick=\"displayBolo(this);\">View/Edit</button></div></div><p><pre class=\"cardBoloDescription\">"+esc(e.description)+"</pre></p><p>Last seen:<span class=\"cardBoloLastSeen\"> "+esc(e.last_seen)+"</span></p>Reason:<span class=\"cardBoloReason\"> "+esc(e.reason)+"</span></div></div>");
        });
        data.calls.forEach(function(e) {
            calls[e.id] = e;
            $("#callList").html($("#callList").html()+'<div class="card call-item" style="margin-top: 50px;"><div class="card-body"><div class="row"><div class="col"><h4 class="card-title call-num">CN '+esc(e.id)+'</h4></div><div class="col" style="text-align: right;"><button class="btn btn-secondary btn-sm" onclick="displayCall(this)">View/Edit</button></div></div><span class="call-title">'+esc(e.type)+' // '+esc(e.title)+'</span><br><strong class="call_attached_units">'+e.attached.length+' attached units</strong></div></div>');
            $(".ac-button").each(function(ee) {
                var a = $(this).parent().find('.dropdown-menu');
                a.html(a.html()+"<a class='dropdown-item attach-item' href='javascript:void(0);' onclick='attachCall(this)'>"+esc(e.id)+"</a>");
            });
        });
        if(data.sig100) {
            $("#sig100").toggleClass("active");
        }
        if(data.st) {
            $("#st").toggleClass("active");
        }
    }
    else if(data.event === "sig100") {
        if(data.enable) {
            $("#sig100").addClass("active");
        } else {
            $("#sig100").removeClass("active");
        }
    } else if(data.event === "st") {
        if(data.enable) {
            $("#st").addClass("active");
        } else {
            $("#st").removeClass("active");
        }
    } else if(data.event === "statusUpdate") {
        var v = $("#active_leos");
        if(data.status === "10-41") {
            $("#active-units").html($("#active-units").html()+'<div class="card active-unit"><div class="card-body"><div class="row"><div class="col"><h4 class="card-title unit-num">'+esc(data.unit)+'</h4></div><div class="col" style="text-align: right;"><span class="unit-status" style="color: red;">'+data.status+'</span><span class="unit-call-num"></span></div></div><div style="text-align: center;"><div class="dropdown" style="margin-left: 10px;float:right;"><button class="btn btn-success btn-sm dropdown-toggle ac-button" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Assign Call</button><div class="dropdown-menu"></div></div><div class="dropdown" style="float: right;"><button class="btn btn-success btn-sm dropdown-toggle s-button" type="button" data-toggle="dropdown" aria-haspopup="true" aria-expanded="false">Change Status</button><div class="dropdown-menu"><a class="dropdown-item" href="javascript:void(0);" onclick="changestatus(this)">10-8</a><a class="dropdown-item" href="javascript:void(0);" onclick="changestatus(this)">10-7</a><a class="dropdown-item" href="javascript:void(0);" onclick="changestatus(this)">10-6</a><a class="dropdown-item" href="javascript:void(0);" onclick="changestatus(this)">10-97</a><a class="dropdown-item" href="javascript:void(0);" onclick="changestatus(this)">10-23</a><a class="dropdown-item" href="javascript:void(0);" onclick="changestatus(this)">10-15</a><a class="dropdown-item" href="javascript:void(0);" style="color: red;" onclick="changestatus(this)">10-42</a></div></div></div></div></div>');
            active_leo_count++;
            $("#active_leos").html(active_leo_count+" ");
            $("#primaryUnit").html($("#primaryUnit").html()+"<option class='unit-option'>"+esc(data.unit)+"</option>");
            $(".call-num").each(function(e) {
                var unit = getUnitJqueryElement(data.unit);
                var id = $(this).text().substr(3);
                var a = unit.find(".ac-button").parent().find('.dropdown-menu');
                a.html(a.html()+"<a class='dropdown-item attach-item' href='javascript:void(0);' onclick='attachCall(this)'>"+esc(id)+"</a>");
            });
        }
        else if(data.status === "10-42") {
            var elem = getUnitJqueryElement(data.unit);
            if(elem.find(".unit-call-num").css('display') === "inline") {
                var cn = elem.find(".unit-call-num").text().substr(3);
                elem.find(".unit-call-num").css('display', 'none');
                $(".call-item").each(function(e) {
                    var obj = $(this);
                    if(obj.find(".call-num").text() === "CN "+cn) {
                        var splittext = obj.find(".call_attached_units").text().split(' ');
                        var units = splittext[0];
                        units--;
                        obj.find(".call_attached_units").text(units+" attached units");
                    }
                });
            }
            elem.remove();
            active_leo_count--;
            $("#active_leos").html(active_leo_count+" ");
            $(".unit-option").each(function(e) {
                if($(this).text() === data.unit) {
                    $(this).remove();
                }
            });
        } else {
            var elem = getUnitJqueryElement(data.unit);
            var us = elem.find('.unit-status');
            us.text(data.status);
            switch(data.status) {
                case "10-41":
                case "10-7":
                case "10-6":
                    us.css("color", "red");
                    break;
                case "10-8":
                    us.css("color", "green");
                    break;
                case "10-15":
                case "10-23":
                case "10-97":
                    us.css("color", "orange");
                    break;
                default:
                    us.css("color", "gray");
                    break;
            }
            var acbutton = elem.find('.ac-button');
            if(data.status !== "10-8") {
                acbutton.addClass("disabled");
            } else {
                acbutton.removeClass("disabled");
                if(elem.find(".unit-call-num").css('display') === "inline") {
                    var cn = elem.find(".unit-call-num").text().substr(3);
                    elem.find(".unit-call-num").css('display', 'none');
                    $(".call-item").each(function(e) {
                        var obj = $(this);
                        if(obj.find(".call-num").text() === "CN "+cn) {
                            var splittext = obj.find(".call_attached_units").text().split(' ');
                            var units = splittext[0];
                            units--;
                            obj.find(".call_attached_units").text(units+" attached units");
                        }
                    });
                }
            }
        }
    } else if(data.event === "createCall") {
        // <div class="card call-item"><div class="card-body"><div class="row"><div class="col"><h4 class="card-title call-num">CN 2883</h4></div><div class="col" style="text-align: right;"><button class="btn btn-secondary btn-sm">View/Edit</button></div></div>10-11 // Traffic Stop<br><strong>1 attached unit</strong></div></div>
        $("#callList").html($("#callList").html()+'<div class="card call-item" style="margin-top: 50px;"><div class="card-body"><div class="row"><div class="col"><h4 class="card-title call-num">CN '+esc(data.call.id)+'</h4></div><div class="col" style="text-align: right;"><button class="btn btn-secondary btn-sm" onclick="displayCall(this)">View/Edit</button></div></div><span class="call-title">'+esc(data.call.type)+' // '+esc(data.call.title)+'</span><br><strong class="call_attached_units">'+data.call.attached.length+' attached units</strong></div></div>');
        $(".ac-button").each(function(e) {
            var a = $(this).parent().find('.dropdown-menu');
            a.html(a.html()+"<a class='dropdown-item attach-item' href='javascript:void(0);' onclick='attachCall(this)'>"+esc(data.call.id)+"</a>");
        });
        calls[data.call.id] = data.call;
    } else if(data.event === "archiveCall") {
        $(".call-item").each(function(e) {
            var obj = $(this);
            if(obj.find(".call-num").text() === "CN "+data.id) {
                obj.remove();
                $("#callModal").modal('hide');
            }
        });
        $('.attach-item').each(function(e) {
            if($(this).text() === data.id) $(this).remove();
        })
    } else if(data.event === "assignCall") {
        var elem = getUnitJqueryElement(data.unit);
        elem.find(".unit-call-num").text("CN "+data.call.id);
        elem.find(".unit-call-num").css('display', 'inline');
        $(".call-item").each(function(e) {
            var obj = $(this);
            if(obj.find(".call-num").text() === "CN "+data.call.id) {
                obj.find(".call_attached_units").text((data.call.attached.length+1)+" attached units");
            }
        });
        var acbutton = elem.find('.ac-button');
        acbutton.addClass('disabled');
    } else if(data.event === "editCall") {
        calls[data.call.id] = data.call;
        $(".call-item").each(function(e) {
            var obj = $(this);
            if(obj.find(".call-num").text() === "CN "+data.call.id) {
                obj.find(".call-title").text(data.call.type+" // "+data.call.title);
            }
        });
    } else if(data.event === "createBolo") {
        $("#boloList").html($("#boloList").html()+"<div class=\"card activeBolo\" style='margin-top: 50px;'><div class=\"card-body\"><div class=\"row\"><div class=\"col\"><h4 class=\"card-title cardBoloType\">"+esc(data.type)+"</h4></div><div class=\"col\" style=\"text-align: right;\"><span class=\"cardBoloID\" style=\"display: none;\">"+esc(data.id)+"</span><button class=\"btn btn-sm btn-secondary\" onclick=\"displayBolo(this);\">View/Edit</button></div></div><p><pre class=\"cardBoloDescription\">"+esc(data.description)+"</pre></p><p>Last seen:<span class=\"cardBoloLastSeen\"> "+esc(data.last_seen)+"</span></p>Reason:<span class=\"cardBoloReason\"> "+esc(data.reason)+"</span></div></div>")
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
        console.log(data.call);
        calls[data.call].log.push({timestamp: data.timestamp, info: data.info});
        if($("#currentCallNum").text().substr(3) == data.call) {
            var ts = new Date(data.timestamp);
            $(".call-log").html($(".call-log").html()+"<div class='call-log-entry'>["+esc(regularTime(ts.getUTCHours())+":"+regularTime(ts.getUTCMinutes()))+"] "+esc(data.info)+"</div>");
        }
    }
    console.log(evt.data);
};

function attachCall(item) {
    var card = $(item).parent().parent().parent().parent().parent();
    var unitnum = card.find(".unit-num").text();
    var callnum = $(item).text();
    websocket.send(JSON.stringify({event: 'assignCall', unit: unitnum, call: callnum}));
}

function createCall() {
    var origin = $("#callOrigin").val();
    var type = $("#callType").val();
    var primary = $("#primaryUnit").val();
    var title = $("#callTitle").val();
    var location = $("#callLocation").val();
    var description = $("#callDescription").val();
    websocket.send(JSON.stringify({event: "createCall", origin: origin, type: type, primary: primary, title: title, location: location, description: description}));
    $("#callOrigin").val(-1);
    $("#callType").val(-1);
    $("#primaryUnit").val(-1);
    $("#callTitle").val("");
    $("#callLocation").val("");
    $("#callDescription").val("");
}

function createBolo() {
    var type = $("#boloType").val();
    var last_seen = $("#boloLastSeen").val();
    var reason = $("#boloReason").val();
    var description = $("#boloDescription").val();
    websocket.send(JSON.stringify({event: "createBolo", type: type, last_seen: last_seen, description: description, reason: reason}));
    $("#boloType").val(-1);
    $("#boloLastSeen").val("");
    $("#boloReason").val("");
    $("#boloDescription").val("");
}

function displayCall(card) {
    var e = $(card).parent().parent().parent().parent();
    var id = e.find('.call-num').text().substr(3);
    var callObj = calls[id];
    $("#currentCallNum").text("CN "+callObj.id);
    $("#currentCallType").val(callObj.type);
    $("#currentCallTitle").val(callObj.title);
    $("#currentCallLocation").val(callObj.location);
    $("#currentCallDescription").val(callObj.description);
    $(".call-log").html("");
    callObj.log.forEach((e) => {
        var ts = new Date(e.timestamp);
        $(".call-log").html($(".call-log").html()+"<div class='call-log-entry'>["+esc(regularTime(ts.getUTCHours())+":"+regularTime(ts.getUTCMinutes()))+"] "+esc(e.info)+"</div>");
    });
    $("#callModal").modal('show');
}

function displayBolo(card) {
    var e = $(card).parent().parent().parent().parent();
    var id = e.find('.cardBoloID').text();
    var boloType = e.find('.cardBoloType').text();
    var boloLastSeen = e.find('.cardBoloLastSeen').text();
    var boloDescription = e.find('.cardBoloDescription').text();
    var boloReason = e.find('.cardBoloReason').text();
    $("#currentBoloId").text(id);
    $("#currentBoloType").val(boloType);
    $("#currentBoloLastSeen").val(boloLastSeen.substr(1));
    $("#currentBoloReason").val(boloReason.substr(1));
    $("#currentBoloDescription").val(boloDescription);
    $("#boloModal").modal('show');
}

function archiveCall(modal) {
    var full = $(modal).parent().parent().parent().parent();
    var id = full.find("#currentCallNum").text().substr(3);
    swal({
        title: "Archive the call?",
        text: "The call will not be able to be recovered.",
        type: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Archive'
    }).then((result) => {
        if(result.value) {
            websocket.send(JSON.stringify({event: "archiveCall", id: id}));
        }
    });
}

function archiveBolo() {
    var id = $("#currentBoloId").text();
    swal({
        title: "Archive the BOLO?",
        text: "The BOLO will not be able to be recovered.",
        type: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Archive'
    }).then((result) => {
        if(result.value) {
            websocket.send(JSON.stringify({event: "archiveBolo", id: id}));
            $("#boloModal").modal('hide');
        }
    });
}

function updateCall() {
    websocket.send(JSON.stringify({event: 'editCall', id: $("#currentCallNum").text().substr(3), type: $("#currentCallType").val(), title: $("#currentCallTitle").val(), location: $("#currentCallLocation").val(), description: $("#currentCallDescription").val()}));
    $("#callModal").modal('hide');
}

function updateBolo() {
    websocket.send(JSON.stringify({event: 'editBolo', id: $("#currentBoloId").text(), type: $("#currentBoloType").val(), reason: $("#currentBoloReason").val(), last_seen: $("#currentBoloLastSeen").val(), description: $("#currentBoloDescription").val()}));
    $("#boloModal").modal('hide');
}

function getUnitJqueryElement(unitnum) {
    var elem = null;
    $(".active-unit").each(function(e) {
        var num = $(this).find(".unit-num");
        if(num.text() === unitnum) elem = $(this);
    });
    return elem;
}

function addCallLogEntry() {
    var v = $("#callLogAdd").val();
    websocket.send(JSON.stringify({event: 'callLogEntry', call: $("#currentCallNum").text().substr(3), info: v}));
    $("#callLogAdd").val("");
}

websocket.onclose = function() {
    window.location = "/unavailable";
};

window.onbeforeunload = function(event) {
    websocket.close();
};

$(document).ready(function() {
    if(localStorage.callsign == null) {
        window.location = "/";
        return;
    }
    $("#callsign").html(" "+localStorage.callsign);
    setInterval(function() {
        var date = new Date();
        $("#clock").text(regularTime(date.getUTCHours())+":"+regularTime(date.getUTCMinutes())+":"+regularTime(date.getUTCSeconds()));
    }, 500);
    $("#callModal").modal({focus: false, show: false});
    $("#boloModal").modal({focus: false, show: false});
});

function regularTime(time) {
    if(time < 10) {
        return "0"+time;
    }
    return time;
}

function sig100() {
    websocket.send(JSON.stringify({event: "sig100", enable: !$("#sig100").hasClass("active")}));
}

function st() {
    websocket.send(JSON.stringify({event: "st", enable: !$("#st").hasClass("active")}));
}