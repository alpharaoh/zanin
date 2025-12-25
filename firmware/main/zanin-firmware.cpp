#include <iostream>
#include <stdio.h>

#include "components/led/led.h"
#include "components/mic/mic.h"

#include "driver/gpio.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "led_strip.h"

// The GPIO that connected to the LED
const unsigned int LED_GPIO_ID = 38;

const unsigned int MIC_BLCK_GPIO_ID = 17;
const unsigned int MIC_DOUT_GPIO_ID = 16;
const unsigned int MIC_LRCL_GPIO_ID = 15;

extern "C" void app_main() {
  Led led = Led(LED_GPIO_ID);
  Microphone mic =
      Microphone(MIC_BLCK_GPIO_ID, MIC_DOUT_GPIO_ID, MIC_LRCL_GPIO_ID);

  while (true) {
    if (!led.isOn()) {
      led.setColor(5, 0, 0);
    } else {
      led.turnOff();
    }

    vTaskDelay(pdMS_TO_TICKS(2000));
  }
}
