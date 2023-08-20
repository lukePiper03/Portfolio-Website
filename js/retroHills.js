// page variables
const canvas = document.querySelector('#canvas');

// customsation variables
const thickness = 2.5; // thickness of lines

// device variables
const canvasWidth = 1920;
const canvasHeight = 1080;
var mouseX = -500;
var mouseY = -500;
const distance = 10;

// instance variables
var points = [];
var amountOfCols; // Amount of columns
var amountOfRows = 0; // Max generated rows in a column as the sides have less rows
var maxHeight = 100; // Max height of a peak
var maxDistance = 60; // Max distance from mouse to form peaks
const peakMultiplier = 1.5; // How much higher the peak is than the surrounding area
var generatedMap = [];
var timeToNextGen = 0;
const generationHeight = 30;

function draw() {
    if (!canvas.getContext) {
        return;
    }
    const ctx = canvas.getContext('2d');

    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    // get canvas physical dimensinos
    var canvasActualWidth = canvas.clientWidth;
    var canvasActualHeight = canvas.clientHeight;
    let canvasXRatio = canvasActualWidth / canvasWidth;
    let canvasYRatio = canvasActualHeight / canvasHeight;

    // draw background 
    ctx.fillStyle = '#101010';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);



    updateNoise(canvasXRatio, canvasYRatio, true);

    // colours
    ctx.lineWidth = thickness;

    // draw all points
    for (let columnIndex = 0; columnIndex < points.length; columnIndex++) {
        const column = points[columnIndex];
        for (let rowIndex = 0; rowIndex < column.length; rowIndex++) {
            const point = column[rowIndex];

            // calculaate height and size of point
            let scaledHeight = point.height;
            let pointSize = Math.min(Math.max(0, scaledHeight), 3);

            // calculate colour
            let col = 170 + (point.y / canvasHeight) * 100;
            let sat = 100 - scaledHeight / 1.25;
            let color = 'hsl(' + col + ',' + sat + '%, 50%';
            ctx.strokeStyle = color;
            ctx.fillStyle = color;

            // draw lines to nearby points if point is tall enough
            if (point.height > 50) {
                // draw lines to points around it
                let rightPoint = (columnIndex < points.length - 1) ? points[columnIndex + 1][rowIndex] : null;
                let leftPoint = (columnIndex > 0) ? points[columnIndex - 1][rowIndex] : null;
                let upPoint = (rowIndex > 0) ? column[rowIndex - 1] : null;
                let downPoint = (rowIndex < column.length - 1) ? column[rowIndex + 1] : null;

                ctx.beginPath();
                if (leftPoint && leftPoint.height < scaledHeight) {
                    ctx.moveTo(point.x, point.y - scaledHeight);
                    ctx.lineTo(leftPoint.x, leftPoint.y - leftPoint.height);
                }
                if (upPoint && upPoint.height < scaledHeight) {
                    ctx.moveTo(point.x, point.y - scaledHeight);
                    ctx.lineTo(upPoint.x, upPoint.y - upPoint.height);
                }
                if (downPoint && downPoint.height < scaledHeight) {
                    ctx.moveTo(point.x, point.y - scaledHeight);
                    ctx.lineTo(downPoint.x, downPoint.y - downPoint.height);
                }
                if (rightPoint && rightPoint.height < scaledHeight) {
                    ctx.moveTo(point.x, point.y - scaledHeight);
                    ctx.lineTo(rightPoint.x, rightPoint.y - rightPoint.height);
                }
                ctx.stroke();
                ctx.closePath();

            } else { // draw points that is larger if height is increased
                ctx.fillRect(point.x - pointSize / 2, point.y - scaledHeight - pointSize / 2, pointSize, pointSize);
            }
        }
    }

    // add darkened gradient to top
    var grd = ctx.createLinearGradient(0, 0, 0, 300);
    grd.addColorStop(0, "black");
    grd.addColorStop(1, "transparent");
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, canvasWidth, 300);

}

function updateNoise(canvasXRatio, canvasYRatio) {
    // create a hidden minimap above terrain with random wave noise for the next x ticks
    if (timeToNextGen <= 0) {
        generatedMap = [];
        for (let i = 0; i < amountOfCols; i++) {
            let column = []
            for (let j = 0; j < amountOfRows; j++) {
                column.push(1);
            }
            generatedMap.push(column);
        }

        // add wave noise to map
        for (let randomAmount = 0; randomAmount < 50; randomAmount++) {
            // pick random point
            let randomX = Math.floor(Math.random() * amountOfCols);
            let randomY = Math.floor(Math.random() * amountOfRows);
            let randomHeight = Math.random() + 0.3;

            // add 'peak' to map using euclidean distance to neighbouring points
            for (let row = 0; row < amountOfRows; row++) {
                for (let col = 0; col < amountOfCols; col++) {
                    // calcuate distance from random point
                    let distance = Math.max(maxHeight * 0.75 - Math.sqrt(Math.pow(randomX - col, 2) + Math.pow(randomY - row, 2)) * 15, 0);
                    let height;
                    // smooth off edge towards user
                    if (row > generationHeight - 5) {
                        height = Math.max(0, distance * (1 - (1 / (generationHeight - row))));
                    } else {
                        height = Math.max(0, distance);
                    }
                    // add height to map
                    generatedMap[col][row] += height * randomHeight * peakMultiplier;
                }
            }
        }

        timeToNextGen = generationHeight;
    }

    // iterate through each point and update height
    for (let columnIndex = 0; columnIndex < points.length; columnIndex++) {
        const column = points[columnIndex];
        for (let rowIndex = column.length - 1; rowIndex >= 0; rowIndex--) {
            let point = column[rowIndex];
            // systematically take from hidden genrated map
            if (rowIndex == 0) {
                point.height = generatedMap[columnIndex][timeToNextGen - 1];
            } else {
                // allow mouse to affect terrain
                point.height = Math.max((maxDistance - ((Math.sqrt(Math.pow(point.x * canvasXRatio - mouseX, 2) / 2 + Math.pow(point.y * canvasYRatio - mouseY, 2))) +
                    (maxHeight - point.y) / 30)) * peakMultiplier + Math.random() * 3 - 1.5, 1);
            }
            // take from point above if it exists and is higher, which allows scroll effect
            if (rowIndex > 0) point.height = Math.max(point.height, column[rowIndex - 1].height);

        }
    }

    timeToNextGen--;

}

// constantly redraw canvas
function animate() {

    draw();
    setTimeout(animate, 50);
}

// create initial setup
function init() {
    // create 2d array in js
    for (let x = 0; x < canvasWidth; x += distance) {
        points.push([]);
        for (let y = 0; y < canvasHeight; y += distance + (y / 30)) {
            points[x / distance].push({
                x: x,
                y: y,
                height: 1
            });
        }
    }

    // iterate through each row, shifting the points to the left and right of the center further away by each row for 3d effect
    let midCol = canvasWidth / 2;
    points.forEach(column => {
        let shift = 0;
        column.forEach(point => {
            // distance from center
            let dist = Math.abs(point.x - midCol) / 10;
            let yStretch = 1 + (point.y / canvasHeight);
            // dist +=  25*(point.x/canvasWidth/50)*(point.y/canvasHeight)
            if (point.x < midCol) {
                point.x -= shift * dist * yStretch;
            } else {
                point.x += shift * dist * yStretch;
            }

            shift++;
        });
    });

    // iterate through the 2d array, adding only those that are within the canvas width and height
    newPoints = [];
    points.forEach(column => {
        let col = []
        column.forEach((point, index) => {

            if (point.x > 0 && point.x < canvasWidth && point.y > 0 && point.y < canvasHeight) {
                col.push(point);
            }

        });
        newPoints.push(col);
    });
    points = newPoints;

    // get amount of rows and columns
    amountOfRows = points[points.length / 2].length;
    amountOfCols = points.length;

    // call looping animation function
    animate();
}

// init canvas
init();

// follow mouse when on canvas with canvas offset
document.addEventListener('mousemove', function (e) {
    // check if mouse on top of canvas
    if (e.target.id !== 'canvas') {
        mouseX = -500;
        mouseY = -500;
        return;
    }

    // get canvas top and left position from page
    const canvasTop = canvas.offsetTop;
    const canvasLeft = canvas.offsetLeft;

    // add page scrolled amount to mouse position
    mouseX = e.clientX - canvasLeft;
    mouseY = e.clientY - canvasTop + window.scrollY;
});