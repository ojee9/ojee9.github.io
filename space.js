const canvas = document.getElementById("spaceCanvas");
const ctx = canvas.getContext("2d");

canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

/* TEST BACKGROUND */
ctx.fillStyle = "black";
ctx.fillRect(0,0,canvas.width,canvas.height);

/* TEST TEXT */
ctx.fillStyle = "red";
ctx.font = "40px Arial";
ctx.fillText("IF YOU SEE THIS SPACE.JS WORKS",100,200);
