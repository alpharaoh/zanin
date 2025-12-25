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

const gpio_num_t MIC_BLCK_GPIO_ID = GPIO_NUM_17;
const gpio_num_t MIC_DOUT_GPIO_ID = GPIO_NUM_16;
const gpio_num_t MIC_LRCL_GPIO_ID = GPIO_NUM_15;

extern "C" void app_main() {
  Led led = Led(LED_GPIO_ID);
  Microphone mic =
      Microphone(MIC_BLCK_GPIO_ID, MIC_DOUT_GPIO_ID, MIC_LRCL_GPIO_ID);

  mic.start();
  ESP_LOGI("zanin-mic", "Mic started");

  // Create buffer ONCE outside the loop (static = not on stack)
  const size_t BUFFER_SIZE = 1024;
  static int32_t buffer[BUFFER_SIZE];
  size_t bytes_read = 0;

  while (true) {

    // Read audio data
    mic.read(buffer, sizeof(buffer), &bytes_read, 1000);

    // Print how many bytes we got
    ESP_LOGI("main", "Read %d bytes", bytes_read);

    // Print first few samples to see if it's working
    for (int i = 0; i < 10; i++) {
      ESP_LOGI("main", "Sample %d: %ld", i, buffer[i]);
    }

    vTaskDelay(pdMS_TO_TICKS(500)); // Don't flood the logs
    // if (!led.isOn()) {
    //   led.setColor(5, 0, 0);
    // } else {
    //   led.turnOff();
    // }
    //
    // vTaskDelay(pdMS_TO_TICKS(2000));
  }

  mic.stop();
}
