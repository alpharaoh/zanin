#include <iostream>
#include <stdio.h>

#include "driver/gpio.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "led_strip.h"

const unsigned int GPIO_RGB_LED_ID = 38;

extern "C" void app_main(void) {
  char *tag = pcTaskGetName(NULL);
  ESP_LOGI(tag, " -> Hello from ESP32-S3!\n");

  /// LED strip common configuration
  led_strip_config_t strip_config = {
      .strip_gpio_num = GPIO_RGB_LED_ID, // The GPIO that connected to the LED
                                         // strip's data line
      .max_leds = 1,                     // The number of LEDs in the strip,
      .led_model =
          LED_MODEL_WS2812, // LED strip model, it determines the bit timing
      .color_component_format =
          LED_STRIP_COLOR_COMPONENT_FMT_GRB, // The color component format is
                                             // G-R-B
      .flags = {
          .invert_out = false, // don't invert the output signal
      }};

  led_strip_handle_t led_strip = NULL;
  ESP_ERROR_CHECK(
      led_strip_new_spi_device(&strip_config, &spi_config, &led_strip));
}
