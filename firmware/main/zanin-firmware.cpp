#include <iostream>
#include <stdio.h>

#include "components/led/led.h"
#include "components/mic/mic.h"

#include "driver/gpio.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "led_strip.h"

const gpio_num_t LED_GPIO_ID = GPIO_NUM_38;

const gpio_num_t MIC_DOUT_GPIO_ID = GPIO_NUM_15;
const gpio_num_t MIC_BLCK_GPIO_ID = GPIO_NUM_16;
const gpio_num_t MIC_LRCL_GPIO_ID = GPIO_NUM_17;

extern "C" void app_main() {
  Led led = Led(LED_GPIO_ID);

  while (true) {
    if (!led.isOn()) {
      led.setColor(5, 0, 0);
    } else {
      led.turnOff();
    }

    vTaskDelay(pdMS_TO_TICKS(2000));
  }
}
