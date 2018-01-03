let active_leo = [];
let active_dispatch = {};
let active_fire = {};
let active_civ = {};
let nextId = Math.floor(Math.random() * 100000);
let mysql = require('./globals').mysql;
let msql = require('mysql');

let broadcastEmitter = new (require('events')).EventEmitter();
let sig100 = false;
let st = false;
let ptimer_start = 600000;
let ptimer = ptimer_start;

setInterval(function() {
    if(ptimer <= 0) return;
    ptimer -= 1000;
}, 1000);

function verifyRequest(data, requiredParams) {
    let allow = true;
    requiredParams.forEach((e) => {
        if(typeof data[e] === "undefined" || data[e] === null) {
            allow = false;
        }
    });
    return allow;
}

function getActiveBolos(cb) {
    mysql.query("SELECT `bolo_id` AS `id`, `type`, `description`, `reason`, `last_seen` FROM `bolos` WHERE `active`=1", (err, res, f) => {
        cb(err, res);
    });
}

function getActiveBolo(id, cb) {
    mysql.query("SELECT `bolo_id` AS `id`, `type`, `description`, `reason`, `last_seen` FROM `bolos` WHERE `id`=? AND `active`=1", [id], (err, res, f) => {
        if(res.length === 0) {
            cb(err, null);
            return;
        }
        cb(err, res[0]);
    });
}

function getActiveCalls(cb) {
    mysql.query("SELECT `call_id` AS `id`, `origin`, `type`, `title`, `location`, `description`, `primary_unit` AS `primary` FROM `calls` WHERE `archived`=0", (err, res, f) => {
        if(res.length === 0) {
            cb(err, res);
            return;
        }
        let calls = [];
        res.forEach((e) => {
            mysql.query("SELECT `unit` FROM `calls_attached` WHERE `call_id`=?", [e.id], (errr, ress, ff) => {
                let attached = [];
                ress.forEach((e) => {
                    attached.push(e.unit);
                });
                mysql.query("SELECT `timestamp`, `from`, `info` FROM `call_log` WHERE `call_id`=?", [e.id], (errrr, resss, fff) => {
                    let call = e;
                    call.attached = attached;
                    call.log = resss;
                    calls.push(call);
                    if(calls.length === res.length)
                        cb(err, calls);
                });
            });
        });
    });
}

function getActiveCall(id, cb) {
    mysql.query("SELECT `call_id` AS `id`, `origin`, `type`, `title`, `location`, `description`, `primary_unit` AS `primary` FROM `calls` WHERE `call_id`=? AND `archived`=0", [id], (err, res, f) => {
        if(err) {
            console.log(err);
            return;
        }
        if(res.length === 0) {
            cb(err, null);
            return;
        }
        mysql.query("SELECT `unit` FROM `calls_attached` WHERE `call_id`=?", [id], (errr, ress, ff) => {
            let attached = [];
            ress.forEach((e) => {
                attached.push(e.unit);
            });
            mysql.query("SELECT `timestamp`, `from`, `info` FROM `call_log` WHERE `call_id`=?", [id], (errrr, resss, fff) => {
                let call = res[0];
                call.attached = attached;
                call.log = resss;
                cb(err, call);
            });
        });
    });
}

function getIntId(id, cb) {
    mysql.query("SELECT `id` FROM `users` WHERE `user_id`=?", [id], (errr, ress, ff) => {
        cb(errr, ress[0].id);
    });
}

function getUserCivs(id, cb) {
    mysql.query("SELECT `id` FROM `users` WHERE `user_id`=?", [id], (errr, ress, ff) => {
        mysql.query("SELECT `id`, `fname`, `lname`, `dob` AS `bday`, `lstatus`, `hasWarrant` AS `wstatus`, `warrantReason` AS `wreason` FROM `characters` WHERE `user_id`=?", [ress[0].id], (err, res, f) => {
            if(err) {
                console.log(err);
            }
            cb(err, res);
        });
    });
}

function getUserVehicles(_id, cb) {
    getIntId(_id, (err, id) => {
        mysql.query("SELECT * FROM `vehicles` WHERE `userid`=?", [id], (err, res, f) => {
            if(err) {
                console.log(err);
            }
            cb(err, res);
        })
    });
}

function addToCallLog(id, from, toAdd, cb) {
    mysql.query("INSERT INTO `call_log` (`call_id`, `from`, `info`) VALUES(?, ?, ?)", [id, from, toAdd], (e, r, f) => {
        if(e) {
            console.log(e);
            cb(e);
            return;
        }
        mysql.query("SELECT `timestamp`, `from`, `info` FROM `call_log` WHERE `id`=?", [r.insertId], (ee, rr, ff) => {
            if(e) {
                console.log(ee);
                cb(ee);
                return;
            }
            broadcastEmitter.emit("broadcast", JSON.stringify({event: "callLogEntry", call: id, from: rr[0].from, timestamp: rr[0].timestamp, info: rr[0].info}));
            cb(e);
        });
    });
}

module.exports = function(ws, req) {

    let ws_session = {};
    let senthb = false;
    ws_session.ud = req.userdata;
    ws_session.req_session = req.session;
    ws_session.id = req.session.id;

    let user_type = "LEO";

    if(req.session.token == null) {
        ws.close(1003, "Not logged in");
        return;
    }
    if(!req.userdata.is_approved) {
        ws.close(1002, "Not approved for use");
        return;
    }

    console.log("User connected to WS, SID: "+req.session.id);

    let lf = (msg) => {
        try {
            ws.send(msg);
        } catch(e) {
            console.log(req.session.user.username+" closed unexpectedly.");
        }
    };

    ws.on('message', (msg) => {
        let data = JSON.parse(msg);
        console.log(req.session.user.username+": "+data.event);
        if(data.event == null) {
            ws.close();
            return;
        }
        switch(data.event) {
            case 'ident':
                if(data.callsign == null) {
                    console.log("No callsign");
                    ws.close(1001, "No callsign specified");
                    break;
                }
                ws_session.callsign = data.callsign;
                if(ws_session.callsign.startsWith("C-")) {
                    user_type = "DISPATCH";
                } else if(ws_session.callsign.startsWith("Civ")) {
                    user_type = "CIV";
                } else if(ws_session.callsign.startsWith("F")) {
                    user_type = "FIRE";
                }
                getActiveBolos((e1, bolos) => {
                    getActiveCalls((e2, calls) => {
                        let obj = {event: 'info', session_id: ws_session.id, identified: user_type};
                        if(user_type == "LEO") {
                            obj.bolos = bolos;
                            obj.sig100 = sig100;
                            obj.st = st;
                            ws.send(JSON.stringify(obj));
                        } else if(user_type == "DISPATCH") {
                            obj.bolos = bolos;
                            obj.calls = calls;
                            obj.leos = active_leo;
                            obj.sig100 = sig100;
                            obj.st = st;
                            ws.send(JSON.stringify(obj));
                        } else if(user_type == "CIV") {
                            getUserCivs(ws_session.req_session.user.id, (e3, civs) => {
                                getUserVehicles(ws_session.req_session.user.id, (e4, vehs) => {
                                    obj.ptimer = ptimer;
                                    obj.sig100 = sig100;
                                    obj.civs = civs;
                                    obj.vehs = vehs;
                                    obj.ptimer_start = ptimer_start;
                                    ws.send(JSON.stringify(obj));
                                });
                            });
                        }
                        // Optimizations for initial info packet
                    });
                });
                var intv = setInterval(() => {
                    setTimeout(() => {
                        if(!senthb) ws.close();
                        senthb = false;
                        clearInterval(intv);
                    }, 20000);
                }, 60000);
                ws_session.bcl = broadcastEmitter.on('broadcast', lf);
                break;
            case 'heartbeat' :
                senthb = true;
                try {
                    ws.send(JSON.stringify({event: 'heartbeat_ack'}));
                } catch(e) {

                }
                break;
            case 'statusUpdate':
                if(user_type !== "LEO") break;
                if(!verifyRequest(data, ["newStatus"])) break;
                if(data.newStatus === "10-41" && ws_session.status !== "10-41") {
                    active_leo.push({unit: ws_session.callsign, status: "10-41", call: null});
                } else if(data.newStatus === "10-42" && ws_session.status !== "10-41") {
                    let ind = -1;
                    for(let i = 0; i<active_leo.length;i++) {
                        if(active_leo[i].unit == ws_session.callsign) {
                            ind = i;
                            break;
                        }
                    }
                    let ind2 = -1;
                    if(typeof active_leo[ind] === "undefined") {
                        ws.close();
                        return;
                    }
                    if(active_leo[ind].call !== null) {
                        mysql.query("DELETE FROM `calls_attached` WHERE `unit`=?", [ws_session.callsign]);
                        active_leo[ind].call = null;
                    }
                    if(ind !== -1) active_leo.splice(ind, 1);
                } else {
                    let ind = -1;
                    for(let i = 0; i<active_leo.length;i++) {
                        if(active_leo[i].unit == ws_session.callsign) {
                            ind = i;
                            break;
                        }
                    }
                    if(typeof active_leo[ind] === "undefined") {
                        ws.close();
                        return;
                    }
                    if(active_leo[ind].call !== null && data.newStatus === "10-8") {
                        addToCallLog(active_leo[ind].call, ws_session.callsign, ws_session.callsign+" cleared themselves", () => {});
                        mysql.query("DELETE FROM `calls_attached` WHERE `unit`=?", [ws_session.callsign]);
                        active_leo[ind].call = null;
                    } else if(active_leo[ind].call) {
                        addToCallLog(active_leo[ind].call, ws_session.callsign, ws_session.callsign+" marked themselves "+data.newStatus, () => {});
                    }
                    active_leo[ind].status = data.newStatus;
                }
                broadcastEmitter.emit('broadcast', JSON.stringify({event: 'statusUpdate', unit: ws_session.callsign, type: user_type, set_by: ws_session.callsign, status: data.newStatus}));
                break;
            case 'sig100':
                if(user_type !== "DISPATCH") break;
                if(!verifyRequest(data, ["enable"])) break;
                sig100 = data.enable;
                if(data.enable) {
                    ptimer = -1;
                } else {
                    ptimer = ptimer_start;
                }
                broadcastEmitter.emit('broadcast', JSON.stringify({event: 'sig100', enable: data.enable, initiator: ws_session.callsign}));
                break;
            case 'st':
                if(user_type !== "DISPATCH") break;
                if(!verifyRequest(data, ["enable"])) break;
                st = data.enable;
                broadcastEmitter.emit('broadcast', JSON.stringify({event: 'st', enable: data.enable, initiator: ws_session.callsign}));
                break;
            case 'forceStatus':
                if(user_type !== "DISPATCH") break;
                if(!verifyRequest(data, ["unit", "to"])) break;
                let ind = -1;
                for(let i = 0; i<active_leo.length;i++) {
                    if(active_leo[i].unit === data.unit) {
                        ind = i;
                        break;
                    }
                }
                if(ind === -1) break;
                if(active_leo[ind].call !== null && data.to === "10-8") {
                    addToCallLog(active_leo[ind].call, ws_session.callsign, data.unit+" cleared by "+ws_session.callsign, () => {});
                    mysql.query("DELETE FROM `calls_attached` WHERE `unit`=?", [data.unit], (e, r, f) => {
                        if(e) {
                            console.log(e);
                        }
                    });
                    active_leo[ind].call = null;
                } else if(active_leo[ind].call !== null) {
                    addToCallLog(active_leo[ind].call, ws_session.callsign, data.unit+" marked "+data.to+" by "+ws_session.callsign, () => {});
                }
                active_leo[ind].status = data.to;
                broadcastEmitter.emit('broadcast', JSON.stringify({event: 'statusUpdate', unit: data.unit, type: "LEO", set_by: ws_session.callsign, status: data.to}));
                break;
            case 'createCall':
                if(user_type !== "DISPATCH") break;
                if(!verifyRequest(data, ["origin", "type", "title", "location", "description"])) break;
                mysql.query("INSERT INTO `calls` (origin, type, title, location, description, primary_unit)\n" +
                    "VALUES(?, ?, ?, ?, ?, ?)", [data.origin, data.type, data.title, data.location, data.description, data.primary], (err, res, f) => {
                    if(err) {
                        console.log(err);
                        return;
                    }
                    let callObj = {id: res.insertId, origin: data.origin, type: data.type, title: data.title, location: data.location, description: data.description, primary: data.primary, attached: [], log: []};
                    broadcastEmitter.emit('broadcast', JSON.stringify({event: "createCall", call: callObj}));
                    addToCallLog(res.insertId, "System", "Call created by "+ws_session.callsign, () => {
                        addToCallLog(res.insertId, "System", "Call origin: "+data.origin, () => {
                        });
                    });
                });
                break;
            case 'archiveCall':
                if(user_type !== "DISPATCH") break;
                if(!verifyRequest(data, ["id"])) break;
                mysql.query("UPDATE `calls` SET `archived`=1 WHERE `call_id`=?\n", [data.id], (err, res, f) => {
                    if(err) {
                        console.log(err);
                        return;
                    }
                    broadcastEmitter.emit('broadcast', JSON.stringify({event: "archiveCall", id: data.id}));
                });
                break;
            case 'assignCall':
                if(user_type !== "DISPATCH") break;
                if(!verifyRequest(data, ["unit", "call"])) break;
                getActiveCall(data.call, (err, call) => {
                    if(call === null) return;
                    mysql.query("INSERT INTO `calls_attached` (call_id, unit)\n" +
                        "VALUES(?, ?)", [data.call, data.unit], (err, res, f) => {
                        if(err) {
                            console.log(err);
                            return;
                        }
                        let ind = -1;
                        for(let i = 0; i<active_leo.length;i++) {
                            if(active_leo[i].unit == data.unit) {
                                ind = i;
                                break;
                            }
                        }
                        active_leo[ind].call = call.id;
                        broadcastEmitter.emit('broadcast', JSON.stringify({event: "assignCall", unit: data.unit, call: call}));
                        addToCallLog(active_leo[ind].call, ws_session.callsign, data.unit+" attached by "+ws_session.callsign, () => {});
                    });
                });
                break;
            case 'editCall':
                if(user_type !== "DISPATCH") break;
                if(!verifyRequest(data, ["id", "type", "title", "location", "description"])) break;
                mysql.query("UPDATE `calls` SET `type`=?, `title`=?, `location`=?, `description`=? WHERE `call_id`=?\n", [data.type, data.title, data.location, data.description, data.id], (err, res, f) => {
                    if(err) {
                        console.log(err);
                        return;
                    }
                    addToCallLog(data.id, ws_session.callsign, ws_session.callsign+" edited call details.", () => {});
                    getActiveCall(data.id, (err, call) => {
                        broadcastEmitter.emit('broadcast', JSON.stringify({event: "editCall", call: call}));
                    });
                });
                break;
            case 'createBolo':
                if(user_type !== "DISPATCH") break;
                if(!verifyRequest(data, ["type", "description", "reason", "last_seen"])) break;
                mysql.query("INSERT INTO `bolos` (type, description, reason, last_seen)\n" +
                    "VALUES(?, ?, ?, ?)", [data.type, data.description, data.reason, data.last_seen], (err, res, f) => {
                    if(err) {
                        console.log(err);
                        return;
                    }
                    broadcastEmitter.emit('broadcast', JSON.stringify({event: "createBolo", id: res.insertId, type: data.type, description: data.description, reason: data.reason, last_seen: data.last_seen}));
                });
                break;
            case 'editBolo':
                if(user_type !== "DISPATCH") break;
                if(!verifyRequest(data, ["id", "type", "description", "reason", "last_seen"])) break;
                mysql.query("UPDATE `bolos` SET `type`=?, `description`=?, `reason`=?, `last_seen`=? WHERE `bolo_id`=?\n", [data.type, data.description, data.reason, data.last_seen, data.id], (err, res, f) => {
                    if(err) {
                        console.log(err);
                        return;
                    }
                    broadcastEmitter.emit('broadcast', JSON.stringify({event: "editBolo", id: data.id, type: data.type, description: data.description, reason: data.reason, last_seen: data.last_seen}));
                });
                break;
            case 'archiveBolo':
                if(user_type !== "DISPATCH") break;
                if(!verifyRequest(data, ["id"])) break;
                mysql.query("UPDATE `bolos` SET `active`=0 WHERE `bolo_id`=?\n", [data.id], (err, res, f) => {
                    if(err) {
                        console.log(err);
                        return;
                    }
                    broadcastEmitter.emit('broadcast', JSON.stringify({event: 'archiveBolo', id: data.id}));
                });
                broadcastEmitter.emit('broadcast', JSON.stringify({event: 'archiveBolo', id: data.id}));
                break;
            case 'callLogEntry':
                if(user_type !== "DISPATCH") break;
                if(!verifyRequest(data, ["call", "info"])) break;
                addToCallLog(data.call, ws_session.callsign, data.info, () => {});
                break;
            case 'createChar':
                if(user_type !== "CIV") break;
                if(!verifyRequest(data, ["fname", "lname", "bday", "lstatus", "wstatus", "wreason"])) break;
                getIntId(ws_session.req_session.user.id, (err, id) => {
                    mysql.query("INSERT INTO `characters` (fname, lname, dob, lstatus, hasWarrant, warrantReason, user_id)\n" +
                        "VALUES(?, ?, ?, ?, ?, ?, ?)", [data.fname, data.lname, data.bday, data.lstatus, data.wstatus, data.wreason, id], (err, res, f) => {
                        if(err) {
                            console.log(err);
                            return;
                        }
                        ws.send(JSON.stringify({event: "createChar", id: res.insertId, fname: data.fname, lname: data.lname, bday: data.bday, lstatus: data.lstatus, wstatus: data.wstatus, wreason: data.wreason}));
                    });
                });
                break;
            case 'updateChar':
                if(user_type !== "CIV") break;
                if(!verifyRequest(data, ["id", "fname", "lname", "bday", "lstatus", "wstatus", "wreason"])) break;
                mysql.query("UPDATE `characters` SET `fname`=?, `lname`=?, `dob`=?, `lstatus`=?, `hasWarrant`=?, `warrantReason`=? WHERE `id`=?", [data.fname, data.lname, data.bday, data.lstatus, data.wstatus, data.wreason, data.id], (err, res, f) => {
                    if(err) {
                        console.log(err);
                        return;
                    }
                    ws.send(JSON.stringify({event: "updateChar", id: data.id, fname: data.fname, lname: data.lname, bday: data.bday, lstatus: data.lstatus, wstatus: data.wstatus, wreason: data.wreason}));
                });
                break;
            case 'deleteChar':
                if(user_type !== "CIV") break;
                if(!verifyRequest(data, ["id"])) break;
                mysql.query("DELETE FROM `characters` WHERE `id`=?", data.id, (err, res, f) => {
                    if(err) console.log(err);
                    ws.send(JSON.stringify({event: "deleteChar", id: data.id}));
                });
                break;
            case 'createVehicle':
                if(user_type !== "CIV") break;
                if(!verifyRequest(data, ["plate", "vin", "make", "model", "color", "year", "regto", "lstate", "rstate"])) break;
                getIntId(ws_session.req_session.user.id, (err, id) => {
                    mysql.query("INSERT INTO `vehicles` (plate, vin, make, model, color, year, regto, lstate, rstate, userid)\n" +
                        "VALUES(?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", [data.plate, data.vin, data.make, data.model, data.color, data.year, data.regto, data.lstate, data.rstate, id], (err, res, f) => {
                        if(err) {
                            console.log(err);
                            return;
                        }
                        ws.send(JSON.stringify({event: "createVehicle", id: res.insertId, plate: data.plate, vin: data.vin, make: data.make, model: data.model, color: data.color, year: data.year, regto: data.regto, lstate: data.lstate, rstate: data.rstate}));
                    });
                });
                break;
        }
    });


    ws.on('close', (code, reason) => {
        broadcastEmitter.removeListener("broadcast", lf);
        if(user_type === "LEO") {
            broadcastEmitter.emit("broadcast", JSON.stringify({event: 'statusUpdate', unit: ws_session.callsign, type: user_type, set_by: ws_session.callsign, status: "10-42"}));
            let ind = -1;
            for(let i = 0; i<active_leo.length;i++) {
                if(active_leo[i].unit === ws_session.callsign) {
                    ind = i;
                    break;
                }
            }
            if(ind !== -1) {
                console.log(active_leo[ind].call);
                console.log(msql.format("DELETE FROM `calls_attached` WHERE `unit`=?", [ws_session.callsign]));
                if(active_leo[ind] !== undefined && active_leo[ind].call !== null) {
                    mysql.query("DELETE FROM `calls_attached` WHERE `unit`=?", [ws_session.callsign]);
                    active_leo[ind].call = null;
                }
                if(ind !== -1) active_leo.splice(ind, 1);
            }
        }
        console.log("close");
    });

    ws.send(JSON.stringify({event: 'hello', heartbeat_interval: 60000}));

};