function patrol(callsign) {
    localStorage.callsign = callsign;
    if(callsign.startsWith("C-")) {
        window.location = "/cad";
    } else if(callsign.startsWith("Civ")) {
        window.location = "/civ";
    }
    else {
        window.location = "/mdt";
    }
}