#include <iostream>
#include <stdio.h>

#include "components/led/led.h"
#include "driver/gpio.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "led_strip.h"

// The GPIO that connected to the LED
const unsigned int GPIO_RGB_LED_ID = 38;

extern "C" void app_main() {
  Led led = Led(GPIO_RGB_LED_ID);

  while (true) {
    if (!led.isOn()) {
      led.setColor(5, 0, 0);
    } else {
      led.turnOff();
    }

    vTaskDelay(pdMS_TO_TICKS(2000));
  }
}
