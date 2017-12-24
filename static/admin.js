function esc(text) {
    return $("<div>").text(text).html();
}

function searchUser() {
    $.ajax("/api/user/"+encodeURIComponent($("#searchUserId").val())).done(function(result) {
        $("#userid").text(" "+result.id);
        $("#username").text(" "+result.username+"#"+result.discriminator);
        $("#approved").text(" "+(result.approved ? 'Yes' : 'No'));
        $("#admin").text(" "+(result.admin ? 'Yes' : 'No'));
        $("#searchResults").css("display", "block");
        if(result.approved == 1) {
            $("#approveButton").css("display", "none");
            $("#unapproveButton").css("display", "block");
        } else {
            $("#approveButton").css("display", "block");
            $("#unapproveButton").css("display", "none");
        }
        $(".callsigns").html("");
        result.callsigns.forEach(function(e) {
            $(".callsigns").html($(".callsigns").html()+"<div class=\"callsign\"><div class=\"row\"><div class=\"col ccalsign\" style=\"padding-left: 20px;\">"+esc(e)+"</div><div class=\"col\"><div style=\"text-align: right; padding-right: 10px;\"><a href='javascript:void(0);' onclick='removeCallsign(this);'>Delete</a></div></div></div></div>");
        });
    }).fail(function(xhr, status, error) {
        $("#notFoundModal").modal('show');
    });
}

$(document).ready(function() {
    $("#notFoundModal").modal({focus: false, show: false});
});

function approveUser() {
    $.ajax("/api/user/"+encodeURIComponent($("#userid").text().substr(1))+"/approve").done(function(result) {
        $("#approved").text(" Yes");
        $("#approveButton").css("display", "none");
        $("#unapproveButton").css("display", "block");
    });
}

function unapproveUser() {
    $.ajax("/api/user/"+encodeURIComponent($("#userid").text().substr(1))+"/unapprove").done(function(result) {
        $("#approved").text(" No");
        $("#approveButton").css("display", "block");
        $("#unapproveButton").css("display", "none");
    });
}

function addCallsign() {
    let usrid = encodeURIComponent($("#userid").text().substr(1));
    let cs = $("#newCallsign").val();
    $("#newCallsign").val("");
    $.ajax("/api/user/"+usrid+"/callsign", {
        method: "PUT",
        contentType: "application/json",
        data: JSON.stringify({callsign: cs})
    }).done(function(result) {
        $(".callsigns").html($(".callsigns").html()+"<div class=\"callsign\"><div class=\"row\"><div class=\"col ccallsign\" style=\"padding-left: 20px;\">"+esc(cs)+"</div><div class=\"col\"><div style=\"text-align: right; padding-right: 10px;\"><a href='javascript:void(0);' onclick='removeCallsign(this)'>Delete</a></div></div></div></div>");
    });
}

function removeCallsign(obj) {
    let par = $(obj).parent().parent().parent().parent();
    let cs = par.find('.ccalsign').text();
    $.ajax("/api/callsign", {
        method: "DELETE",
        contentType: "application/json",
        data: JSON.stringify({callsign: cs})
    }).done(function(result) {
        par.remove();
    });
}