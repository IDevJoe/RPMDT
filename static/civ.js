$(document).ready(function() {
    $("#callsign").text(" "+localStorage.callsign);
    $("#warrantStatus").change(function() {
        var cval = $(this).val();
        $("#warrantReason").prop("disabled", !(cval == "1"));
        if(cval == "0") {
            $("#currentWreason").val("");
        }
    });
    $("#currentWstatus").change(function() {
        var cval = $(this).val();
        $("#currentWreason").prop("disabled", !(cval == "1"));
        if(cval == "0") {
            $("#currentWreason").val("");
        }
    });
});

var websocket = new WebSocket("wss://"+window.location.host+"/ws");
websocket.onopen = function(evt) {
    console.log("WS Opened");
    $("#characterModal").modal({focus: false, show: false});
};

function regularTime(time) {
    if(time < 10) {
        return "0"+time;
    }
    return time;
}

function esc(text) {
    return $("<div>").text(text).html();
}

var ptimer = -1;
var ptimer_start = -1;
var civs = {};
websocket.onmessage = function(evt) {
    var data = JSON.parse(evt.data);
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
            data.civs.forEach(function(e) {
                addCiv(e.id, e.fname, e.lname, e.bday, e.lstatus, e.wstatus, e.wreason);
            });
            data.vehs.forEach(function(e) {
                addVehicle(e.id, e.plate, e.vin, e.make, e.model, e.color, e.year, e.regto, e.lstate, e.rstate);
            });
            break;
        case 'sig100':
            if(data.enable) {
                ptimer = -1;
            } else {
                ptimer = ptimer_start;
            }
            break;
        case 'createChar':
            addCiv(data.id, data.fname, data.lname, data.bday, data.lstatus, data.wstatus, data.wreason);
            break;
        case 'updateChar':
            var card = findCivCard(data.id);
            var split = data.bday.split('-');
            var year = split[0];
            var month = split[1];
            var day = split[2];
            var lcolor = "green";
            switch(data.lstatus) {
                case 'Expired':
                    lcolor = 'orange';
                    break;
                case 'Suspended':
                    lcolor = 'red';
                    break;
                case 'Revoked':
                    lcolor = 'red';
            }
            var wcolor = "green";
            var wtext = "No Warrants";
            switch(data.wstatus) {
                case '1':
                    wcolor = 'red';
                    wtext = 'Warrant Issued';
                    break;
            }
            card.find(".CVN").text(data.fname+" "+data.lname);
            card.find(".CVDB").text(" "+month+"/"+day+"/"+year);
            card.find(".CVLS").css("color", lcolor);
            card.find(".CVLS").text(data.lstatus+" License");
            card.find(".CVWS").css("color", wcolor);
            card.find(".CVWS").text(" "+wtext);
            civs[data.id] = data;
            break;
        case 'deleteChar':
            var card = findCivCard(data.id);
            card.remove();
            delete civs[data.id];
            break;
        case 'createVehicle':
            addVehicle(data.id, data.plate, data.vin, data.make, data.model, data.color, data.year, data.regto, data.lstate, data.rstate);
            break;
    }
};

function findCivCard(id) {
    var result = null;
    $(".charCard").each(function(e) {
        if($(this).find(".CVLN").text() == id) {
            result = $(this);
        }
    });
    return result;
}

function addCiv(id, fname, lname, bday, lstatus, wstatus, wreason) {
    var lcolor = "green";
    switch(lstatus) {
        case 'Expired':
            lcolor = 'orange';
            break;
        case 'Suspended':
            lcolor = 'red';
            break;
        case 'Revoked':
            lcolor = 'red';
    }
    var wcolor = "green";
    var wtext = "No Warrants";
    switch(wstatus) {
        case 1:
            wcolor = 'red';
            wtext = 'Warrant Issued';
            break;
    }
    var split = bday.split('-');
    var year = split[0];
    var month = split[1];
    var day = split[2];
    civs[id] = {id: id, fname: fname, lname: lname, bday: bday, lstatus: lstatus, wstatus: wstatus, wreason: wreason};
    $("#characters").html($("#characters").html()+'<div class="card charCard" style="margin-top: 50px;"><div class="card-body"><div class="row"><div class="col"><h4 class="card-title CVN">'+esc(fname+" "+lname)+'</h4></div><div class="col" style="text-align: right;"><button class="btn btn-sm btn-secondary" onclick="displayCharacterModal(this);">View/Edit</button></div></div>License #<span class="CVLN">'+esc(id)+'</span><br>DOB:<span class="CVDB"> '+esc(month+"/"+day+"/"+year)+'</span><p></p><span class="CVLS" style="color: '+lcolor+';">'+esc(lstatus)+' LICENSE</span> |<span class="CVWS" style="color: '+wcolor+';"> '+esc(wtext)+'</span></div></div>');
    $("#regto").html($("#regto").html()+"<option>"+esc(fname+" "+lname+" #"+id)+"</option>")
}

function addVehicle(id, plate, vin, make, model, color, year, regto, lstate, rstate) {
    var _rt = civs[regto].fname+" "+civs[regto].lname;
    var icolor = "green";
    var rcolor = "green";
    switch(lstate) {
        case 'Uninsured':
            icolor = 'red';
            break;
        case 'Expired Insurance':
            icolor = 'orange';
            break;
    }
    switch(rstate) {
        case 'Expired Registration':
            rcolor = "orange";
            break;
    }
    $("#vehicles").html($("#vehicles").html()+'<div class="card vehicleCard" style="margin-top: 50px;"><div class="card-body"><div class="row"><div class="col"><h4 class="card-title VHLP">'+esc(plate)+'</h4></div><div class="col" style="text-align: right;"><button class="btn btn-sm btn-secondary">View/Edit</button></div></div>Registration #<span class="VHRN">'+esc(id)+'</span><br><span class="VHT">'+esc(color)+' '+esc(year)+' '+esc(make)+' '+esc(model)+'</span><br>Registered to<span class="VHRT"> '+esc(_rt)+'</span><p></p><span class="VHIS" style="color: '+icolor+';">'+esc(lstate)+'</span> |<span class="VHRS" style="color: '+rcolor+';"> '+esc(rstate)+'</span></div></div>');
}

function createCharacter() {
    var fname = $("#fname").val();
    var lname = $("#lname").val();
    var bday = $("#bday").val();
    var lstatus = $("#licenseStatus").val();
    var wstatus = $("#warrantStatus").val();
    var wreason = $("#warrantReason").val();
    websocket.send(JSON.stringify({event: "createChar", fname: fname, lname: lname, bday: bday, lstatus: lstatus, wstatus: wstatus, wreason: wreason}));
    $("#fname").val("");
    $("#lname").val("");
    $("#bday").val("");
    $("#licenseStatus").val("-1");
    $("#warrantStatus").val("-1");
    $("#warrantReason").val("");
}

function displayCharacterModal(card) {
    var fcard = $(card).parent().parent().parent().parent();
    var civobj = civs[fcard.find(".CVLN").text()];
    var split = civobj.bday.split('-');
    var year = split[0];
    var month = split[1];
    var day = split[2];
    $("#currentCharacterName").text(civobj.fname+" "+civobj.lname);
    $("#currentCharacterId").text(civobj.id);
    $("#currentFname").val(civobj.fname);
    $("#currentLname").val(civobj.lname);
    $("#currentBday").val(year+"-"+month+"-"+day);
    $("#currentLstatus").val(civobj.lstatus);
    $("#currentWstatus").val(civobj.wstatus);
    $("#currentWreason").val(civobj.wreason);
    $("#currentWreason").prop("disabled", !($("#currentWstatus").val() === '1'));
    $("#characterModal").modal('show');
}

function updateCharacter() {
    var id = $("#currentCharacterId").text();
    var fname = $("#currentFname").val();
    var lname = $("#currentLname").val();
    var bday = $("#currentBday").val();
    var lstatus = $("#currentLstatus").val();
    var wstatus = $("#currentWstatus").val();
    var wreason = $("#currentWreason").val();
    websocket.send(JSON.stringify({event: "updateChar", id: id, fname: fname, lname: lname, bday: bday, lstatus: lstatus, wstatus: wstatus, wreason: wreason}));
    $("#characterModal").modal('hide');
}

function deleteCharacter() {
    var id = $("#currentCharacterId").text();
    swal({
        title: "Delete your character?",
        text: "The character will not be able to be recovered.",
        type: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Delete'
    }).then((result) => {
        if(result.value) {
            websocket.send(JSON.stringify({event: "deleteChar", id: id}));
            $("#characterModal").modal('hide');
        }
    });
}

function createVehicle() {
    var plate = $("#lplate").val();
    var vin = $("#vin").val();
    var make = $("#make").val();
    var model = $("#model").val();
    var color = $("#color").val();
    var year = $("#year").val();
    var regto = $("#regto").val().split(' ');
    regto = regto[regto.length - 1].substr(1);
    var lstate = $("#istate").val();
    var rstate = $("#rstate").val();
    websocket.send(JSON.stringify({event: "createVehicle", plate: plate, vin: vin, make: make, model: model, color: color, year: year, regto: regto, lstate: lstate, rstate, rstate}));
}

websocket.onclose = function() {
    window.location = "/unavailable";
};

window.onbeforeunload = function(event) {
    websocket.close();
};