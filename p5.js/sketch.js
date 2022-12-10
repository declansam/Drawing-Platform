/*

  Polar Pen Plotter v8.0
  Dec 10, 2022
   
  Samyam Lamichhane, Tim Kim
  Interactive Media

  Pair it with:
  https://github.com/declansam/Drawing-Platform/blob/main/Arduino/FinalProj_Plotter.ino
  
  Features:
  > Draw any sketch within the circle.
  > Click the RESET button if you want to change your sketch.
  > Click "SEND DATA" once you are done.
  > You can track the progress and steps being executed on the console.
  

*/




// Global Variables
let canvas_w = 800;
let canvas_h = 800;

let positions = []; // List of points in Cartesian coordinates
let mappedPositions = []; // List of points in Polar coordinates ---- (radius, angle) -----
let isClicked = false;
let errorHandler = -2 * canvas_w;

// 1 cm = 37.795275591 px
// 100 mm = 377.95275591 px
let disc_radius = 600;
let one_px_mm = 0.2645833333;
let sketch_radius = 700;

// variable to hold an instance of the p5.webserial library:
const serial = new p5.WebSerial();

// HTML button object:
let portButton;
let outByte = 0; // for outgoing data
let inData; // for incoming data

// Loop variable
let i = 0;

// cartToPolar() function variables - the function alters their values
let startSending = false;
let drawingFinished = false;
let firstQuad = false;
let fourthQuad = false;
let fullRotationNum = 0;
let firstAngle = true;


let font_size = 25;

// Boolean to track if the cursor is on the SEND DATA button (true if it is)
let button_bool = false;




function setup() {
  createCanvas(canvas_w, canvas_h);
  angleMode(DEGREES);

  
  // check to see if serial is available:
  if (!navigator.serial) {
    alert("WebSerial is not supported in this browser. Try Chrome or MS Edge.");
  }

  // if serial is available, add connect/disconnect listeners:
  navigator.serial.addEventListener("connect", portConnect);
  navigator.serial.addEventListener("disconnect", portDisconnect);

  // check for any ports that are available:
  serial.getPorts();

  // if there's no port chosen, choose one:
  serial.on("noport", makePortButton);

  // open whatever port is available:
  serial.on("portavailable", openPort);

  // handle serial errors:
  serial.on("requesterror", portError);

  // handle any incoming serial data:
  serial.on("data", serialEvent);
  serial.on("close", makePortButton);
}


let tmp = 1;
function draw() 
{
  background(203,203,205);
  myCirc();
  instruction_txt();
  
  //Buttons
  send_data_button();
  reset_button();

  // Translate the origin point to the center of the screen
  translate(width/2, height/2);
  
  
  // Restricting the sketch within the canvas
  let d_comp = pow((sq(mouseX - (width/2)) + sq(mouseY - (width/2))), 0.5);
  if (isClicked && (d_comp >= (sketch_radius/2)))
  {
    // If the cursor is outside of the circle and the button, execute this condition
    if (!button_bool)
    {
      isClicked = false;
      print("Draw within the canvas!");
    }
    
    // If the cursor is outside of the circle but within the button, exectute this condition
    else
    {
      isClicked = false;
      print("Button clicked!");
    }
    
  }
    

  // Make sure the mouse is clicked and cursor position is different
  if (isClicked && mouseX !== pmouseX && mouseX !== pmouseY) 
  {
    
    // Create a vector and add it to the list
    // let pt = createVector(mouseX, mouseY);          // When origin is at the top-left corner
    let pt = createVector(mouseX - width / 2, mouseY - height / 2);
    positions.push(pt);

    // Handle the case when x = 0
    if (pt.x == 0) pt.x = 0.01;

    // Mapping Cartesian to Polar and appending it in mappedPositions array
    let temp_list = [];
    temp_list = cartToPolar(pt.x, pt.y);
    let pt_mapped = createVector(temp_list[0] * one_px_mm, temp_list[1]);
    mappedPositions.push(pt_mapped);
    
    
    print("\nCounter: " + tmp);
    // Printing co-ordinates stored in the list(s)
    print("Cartesian: x: " + pt.x + " and y: " + pt.y);
    print("Polar:     r: " + pt_mapped.x + " and Angle: " + pt_mapped.y);
    tmp++;
  }

  // Draw Settings
  noFill();
  strokeWeight(5);
  strokeJoin(ROUND);

  // Go through the list of vectors and plot them
  beginShape();
  for (let i = 0; i < positions.length; i++) {
    let pt = positions[i];
    curveVertex(pt.x, pt.y);
  }
  endShape();

  
  
  // Data Transmission 
  if (startSending)
  // if (startSending) {
    if (inData == "0") 
    {
      let temp_var =
        str(mappedPositions[i].x) + "," + str(mappedPositions[i].y);
      let percent = int((i / mappedPositions.length) * 100);
      print("[" + percent + "% completed] " + temp_var);          // Progress on Console

      serial.write(String(temp_var));

      i += 1;
      
      
      // Check if all the points are trasmitted
      if (i == mappedPositions.length) {
        startSending = false;
        drawingFinished = true;
      }

      inData = "1";        // Reset the watch-dog variable
      
      
      if (i >= 1)
        first_point = false;
    }
  }
  
  // Change the settings after completing the drawing
  if (drawingFinished) {
    serial.write(String("E"));
    print("completed!");
    i = 0;

    startSending = false;
    drawingFinished = false;

    firstQuad = false;
    fourthQuad = false;
    fullRotationNum = 0;
  }
  


// Drawing the circle on the canvas
function myCirc()
{
  fill("white");
  stroke("brown");
  circle(width/2, height/2, sketch_radius);
  
}


// Instruction text on how to use the program
function instruction_txt()
{
  let x_pos = 130;
  let y_pos = 25;
  
  
  textFont("calibri");
  noStroke();
  
  textSize(font_size);
  fill("grey");
  text(" \"Draw within the circle and click SEND DATA once done!\" ", x_pos, y_pos);
}


// Function that converts cartesian values to polar values
// Based on x and y, radius and angle are calculated and returned in the form of an array
//Removed bool_ variable.
let tempAngle;
function cartToPolar(x, y) {
  let radius, angle;
  let old_angle;
  let curr_angle;

  radius = sqrt(sq(x) + sq(y));

  angle = atan(abs(y) / abs(x));

  if (x >= 0 && y >= 0) {
    angle = angle;
    firstQuad = true;

    if (fourthQuad) {
      fullRotationNum++;
      fourthQuad = false;
    }

  } else if (x <= 0 && y >= 0) {
    angle = 180 - angle;
  } else if (x <= 0 && y <= 0) {
    angle = 180 + angle;
  } else if (x >= 0 && y <= 0) {
    angle = 360 - angle;
    fourthQuad = true;

    if (firstQuad) {
      fullRotationNum--;
      firstQuad = false;
    }
  }
  
  angle += fullRotationNum * 360;
  
  if(firstAngle){
    firstAngle = false;
    tempAngle = angle;
  }else{
    if(tempAngle - angle > 180){
      fullRotationNum++;
      angle += 360;
    }if(tempAngle - angle < -180){
      fullRotationNum--;
      angle -= 360;
    }
    tempAngle = angle;
  }

  let temp_list = [];
  temp_list[0] = map(radius, 0, sqrt(2 * sq(width / 2)), 0, disc_radius); // Mapped radius
  temp_list[1] = angle;

  return temp_list;
}








// Button Function
function button(text_, x, y, w, h) {
  // Checks if the cursor is within the button or not
  let isWithinButton =
    mouseX < x + w && mouseX > x && mouseY < y + h && mouseY > y;

  // Hover Effect
  if (isWithinButton) {
    fill(143, 148, 123);
    cursor(HAND);
  } else {
    fill("grey");
    cursor(ARROW);
  }

  // Button Setting
  stroke("black");
  strokeWeight(2);
  rect(x, y, w, h, 5);

  // Text inside the button
  textFont("Helvetica");
  stroke(5);
  textSize(25);
  fill("white");
  text(text_, x + 18, y + 32);

  // Return a boolean value
  return isWithinButton;
}

let first_point = false;

// Function that sends data to arduino
function send_data_button() {
  let x = canvas_w - 210;
  let y = canvas_h - 70;
  let w = 180;
  let h = 50;

  // If the cursor is within the button button() function returns 1, else 0;
  let sendBool = button("SEND DATA", x, y, w, h);

  // Sending the data if the cursor iswithin the button and mouse is clicked
  if (sendBool && mouseIsPressed && !first_point) {
    serial.write(String("H"));
    first_point = true;
    startSending = true;
    
    button_bool = true;
    print("Homing Machine...");
    
    
    // Printing the list 
    // print(positions.length);
    // print(mappedPositions.length);
    // for (let z = 0; z < mappedPositions.length; z++)
    // {
    //   print( (z+1) + ". Radius: " + mappedPositions[z].x + " Angle: " + mappedPositions[z].y);
    // }
  
  }
  else
    button_bool = false;
}

// Function that resets the canvas
function reset_button() {
  let x = 26;
  let y = canvas_h - 70;
  let w = 125;
  let h = 50;
  
  let msg = "null"

  // If the cursor is within the button button() function returns 1, else 0;
  let resetBool = button("RESET", x, y, w, h);

  // Resetting sketch if the cursor iswithin the button and mouse is clicked
  if (resetBool && mouseIsPressed) {
    positions = [];
    mappedPositions = [];
    isClicked = false;
    
    serial.write(String("E"));
    print("home");

  }
}





// ------------------------------- SERIAL COMMUNICATION -------------------------------------------
// if there's no port selected,
// make a port select button appear:
function makePortButton() {
  // create and position a port chooser button:
  portButton = createButton("choose port");
  portButton.position(10, 10);
  // give the port button a mousepressed handler:
  portButton.mousePressed(choosePort);
}

// make the port selector window appear:
function choosePort() {
  if (portButton) portButton.show();
  serial.requestPort();
}

// open the selected port, and make the port
// button invisible:
function openPort() {
  // wait for the serial.open promise to return,
  // then call the initiateSerial function
  serial.open().then(initiateSerial);

  // once the port opens, let the user know:
  function initiateSerial() {
    console.log("port open");
  }
  // hide the port button once a port is chosen:
  if (portButton) portButton.hide();
}

// pop up an alert if there's a port error:
function portError(err) {
  alert("Serial port error: " + err);
}

// read any incoming data as a string
// (assumes a newline at the end of it):
function serialEvent() {
  inData = Number(serial.read());
}

// try to connect if a new serial port
// gets added (i.e. plugged in via USB):
function portConnect() {
  console.log("port connected");
  serial.getPorts();
}

// if a port is disconnected:
function portDisconnect() {
  serial.close();
  console.log("port disconnected");
}

function closePort() {
  serial.close();
}
