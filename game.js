import { initializeApp } from "https://www.gstatic.com/firebasejs/9.9.1/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.9.1/firebase-analytics.js";
import {getFirestore, collection, getDocs, QuerySnapshot, getDocsFromServer} from "https://www.gstatic.com/firebasejs/9.9.1/firebase-firestore.js";
import { getAuth, onAuthStateChanged, signInAnonymously, signOut} from "https://www.gstatic.com/firebasejs/9.9.1/firebase-auth.js";
import { getDatabase, ref, set, onDisconnect, onValue, child, get, query, push, remove} from "https://www.gstatic.com/firebasejs/9.9.1/firebase-database.js";

//pistol
//sniper
//assault rifle
//possibly rocket launcher
//add ability to make circle walls
//ad more texture to the map

//player movement variables
let vx = 0;
let vy = 0;
let nextClickWall = false;
let nearestCollisionDistance = Number.MAX_VALUE;
const wallAge = 10000;

let playerId;
let playerRef;
let hasCollision = false;
let hasSetName = false;
const colors = ["orange", "black", "blue", "green", "purple", "yellow"]
let timeLastShot = 0;
let grass = [];
let rocks = [];
let grassColors = ["rgba(13, 124, 5, 0.8)", "rgba(81, 149, 76, 0.8)", "rgba(89, 201, 123, 0.8)"]
let rockColors = ["rgba(19, 16, 18, 0.8)", "rgba(109, 103, 106, 0.9)", "rgba(67, 62, 64, 0.9)", "rgba(28, 17, 23, 0.44)"]
let grassImgs = ["https://jchen362.github.io/zombslikebattleroyale/Images/grassSymbol.png", "https://jchen362.github.io/zombslikebattleroyale/Images/grass-455.png"]
let wallCoolDown = 4000;
let lastWallTime = 0;

const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
let projectileVelocity = 2;
let weaponDmg = 1;
let coolDown = 600;
let bulletSize = 8;

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;


const firebaseConfig = {
    apiKey: "AIzaSyD06iJXvYQrdg9bUyoW2lVQ8xMg6B9lT5Q",
    authDomain: "battle-royale-84d04.firebaseapp.com",
    databaseURL: "https://battle-royale-84d04-default-rtdb.firebaseio.com",
    projectId: "battle-royale-84d04",
    storageBucket: "battle-royale-84d04.appspot.com",
    messagingSenderId: "259514005459",
    appId: "1:259514005459:web:fc77f13cbb69d9321da126",
    measurementId: "G-N9J8RFYGFV",
  };

  
const app = initializeApp(firebaseConfig);
const database = getFirestore(app);

var auth2 = getAuth();
const db = getDatabase(app);

//auxuliary functions
function calculateDistance(x1, y1, x2, y2) {
    let dist = Math.sqrt(Math.pow(x1 - x2, 2) + Math.pow(y1 - y2, 2));
    //console.log(dist);
    return dist;
}

function getRandomColor() {
    let chooser = Math.random() * (5);
    chooser = Math.floor(chooser);
    return colors[chooser];
}

async function setName(playerName) {
    let s = await get(playerRef);
    set(playerRef, {
        name: playerName,
        direction: s.val().direction,
        color: s.val().color,
        x: s.val().x,
        y: s.val().y,
        id: playerId,
        health: s.val().health,

    })
}

function endGame() {
    document.getElementById("end").style.display = "block";
    signOut(auth2);
    remove(playerRef);
    cancelAnimationFrame(runGame);
    canvas.style.display = "none";
}

function setWeapon(weap) {
    if (weap === "pistol") {
        projectileVelocity = 6;
        weaponDmg = 2;
        coolDown = 600;
    } else if (weap === "rifle") {
        projectileVelocity = 4;
        weaponDmg = 1;
        coolDown = 200;
    } else if (weap = "sniper") {
        projectileVelocity = 10;
        weaponDmg = 5;
        coolDown = 1600;
    } else if (weap = "rocket") {
        weaponDmg = 10;
        coolDown = 2000;
    }
}

function getGrassCoordinates() {
    for (let i = 0; i < 30; i++) {
        let randomX = Math.random() * canvas.width;
        let randomY = Math.random() * canvas.height;
        let grassWidth = Math.random() * 6 + 4;
        let grassHeight = Math.random() * 4 + 1;
        let chooseColor = Math.ceil(Math.random() * 2);
        //let info = [randomX, randomY, grassWidth, grassHeight, chooseColor];
        let grassInfo = {
            x: randomX,
            y: randomY,
            width: grassWidth,
            height: grassHeight,
            color: chooseColor,
            img: Math.floor(Math.random() * 2),
        };
        grass.push(grassInfo);
    }
}
getGrassCoordinates();

function getRockCoordinates() {
    for (let i = 0; i < 20; i++) {
        let randomX = Math.random() * canvas.width;
        let randomY = Math.random() * canvas.height;
        let chooseColor = Math.ceil(Math.random() * 3);
        let rockRadius = Math.random() * (4) + 2;
        let rockInfo = {
            x: randomX,
            y: randomY,
            color: chooseColor,
            radius: rockRadius,
        }
        
        rocks.push(rockInfo);
    }
}
getRockCoordinates();

//TODO TOMORROW
async function renderMap() {
    ctx.beginPath();
    ctx.rect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "rgba(150, 242, 134, 0.8)";
    ctx.fill();
    
    for (let i = 0; i < 20; i++) {
        var img = new Image();

        img.src = grassImgs[grass[i].img];
        ctx.drawImage(img, grass[i].x, grass[i].y, 30, 30);
    }

    for (let i = 0; i < 20; i++) {
        ctx.beginPath();
        ctx.arc(rocks[i].x, rocks[i].y, rocks[i].radius, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.fillStyle = rockColors[rocks[i].color];
        ctx.fill();
    }
    

    
}


const renderCharacter = (x, y, name, color, health) => {
    //character
    ctx.beginPath();
    ctx.arc(x, y, 15, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = "black";
    ctx.stroke();
    //name
    ctx.fillStyle = "black";
    ctx.font = "15px Arial";
    ctx.textAlign = "center";
    ctx.fillText(name, x, y + 26);
    //health
    ctx.beginPath();
    ctx.rect(x - health * 2, y - 25, health * 4, 7);
    ctx.fillStyle = "red";
    ctx.fill();
    ctx.lineWidth = 1;
    ctx.strokeStyle = "black";
    ctx.stroke();
    

}

const renderBullet = (x, y) => {
    ctx.beginPath();
    ctx.arc(x, y, bulletSize, 0, 2 * Math.PI);
    ctx.closePath();
    ctx.fillStyle = "red";
    ctx.fill();  
}

const allPlayersRef = ref(db, 'players');
const allBulletsRef = ref(db, 'bullets');
const allWallsRef = ref(db, 'walls');

function clamp(min, max, value) {
    if (value < min) {
        return min;
    } else if (value > max) {
        return max;
    } else {
        return value;
    }
} 


function initGame() {
    console.log("running game now");




    //might need to change
    
    /*
    onValue(allPlayersRef, (snapshot) => {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        //console.log("onValue has been called");
        snapshot.forEach((childSnapshot) => {
            //console.log(childSnapshot);
            const val = childSnapshot.val();
            renderCharacter(val.x, val.y);
        })
    })
    */


    //Player controls
    var interval;
    var movementInterval;
    let keysPressed = {};
    let shooting = false;
    document.addEventListener("keydown", (e) => {
        keysPressed[e.key] = true;
        moveCharacter(keysPressed);
    });

    document.addEventListener("keyup", (e) => {
        keysPressed[e.key] = false;
        moveCharacter(keysPressed);
    });
    document.addEventListener("mousedown", (e) => {
        if (nextClickWall === true) {
            nextClickWall = false;
            createWall(e);
        } else {
        console.log("Shooting");
        shooting = true;
        interval = setInterval(async () => {
            createProjectile(e)
        }, 5);
        }
    })
    document.addEventListener("mousemove", (e) => {
        if (interval) {
            clearInterval(interval);
        }
        if (shooting === true) {
            interval = setInterval(async () => {
                createProjectile(e)
            }, 5);
        }

    })
    
    document.addEventListener("mouseup", (e) => {
        if (interval) {
            clearInterval(interval);
        }
        shooting = false;
    })

    document.addEventListener("keydown", (e) => {
        if (e.key === " ") {
            nextClickWall = true;
        }
    })

    async function createWall(e) {
        console.log("space pressed");
        
        if (Date.now() - lastWallTime < wallCoolDown) {
            return;
        }
        
        lastWallTime = Date.now();

        //check to see if wall will collide with player or with other obstacles 
        //if so, don't create
        let playerInfo = await get(playerRef);
        let data = playerInfo.val();
        let angle = Math.atan2((e.clientY - data.y),(e.clientX - data.x));
        console.log(angle);
        let newWallKey = await push(allWallsRef).key;

        //bottom
        if (angle > (Math.PI/4) && angle < (3 *Math.PI/4)) {
            set(ref(db, `walls/${newWallKey}`), {
                x: data.x - 25,
                y: data.y + 40,
                width: 50,
                height: 10,
                natural: false,
                health: 15,
                color: "blue",
                age: Date.now(),
                id: newWallKey,
            })
        }
        //right
        else if (angle < Math.PI/4 && angle > (-Math.PI/4)) {
            set(ref(db, `walls/${newWallKey}`), {
                x: data.x + 40,
                y: data.y - 25,
                width: 10,
                height: 50,
                natural: false,
                health: 15,
                color: "blue",
                age: Date.now(),
                id: newWallKey,
            })
            
        }
        //top
        else if (angle < (-Math.PI/4) && angle > (-Math.PI * 3/4)) {
            set(ref(db, `walls/${newWallKey}`), {
                x: data.x - 25,
                y: data.y - 50,
                width: 50,
                height: 10,
                natural: false,
                health: 15,
                color: "blue",
                age: Date.now(),
                id: newWallKey,
            })

        } 
        //left
        else {
            set(ref(db, `walls/${newWallKey}`), {
                x: data.x - 50,
                y: data.y - 25,
                width: 10,
                height: 50,
                natural: false,
                health: 15,
                color: "blue",
                age: Date.now(),
                id: newWallKey,
            })

        }

        //if not, create

        //also, refactor code so players cannot run into walls and bullets can run into walls
        //make walls die after some time if created manually
    }


    async function createProjectile(e) {
        if (Date.now() - timeLastShot < coolDown) {
            return;
        }
        timeLastShot = Date.now();

        let p = await get(playerRef);
        let xPos = p.val().x;
        let yPos = p.val().y;


        //FIX THIS
        const angle = Math.atan2((e.clientY - yPos),(e.clientX - xPos));
        //const timeOut = 100;

    
        //inaccuracy
        const inaccuracy = Math.random() * (0.3) - 0.15;


        const xVelocity = Math.cos(angle + inaccuracy) * projectileVelocity;
        const yVelocity = Math.sin(angle + inaccuracy) * projectileVelocity;


        const newProjectileKey = await push(allBulletsRef).key;

        
        //this works jsut annoying rn
        
        set(ref(db, `bullets/${newProjectileKey}`), {
            id: newProjectileKey,
            bulletX: xPos,
            bulletY: yPos,
            xVelocity: xVelocity,
            yVelocity: yVelocity,
            age: Date.now(),
            owner: playerId,
            damage: weaponDmg,
            type: document.getElementById("selectWeapons").value,
        });
        

        

    }

    async function moveCharacter(keysPressed){
        let xModifier = 0;
        let yModifier = 0;
        if (keysPressed["w"] === true) { //w (forward)
            yModifier = -0.6;
        }  
        if (keysPressed["s"] === true) { //s (backwards)
            yModifier = 0.6;
        }
        if (keysPressed["a"] === true) { //a (left)
            xModifier = -0.6;
        }
        if (keysPressed["d"] === true) { //d (right)
            xModifier = 0.6;
        }
        vx = xModifier;
        vy = yModifier;
        
        
    }

}

async function checkCollision() {
    let playerSnapshot = await get(playerRef);
    const playerData = playerSnapshot.val();


    let tempX = playerData.x + vx;
    let tempY = playerData.y + vy;
    let closest = Number.MAX_VALUE;
    let numIterated = 0;
    let noCollision = true;

    const allPlayers = await getPlayers();
    const allWalls = await getWalls();

    for (let i = 0; i < allPlayers.length; i++) {
        numIterated++;
        if (allPlayers[i].id !== playerId) {
            let distance = calculateDistance(tempX, tempY, allPlayers[i].x, allPlayers[i].y);
            if (distance < 34) {
                vx = 0;
                vy = 0;
                noCollision = false;
            }
        }
    }

    for (let i = 0; i < allWalls.length; i++) {
        let closestX = clamp(allWalls[i].x, allWalls[i].x + allWalls[i].width, tempX);
        let closestY = clamp(allWalls[i].y, allWalls[i].y + allWalls[i].height, tempY);
        let distance = calculateDistance(tempX, tempY, closestX, closestY);
        numIterated++;
        if (distance < 17) {
            console.log(distance);
            vx = 0;
            vy = 0;
            noCollision = false;
        }
    }

    /*
    if (noCollision === true && numIterated === (allWalls.length + allPlayers.length)) {
        let playerSnapshot = await get(playerRef);
        const playerData = playerSnapshot.val();
        set(playerRef, {
            name: playerData.name,
            direction: playerData.direction,
            color: playerData.color,
            x: playerData.x + vx,
            y: playerData.y + vy,
            id: playerId,
            health: playerData.health,
        })
    }

    
    return true;
    */

    return set(playerRef, {
        name: playerData.name,
        direction: playerData.direction,
        color: playerData.color,
        x: playerData.x + vx,
        y: playerData.y + vy,
        id: playerId,
        health: playerData.health,
    }).then(() => {
        console.log("write succedded");
    })
     

}
async function getPlayers() {
    let playersSnapShot = await get(allPlayersRef);
    let arr = [];
    playersSnapShot.forEach((snapshot) => {
        arr.push(snapshot.val());
    })

    return arr;
}

async function getProjectiles() {
    let bulletsSnapShot = await get(allBulletsRef);
    let arr = [];
    bulletsSnapShot.forEach((snapshot) => {
        if (Date.now() - snapshot.val().age <= 6000) {
            arr.push(snapshot.val());
        }
    })

    //remove "old bullets"
    let toBeRemoved = await getOldBullets();
    for (let i = 0; i < toBeRemoved.length; i++) {
        remove(ref(db, `bullets/${toBeRemoved[i].id}`));
    }

    return arr;
}


//TODO: FIX THIS
async function detectHits(players, bullets, allWalls) {
    let index = -1;
    for (let i = 0; i < players.length; i++) {
        if (players[i].id === playerId) {
            index = i;
        }
    }

    let thisPlayer = players[index];
    for (let i = 0; i < bullets.length; i++) {
        let bulletPosX = bullets[i].bulletX + bullets[i].xVelocity * ((Date.now() - bullets[i].age) / 25);
        let bulletPosY = bullets[i].bulletY + bullets[i].yVelocity * ((Date.now() - bullets[i].age) / 25);

        //only detect bullet hits to walls that you shoot
        if (bullets[i].owner === playerId) {
            for (let j = 0; j < allWalls.length; j++) {
                //detect if it hits
                let closestX = clamp(allWalls[j].x, allWalls[j].x + allWalls[j].width, bulletPosX);
                let closestY = clamp(allWalls[j].y, allWalls[j].y + allWalls[j].height, bulletPosY);
                let distance = calculateDistance(bulletPosX, bulletPosY, closestX, closestY);
                if (distance < bulletSize + 17) {
                    console.log(allWalls[j].health);
                    remove(ref(db, `bullets/${bullets[i].id}`));
                    if ((allWalls[j].health - bullets[i].damage) <= 0) {
                        remove(ref(db, `walls/${allWalls[j].id}`));
                    } else {
                        set(ref(db, `walls/${allWalls[j].id}`), {
                            x: allWalls[j].x,
                            y: allWalls[j].y,
                            width: allWalls[j].width,
                            height: allWalls[j].height,
                            natural: allWalls[j].natural,
                            health: allWalls[j].health - bullets[i].damage,
                            color: allWalls[j].color,
                            age: allWalls[j].age,
                            id: allWalls[j].id,
                        })
                    }
                }
            }
        }


        //only detect hits for yourself
        if (bullets[i].owner !== playerId && calculateDistance(bulletPosX, bulletPosY, thisPlayer.x, thisPlayer.y) <= 23) {
            console.log(players[index].health);
            remove(ref(db, `bullets/${bullets[i].id}`));
            if (players[index].health - bullets[i].damage <= 0) {
                endGame();
                return;
            }
            set(ref(db, `players/${playerId}`), {
                id: playerId,
                name: players[index].name,
                direction: players[index].name,
                color: players[index].color,
                x: players[index].x,
                y: players[index].y,
                health: players[index].health - bullets[i].damage,
            })

            //TODO SET HEALTH BAR
        }
    }
    
}

async function getOldBullets() {
    let bulletsSnapShot = await get(allBulletsRef);
    let toBeRemoved = [];

    bulletsSnapShot.forEach((snapshot) => {
        if (Date.now() - snapshot.val().age > 3000) {
            toBeRemoved.push(snapshot.val());
        }
    })

    return toBeRemoved;
}

async function getWalls() {
    let wallsSnapShot = await get(allWallsRef);
    let wallsArr = [];
    let oldWalls = [];
    wallsSnapShot.forEach((childSnapshot) => {
        let wallVal = childSnapshot.val();
        if (Date.now() - wallVal.age < wallAge) {
            wallsArr.push(wallVal);
        } else {
            oldWalls.push(wallVal);
        }
    })

    rmeoveOldWalls(oldWalls);
    return wallsArr;
}

async function rmeoveOldWalls(oldWalls) {
    for (let i = 0; i < oldWalls.length; i++) {
        remove(ref(db, `walls/${oldWalls[i].id}`));
    }
}

function renderWalls(wallsArr) {
    for (let i = 0; i < wallsArr.length; i++) {
        ctx.beginPath();
        ctx.rect(wallsArr[i].x, wallsArr[i].y, wallsArr[i].width, wallsArr[i].height);
        ctx.fillStyle = wallsArr[i].color;
        ctx.fill();
        ctx.lineWidth = 2;
        ctx.strokeStyle = "black";
        ctx.stroke();
    }
}

async function renderAll() {
    //let playersSnapShot = await get(allPlayersRef);
    //let numPlayers = playersSnapShot.size;
    //console.log("rendering")
    //let collision = await checkCollision();
    let playerSnapshot = await get(playerRef);
    const playerData = playerSnapshot.val();
    set(playerRef, {
        name: playerData.name,
        direction: playerData.direction,
        color: playerData.color,
        x: playerData.x + vx,
        y: playerData.y + vy,
        id: playerId,
        health: playerData.health,
    })
    

    let arr = await getPlayers();
    let arrBullets = await getProjectiles();
    let arrWalls = await getWalls();
    detectHits(arr, arrBullets, arrWalls);

    for (let i = -3; i < arr.length + arrBullets.length; i++) {
        if (i === -3) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
        } else if (i === -2) {
            renderMap();
        } else if (i === -1) {
            renderWalls(arrWalls);
        } else if (i < arr.length) {
            renderCharacter(arr[i].x, arr[i].y, arr[i].name, arr[i].color, arr[i].health);
        } else {
            let curX = arrBullets[i - arr.length].bulletX + arrBullets[i - arr.length].xVelocity * ((Date.now() - arrBullets[i - arr.length].age) / 25);
            let curY = arrBullets[i - arr.length].bulletY + arrBullets[i - arr.length].yVelocity * ((Date.now() - arrBullets[i - arr.length].age) / 25);
            renderBullet(curX, curY);
        }
    }
    
}

async function runGame() {
    if (hasSetName === false && !(typeof canvas.playerName === "undefined")) {
        initGame();
        console.log(canvas.playerName);
        setName(canvas.playerName);
        hasSetName = true;
        let selectedWeapon = document.getElementById("selectWeapons").value;
        setWeapon(selectedWeapon);
    } else {
        renderAll();
    }

    requestAnimationFrame(runGame);
}



//sign in
onAuthStateChanged(auth2, (user) => {
    console.log(user);
    if (user) {
        playerId = user.uid;
        playerRef = ref(db, `players/${playerId}`);
        let spawnX = Math.random() * (window.innerWidth - 50) + 50;
        let spawnY = Math.random() * (window.innerHeight - 50) + 50;
        set(playerRef, {
            id: playerId,
            name: "player",
            direction: "right",
            color: getRandomColor(),
            x: spawnX,
            y: spawnY,
            health: 10,
        });

        onDisconnect(playerRef).remove();
    } else {
        console.log("user not signed in correctly");
    }
})

signInAnonymously(auth2)
    .then(() => {
        console.log("signed in");
        // Signed in..
    })
    .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        // ...
    });


runGame();
