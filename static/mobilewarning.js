$(document).ready(function() {
    if(window.location.pathname === "/mobile") return;
    if(localStorage.mobilewarning == null && (typeof window.orientation !== "undefined") || (navigator.userAgent.indexOf('IEMobile') !== -1)) {
        window.location = "/mobile";
    }
});