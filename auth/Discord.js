let config = require('../config.json');
const unirest = require('unirest');

function constructOAuthURL(host, state) {
    let base = "https://discordapp.com/oauth2/authorize";
    let args = "?client_id="+encodeURIComponent(config.discord.client_id)+"&scope=identify+email+guilds&response_type=code&state="+encodeURIComponent(state)+"&redirect_uri="+encodeURIComponent(constructCallbackURL(host));
    return base+""+args;
}

function constructCallbackURL(host) {
    if(config.web.port !== 80 && host === "localhost") {
        host += ":"+config.web.port;
    }
    return "https://"+host+""+config.authentication.loginCallback;
}

function generateState() {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    for (var i = 0; i < 15; i++)
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    return text;
}

class DiscordAuth {
    
    constructor(express) {
        express.get(config.authentication.loginURL, this.loginEndpoint);
        express.get(config.authentication.loginCallback, this.loginProcess);
    }

    loginEndpoint(req, res) {
        req.session.loginState = generateState();
        res.redirect(constructOAuthURL(req.hostname, req.session.loginState));
    }

    loginProcess(req, res) {
        if(req.session.loginState !== req.query.state) {
            res.send("Login failed.");
            req.session.loginState = null;
            return;
        }
        req.session.loginState = null;
        if(req.query.code == undefined) {
            res.sendStatus(400);
            return;
        }
        unirest.post('https://discordapp.com/api/oauth2/token').headers({'Accept': 'application/json', 'Content-Type': 'application/x-www-form-urlencoded'})
            .send({"client_id": encodeURIComponent(config.discord.client_id), "client_secret": encodeURIComponent(config.discord.secret), "grant_type": "authorization_code", "code": encodeURIComponent(req.query.code), "redirect_uri": constructCallbackURL(req.hostname)})
            .end((response) => {
                let body = response.body;
                req.session.token = body.access_token;
                if(body.scope !== "identify email guilds") {
                    req.session.token = null;
                    res.send("Invalid scope.");
                    req.session.save();
                    return;
                }
                unirest.get('https://discordapp.com/api/users/@me/guilds').headers({'Authorization': 'Bearer '+req.session.token})
                    .end((response) => {
                        var inGuild = false;
                        response.body.forEach((e) => {
                            if(e.id === config.discord.mustBeInServer) {
                                inGuild = true;
                            }
                        });
                        if(!inGuild && config.discord.restrictToServer) {
                            req.session.token = null;
                            req.session.save();
                            res.send("Not in server.");
                            return;
                        }
                        unirest.get('https://discordapp.com/api/users/@me').headers({'Authorization': 'Bearer '+req.session.token})
                            .end((response) => {
                                req.session.user = response.body;
                                req.session.save();
                                res.redirect('/');
                            });
                    });
            });
    }

}

module.exports = DiscordAuth;