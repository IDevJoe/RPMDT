function patrol(callsign) {
    localStorage.callsign = callsign;
    if(callsign.startsWith("C")) {
        window.location = "/cad";
    } else {
        window.location = "/mdt";
    }
}