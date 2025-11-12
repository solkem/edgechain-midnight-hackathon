/**
 * HTS221 Sensor Diagnostic Test
 * Tests ONLY the temperature/humidity sensor
 */

#include <Arduino_HTS221.h>

void setup() {
  Serial.begin(115200);
  while (!Serial);

  Serial.println("===========================================");
  Serial.println("=== HTS221 Sensor Diagnostic Test ===");
  Serial.println("===========================================");
  Serial.println();

  // Print board information
  Serial.println("Board Information:");
  Serial.println("   This sketch requires: Arduino Nano 33 BLE Sense");
  Serial.println("   (NOT regular Nano 33 BLE - must be 'Sense' version)");
  Serial.println();

  // Try to initialize sensor with retries
  Serial.println("Attempting to initialize HTS221 sensor...");

  for (int attempt = 0; attempt < 5; attempt++) {
    Serial.print("Attempt ");
    Serial.print(attempt + 1);
    Serial.print("/5... ");

    delay(200);

    if (HTS.begin()) {
      Serial.println("SUCCESS!");
      Serial.println();
      Serial.println("✓ Sensor initialized successfully!");
      Serial.println("✓ Reading sensor data:");
      Serial.println();

      // Try to read values
      delay(100);
      float temp = HTS.readTemperature();
      float hum = HTS.readHumidity();

      Serial.print("   Temperature: ");
      Serial.print(temp);
      Serial.println(" °C");

      Serial.print("   Humidity: ");
      Serial.print(hum);
      Serial.println(" %");

      Serial.println();
      Serial.println("===========================================");
      Serial.println("✓ SENSOR TEST PASSED!");
      Serial.println("===========================================");

      return; // Success!
    } else {
      Serial.println("FAILED");
      delay(500);
    }
  }

  // If we get here, all attempts failed
  Serial.println();
  Serial.println("===========================================");
  Serial.println("❌ SENSOR TEST FAILED");
  Serial.println("===========================================");
  Serial.println();
  Serial.println("Troubleshooting steps:");
  Serial.println();
  Serial.println("1. Verify board selection:");
  Serial.println("   Tools → Board → Arduino Mbed OS Nano Boards");
  Serial.println("   → Arduino Nano 33 BLE");
  Serial.println();
  Serial.println("2. Check if you have the 'Sense' version:");
  Serial.println("   - Look at your board - should say 'Nano 33 BLE Sense'");
  Serial.println("   - Regular Nano 33 BLE does NOT have HTS221 sensor");
  Serial.println();
  Serial.println("3. Try different USB cable/port");
  Serial.println();
  Serial.println("4. Verify library installation:");
  Serial.println("   Sketch → Include Library → Manage Libraries");
  Serial.println("   Search 'Arduino_HTS221' and verify it's installed");
  Serial.println();
  Serial.println("===========================================");
}

void loop() {
  // If sensor initialized successfully, continuously read
  if (HTS.available()) {
    float temp = HTS.readTemperature();
    float hum = HTS.readHumidity();

    Serial.print("Temp: ");
    Serial.print(temp);
    Serial.print("°C | Humidity: ");
    Serial.print(hum);
    Serial.println("%");
  }

  delay(2000);
}
