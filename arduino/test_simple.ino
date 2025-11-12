/**
 * Simple test sketch for Arduino Nano 33 BLE
 * Just tests serial communication and basic functionality
 */

void setup() {
  Serial.begin(115200);
  while (!Serial) {
    delay(10);  // Wait for serial port to connect
  }

  Serial.println("===================================");
  Serial.println("Arduino Nano 33 BLE - Simple Test");
  Serial.println("===================================");
  Serial.println("If you see this, Serial works!");
  Serial.println("Board is: Arduino Nano 33 BLE");
  Serial.println("===================================");
}

void loop() {
  Serial.print("Loop running... millis: ");
  Serial.println(millis());
  delay(1000);  // Print every second
}
