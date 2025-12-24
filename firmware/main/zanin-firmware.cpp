#include <iostream>
#include <stdio.h>

#include "driver/gpio.h"
#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "led_strip.h"

// The GPIO that connected to the LED
const unsigned int GPIO_RGB_LED_ID = 38;

// The number of LEDs in the strip
const unsigned int LED_STRIP_LED_COUNT = 1;

// 10MHz resolution, 1 tick = 0.1us (led strip needs a high resolution)
const unsigned int LED_STRIP_RMT_RES_HZ = (10 * 1000 * 1000);

// Set to 1 to use DMA for driving the LED strip, 0 otherwise
const unsigned int LED_STRIP_USE_DMA = 0;

// let the driver choose a proper memory block size automatically
const unsigned int LED_STRIP_MEMORY_BLOCK_WORDS = 0;

static const char *TAG = "zanin-led";

led_strip_handle_t configure_led(void) {
  /// LED strip common configuration
  led_strip_config_t strip_config = {
      .strip_gpio_num = GPIO_RGB_LED_ID,
      .max_leds = LED_STRIP_LED_COUNT,
      .led_model =
          LED_MODEL_WS2812, // LED strip model, it determines the bit timing
      .color_component_format = LED_STRIP_COLOR_COMPONENT_FMT_GRB, // G-R-B
      .flags = {
          .invert_out = false, // Don't invert the output signal
      }};

  // LED strip backend configuration: RMT
  led_strip_rmt_config_t rmt_config = {
      .clk_src = RMT_CLK_SRC_DEFAULT,
      .resolution_hz = LED_STRIP_RMT_RES_HZ,
      .mem_block_symbols =
          LED_STRIP_MEMORY_BLOCK_WORDS, // the memory block size used by the RMT
                                        // channel
      .flags = {
          .with_dma = LED_STRIP_USE_DMA, // Using DMA can improve performance
                                         // when driving more LEDs
      }};

  // LED Strip object handle
  led_strip_handle_t led_strip;
  ESP_ERROR_CHECK(
      led_strip_new_rmt_device(&strip_config, &rmt_config, &led_strip));
  ESP_LOGI(TAG, "Created LED strip object with RMT backend");
  return led_strip;
}

extern "C" void app_main() {
  led_strip_handle_t led_strip = configure_led();
  bool led_on = false;

  ESP_LOGI(TAG, "Start blinking LED strip");

  while (true) {
    if (led_on) {
      for (int i = 0; i < LED_STRIP_LED_COUNT; i++) {
        ESP_ERROR_CHECK(led_strip_set_pixel(led_strip, i, 0, 5, 0));
      }
      // Refresh the strip to send the data
      ESP_ERROR_CHECK(led_strip_refresh(led_strip));
      ESP_LOGI(TAG, "LED ON!");
    } else {
      /* Set all LED off to clear all pixels */
      ESP_ERROR_CHECK(led_strip_clear(led_strip));
      ESP_LOGI(TAG, "LED OFF!");
    }

    led_on = !led_on;
    vTaskDelay(pdMS_TO_TICKS(2000));
  }
}
