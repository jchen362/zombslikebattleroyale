function test() {
    //console.log("made it here");
    document.getElementById("canvas").playerName = document.getElementById("playerName").value;
    document.getElementById("start").style.display = "none";
    document.getElementById("canvas").style.display = "block";
    //console.log(document.getElementById("selectWeapons").value);
}

function reset() {
    location.reload();
}