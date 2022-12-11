/*

  Polar Pen Plotter V4.0
  2022.12.10
   
   Samyam Lamichhane, Tim Kim
   Interactive Media

  Pair it with:
   https://editor.p5js.org/Samyam/sketches/bqn5yWk71


*/

#include <AccelStepper.h>
#include <Servo.h>

// Motor pin definitions:
//Drawing plate stepper
#define plateMotorPin1  4      // IN1 on the ULN2003 driver
#define plateMotorPin2  5      // IN2 on the ULN2003 driver
#define plateMotorPin3  6     // IN3 on the ULN2003 driver
#define plateMotorPin4  7     // IN4 on the ULN2003 driver

//Arm stepper
#define ArmMotorPin1  8      // IN1 on the ULN2003 driver
#define ArmMotorPin2  9      // IN2 on the ULN2003 driver
#define ArmMotorPin3  10     // IN3 on the ULN2003 driver
#define ArmMotorPin4  11     // IN4 on the ULN2003 driver

// Define the AccelStepper interface type; 4 wire motor in half step mode:
#define MotorInterfaceType 8

// Initialize with pin sequence IN1-IN3-IN2-IN4 for using the AccelStepper library with 28BYJ-48 stepper motor:
AccelStepper armStepper = AccelStepper(MotorInterfaceType, ArmMotorPin1, ArmMotorPin3, ArmMotorPin2, ArmMotorPin4);
AccelStepper plateStepper = AccelStepper(MotorInterfaceType, plateMotorPin1, plateMotorPin3, plateMotorPin2, plateMotorPin4);

Servo penServo;

const int limitSw = A1;
const int homeButt = A0;

const float halfStepToMm = 0.02047; // 1 half Step = 0.02047 mm movement in pen [mm/halfStep]
const float halfStepToDegrees =  360.0 / 4096.0; // 1 half Step ~= 0.08789 degrees turn in plate [degrees/halfStep]

bool homing = false;
bool machineStart = false;
bool firstPoint = true;
bool drawing = false;

String input = "";
float angleTemp = 0;

float coordVal[2]; //[0]: r [mm], [1]: theta [degrees]

void setup() {
  // Set the maximum steps per second:
  armStepper.setMaxSpeed(1000);
  plateStepper.setMaxSpeed(1000);

  // Set the maximum acceleration in steps per second^2:
  armStepper.setAcceleration(200);
  plateStepper.setAcceleration(200);

  penServo.attach(3);
  penServo.write(90);  //pen up

  pinMode(limitSw, INPUT);
  pinMode(homeButt, INPUT);
  pinMode(13, OUTPUT);

  Serial.begin(9600);
}

void loop() {
  //Home the machine and move pen to cener when home button is pressed.
  if (!homing && digitalRead(homeButt) == 1) homing = true;
  if (homing) {
    if (!machineStart) homeMachine(102);
    else homeMachine(95);
  }

  if (Serial.available() > 0) {
    input = Serial.readString();

    // First inData: Beginning of drawing
    if (input == "H") {
      homing = true;
      firstPoint = true;
      machineStart = true;
    } 
    
    // Final Indata: End of drawing
    else if (input == "E") {
      homing = true;
      machineStart = false;
      firstPoint = true;
      drawing = false;
    }
  }

  if (machineStart && input.length() > 3) {

    // Slicing the data received from p5.js
    coordVal[0] = input.substring(0, input.indexOf(",")).toFloat(); // r
    coordVal[1] = input.substring(input.indexOf(",") + 1, input.length()).toFloat();  //theta

    // If the coordinate received is the first point, do this:
    if (firstPoint) {
      penServo.write(90);
      armStepper.setCurrentPosition(0);
      plateStepper.setCurrentPosition(0);
      firstPoint = false;
      angleTemp = coordVal[1];
    } else if (drawing) {
      penServo.write(110);
    }


    // Checking the change in value
    if (abs(angleTemp - coordVal[1]) > 90) {
      drawing = false;
      d.write(95);
    }

    // Setting the max speed
    armStepper.setMaxSpeed(1000);
    plateStepper.setMaxSpeed(1000);

    // Moving the stepper motors
    armStepper.moveTo((int) (coordVal[0] / halfStepToMm));
    armStepper.run();
    plateStepper.moveTo(-1 * (int) (coordVal[1] / halfStepToDegrees));
    plateStepper.run();

    // Check the target distance
    if (armStepper.distanceToGo() == 0 && plateStepper.distanceToGo() == 0) {
      angleTemp = coordVal[1];
      Serial.write(0);
      drawing = true;
      input = "";
    }
  }
}

// Homing the machine 
void homeMachine(byte _servoAngle) {
  penServo.write(90);
  armStepper.setSpeed(-400);
  armStepper.runSpeed();
  if (digitalRead(limitSw) == 1) {
    armStepper.setCurrentPosition(0);
    armStepper.moveTo(0);
    armStepper.runToPosition();
    centerPen(_servoAngle);
    Serial.write(0);
  }
}

// Moving the plotter
void centerPen(byte _servoAngle) {
  armStepper.moveTo((int)(25 / halfStepToMm));      // Homing position
  armStepper.runToPosition();
  armStepper.setCurrentPosition(0);                 // Pen motor
  armStepper.setMaxSpeed(1000);
  penServo.write(_servoAngle);                      // Servo

  homing = false;
}

// End machine function
void endMachine() {
  penServo.write(90);
  armStepper.setSpeed(-400);
  armStepper.runSpeed();
  if (digitalRead(limitSw) == 1) {
    armStepper.setCurrentPosition(0);
    armStepper.moveTo(0);
    armStepper.runToPosition();
  }
}
