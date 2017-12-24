const unirest = require('unirest');
const discordApi = "https://discordapp.com/api";
const mysql = require('mysql');
let msql = require('./globals').mysql;
const config = require('./config.json');

function token() {
    return config.discord.token;
}

module.exports = (app) => {
    app.get('/api/user/:id', (req, res) => {
        var t = token();
        unirest.get(discordApi+'/users/'+encodeURIComponent(req.params.id)).headers({'Authorization': 'Bot '+t})
            .end((response) => {
                let resp = response.body;
                if(typeof resp.code !== "undefined") {
                    res.sendStatus(404);
                    return;
                }
                msql.query('SELECT `id`, `is_approved`, `is_admin` FROM `users` WHERE `user_id`=?', [req.params.id], (e, r, f) => {
                    if(r.length !== 0) {
                        msql.query('SELECT `callsign` FROM `callsigns` WHERE `assigned_to`=?', [r[0].id], (ee, rr, ff) => {
                            resp.callsigns = [];
                            rr.forEach((e) => {
                                resp.callsigns.push(e.callsign);
                            });
                            resp.approved = r[0].is_approved == 1;
                            resp.admin = r[0].is_admin == 1;
                            res.json(resp);
                        });
                    } else {
                        msql.query('INSERT INTO `users` (user_id, is_approved, is_admin) VALUES(?, ?, ?)', [req.params.id, 0, 0], (e, r, f) => {
                            if(e) {
                                console.log(e);
                            }
                            resp.callsigns = [];
                            resp.approved = false;
                            resp.admin = false;
                            res.json(resp);
                        });
                    }
                });
            });
    });
    app.get('/api/user/:id/approve', (req, res) => {
        msql.query('SELECT `id` FROM `users` WHERE `user_id`=?', [req.params.id], (e, r, f) => {
            if(r.length !== 0) {
                msql.query('UPDATE `users` SET `is_approved`=? WHERE `id`=?', [1, r[0].id], (e, r, f) => {
                    if(e) {
                        console.log(e);
                    }
                    res.sendStatus(203);
                });
            } else {
                msql.query('INSERT INTO `users` (user_id, is_approved, is_admin) VALUES(?, ?, ?)', [req.params.id, 1, 0], (e, r, f) => {
                    if(e) {
                        console.log(e);
                    }
                    res.sendStatus(203);
                });
            }
        });
    });
    app.get('/api/user/:id/unapprove', (req, res) => {
        if(req.session.user.id === req.params.id) {
            res.sendStatus(400);
            return;
        }
        msql.query('SELECT `id`, `is_admin` FROM `users` WHERE `user_id`=?', [req.params.id], (e, r, f) => {
            if(r.length !== 0) {
                if(r[0].is_admin == 1) {
                    res.sendStatus(400);
                    return;
                }
                msql.query('UPDATE `users` SET `is_approved`=? WHERE `id`=?', [0, r[0].id], (e, r, f) => {
                    if(e) {
                        console.log(e);
                    }
                    res.sendStatus(204);
                });
            } else {
                msql.query('INSERT INTO `users` (user_id, is_approved, is_admin) VALUES(?, ?, ?)', [req.params.id, 0, 0], (e, r, f) => {
                    if(e) {
                        console.log(e);
                    }
                    res.sendStatus(204);
                });
            }
        });
    });
    app.put('/api/user/:id/callsign', (req, res) => {
        if(req.body.callsign == null) {
            res.sendStatus(400);
            return;
        }
        msql.query('SELECT `id` FROM `users` WHERE `user_id`=?', [req.params.id], (e, r, f) => {
            if(r.length !== 0) {
                msql.query('INSERT INTO `callsigns` (assigned_to, callsign) VALUES(?, ?)', [r[0].id, req.body.callsign], (ee, rr, ff) => {
                    if(e) {
                        console.log(e);
                    }
                    res.sendStatus(204);
                });
            } else {
                req.sendStatus(204);
            }
        });
    });
    app.delete('/api/callsign', (req, res) => {
        if(req.body.callsign == null) {
            res.sendStatus(400);
            return;
        }
        msql.query('DELETE FROM `callsigns` WHERE `callsign`=?', [req.body.callsign], (e, r, f) => {
            if(e) {
                console.log(e);
            }
            res.sendStatus(204);
        });
    });
    console.log("API registered");
};