const express = require('express');
const session = require('express-session');
const config = require('./config.json');
const app = express();
const SFS = require('express-mysql-session')(session);
const mysql = require('mysql');
const globals = require('./globals.js');
const bp = require('body-parser');

console.log("Launching MDT");

app.set('view engine', 'pug');
app.set('views', 'views');

let ss = new SFS(config.mysql);

let connection = mysql.createPool({
    connectionLimit: 10,
    host: config.mysql.host,
    user: config.mysql.user,
    password: config.mysql.password,
    database: config.mysql.database
});

globals.mysql = connection;

connection.query("SHOW TABLES LIKE 'users'", (error, results, fields) => {
    if(results.length !== 0) return;
    connection.query("CREATE TABLE `users` (\n" +
        "  `id` int(11) NOT NULL AUTO_INCREMENT,\n" +
        "  `user_id` varchar(45) NOT NULL,\n" +
        "  `is_approved` int(11) DEFAULT '0',\n" +
        "  `is_admin` varchar(45) DEFAULT '0',\n" +
        "  `comments` varchar(45) DEFAULT NULL,\n" +
        "  PRIMARY KEY (`id`)\n" +
        ") ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8;\n", (err, res, f) => {
        if(err) console.log(err);
    });
});

connection.query("SHOW TABLES LIKE 'callsigns'", (error, results, fields) => {
    if(results.length !== 0) return;
    connection.query("CREATE TABLE `callsigns` (\n" +
        "  `id` int(11) NOT NULL AUTO_INCREMENT,\n" +
        "  `assigned_to` int(11) NOT NULL,\n" +
        "  `callsign` varchar(45) NOT NULL,\n" +
        "  `comments` varchar(45) DEFAULT NULL,\n" +
        "  PRIMARY KEY (`id`),\n" +
        "  UNIQUE KEY `callsign_UNIQUE` (`callsign`)\n" +
        ") ENGINE=InnoDB AUTO_INCREMENT=23 DEFAULT CHARSET=utf8;\n", (err, res, f) => {
        if(err) console.log(err);
    });
});

connection.query("SHOW TABLES LIKE 'calls'", (error, results, fields) => {
    if(results.length !== 0) return;
    connection.query("CREATE TABLE `calls` (\n" +
        "  `call_id` int(11) NOT NULL AUTO_INCREMENT,\n" +
        "  `origin` varchar(45) DEFAULT 'Unknown',\n" +
        "  `type` varchar(45) NOT NULL,\n" +
        "  `title` varchar(200) NOT NULL,\n" +
        "  `location` varchar(200) NOT NULL,\n" +
        "  `description` longtext NOT NULL,\n" +
        "  `primary_unit` varchar(45) DEFAULT '',\n" +
        "  `archived` int(11) NOT NULL DEFAULT '0',\n" +
        "  PRIMARY KEY (`call_id`)\n" +
        ") ENGINE=InnoDB AUTO_INCREMENT=173 DEFAULT CHARSET=utf8;\n", (err, res, f) => {
        if (err) console.log(err);
    });
});

connection.query("SHOW TABLES LIKE 'bolos'", (error, results, fields) => {
    if(results.length !== 0) return;
    connection.query("CREATE TABLE `bolos` (\n" +
        "  `bolo_id` int(11) NOT NULL AUTO_INCREMENT,\n" +
        "  `type` varchar(45) NOT NULL DEFAULT 'Bolo',\n" +
        "  `description` longtext NOT NULL,\n" +
        "  `reason` varchar(200) NOT NULL DEFAULT '',\n" +
        "  `last_seen` varchar(200) NOT NULL DEFAULT '',\n" +
        "  `active` int(11) NOT NULL DEFAULT '1',\n" +
        "  PRIMARY KEY (`bolo_id`)\n" +
        ") ENGINE=InnoDB AUTO_INCREMENT=13 DEFAULT CHARSET=utf8;\n", (err, res, f) => {
        if (err) console.log(err);
    });
});

connection.query("SHOW TABLES LIKE 'calls_attached'", (error, results, fields) => {
    if(results.length !== 0) return;
    connection.query("CREATE TABLE `calls_attached` (\n" +
        "  `id` int(11) NOT NULL AUTO_INCREMENT,\n" +
        "  `call_id` varchar(45) NOT NULL,\n" +
        "  `unit` varchar(45) NOT NULL,\n" +
        "  PRIMARY KEY (`id`)\n" +
        ") ENGINE=InnoDB DEFAULT CHARSET=utf8;\n", (err, res, f) => {
        if (err) console.log(err);
    });
});

connection.query("SHOW TABLES LIKE 'call_log'", (error, results, fields) => {
    if(results.length !== 0) return;
    connection.query("CREATE TABLE `call_log` (\n" +
        "  `id` int(11) NOT NULL AUTO_INCREMENT,\n" +
        "  `call_id` varchar(45) NOT NULL,\n" +
        "  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP,\n" +
        "  `from` varchar(45) NOT NULL,\n" +
        "  `info` varchar(100) NOT NULL,\n" +
        "  PRIMARY KEY (`id`)\n" +
        ") ENGINE=InnoDB AUTO_INCREMENT=58 DEFAULT CHARSET=utf8;\n", (err, res, f) => {
        if (err) console.log(err);
    });
});

connection.query("TRUNCATE `calls_attached`");

app.use(session({
    name: 'mdtsession',
    rolling: true,
    resave: true,
    saveUninitialized: false,
    secret: config.web.secret,
    store: ss
}));

app.use(bp.json());

function authMiddleware(req, res, next) {
    if(req.session.token == null) {
        res.sendStatus(403);
        return;
    }
    if(!req.userdata.is_approved) {
        res.render("pages/notapproved.pug");
        return;
    }
    next();
}

function adminMiddleware(req, res, next) {
    if(req.session.token == null) {
        res.sendStatus(403);
        return;
    }
    if(!req.userdata.is_approved || !req.userdata.is_admin) {
        res.redirect('/');
        return;
    }
    next();
}

app.use((req, res, next) => {
    let userdata = {};
    req.sql_conn = connection;
    if(req.session.token == null) return next();
    connection.query("SELECT * FROM `users` WHERE `user_id`=?", [req.session.user.id], (err, res, f) => {
        if(res.length === 0) {
            connection.query("INSERT INTO `users` (user_id)" +
                "\nVALUES(?)", [req.session.user.id], (e, r, fe) => {
                userdata.is_approved = false;
                userdata.is_admin = false;
                userdata.callsigns = [];
                req.userdata = userdata;
                next();
            });
            return;
        }
        let result = res[0];
        connection.query("SELECT `callsign` FROM `callsigns` WHERE `assigned_to`=?", [result.id], (e, r, fe) => {
            let callsigns = [];
            r.forEach((e) => {
                callsigns.push(e.callsign);
            });
            userdata.is_approved = result.is_approved;
            userdata.is_admin = result.is_admin;
            userdata.callsigns = callsigns;
            req.userdata = userdata;
            next();
        });
    });
});

app.use('/cad', authMiddleware);
app.use('/mdt', authMiddleware);
app.use('/admin', adminMiddleware);
app.use('/api', adminMiddleware);

app.use('/static', express.static(__dirname + "/static"));

let expressWs = require('express-ws')(app);

app.get('/', (req, res) => {
    if(req.session.token == null) {
        res.render('pages/index.pug');
        return;
    }
    if(!req.userdata.is_approved) {
        res.render('pages/notapproved.pug', {req: req});
        return;
    }
    res.render('pages/mdtconfig.pug', {req: req});
});

app.get('/cad', (req, res) => {
    res.render("pages/cad.pug");
});

app.get('/mdt', (req, res) =>{
    res.render("pages/mdt.pug");
});

app.get('/civ', (req, res) => {
    res.render("pages/civ.pug");
});

let active_leos = [];

app.ws('/ws', require('./websocketConnection'));

app.get('/unsupported', (req, res) => {
    res.render("pages/unsupported.pug");
});

app.get('/unavailable', (req, res) => {
    res.render("pages/unavailable.pug");
});

app.get('/mobile', (req, res) => {
    res.render("pages/mobile.pug");
});

app.get('/admin', (req, res) => {
    res.render("pages/admin.pug");
});

(require('./api'))(app);

const auth = new (require('./auth/'+config.authentication.name))(app);

app.listen(config.web.port);
console.log("MDT launched on "+config.web.port);

module.exports.sql_conn = connection;