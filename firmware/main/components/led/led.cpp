#include "led.h"
#include "esp_log.h"

static const char *TAG = "zanin-led";

// The number of LEDs in the strip
const unsigned int LED_STRIP_LED_COUNT = 1;

// 10MHz resolution, 1 tick = 0.1us (led strip needs a high resolution)
const unsigned int LED_STRIP_RMT_RES_HZ = (10 * 1000 * 1000);

// Set to 1 to use DMA for driving the LED strip, 0 otherwise
const unsigned int LED_STRIP_USE_DMA = 0;

// let the driver choose a proper memory block size automatically
const unsigned int LED_STRIP_MEMORY_BLOCK_WORDS = 0;

Led::Led(int gpio) : gpio(gpio), ledOn(false) {
  /// LED strip common configuration
  led_strip_config_t stripConfig = {
      .strip_gpio_num = gpio,
      .max_leds = LED_STRIP_LED_COUNT,
      .led_model =
          LED_MODEL_WS2812, // LED strip model, it determines the bit timing
      .color_component_format = LED_STRIP_COLOR_COMPONENT_FMT_GRB, // G-R-B
      .flags = {
          .invert_out = false, // Don't invert the output signal
      }};

  // LED strip backend configuration: RMT
  led_strip_rmt_config_t rmtConfig = {
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
  led_strip_handle_t ledStrip;
  ESP_ERROR_CHECK(
      led_strip_new_rmt_device(&stripConfig, &rmtConfig, &ledStrip));
  ESP_LOGI(TAG, "Created LED strip object with RMT backend");

  this->ledStrip = ledStrip;
}

void Led::setColor(int r, int g, int b) {
  ESP_ERROR_CHECK(led_strip_set_pixel(ledStrip, LED_STRIP_LED_COUNT, g, r, b));
  // Refresh the strip to send the data
  ESP_ERROR_CHECK(led_strip_refresh(ledStrip));
  this->ledOn = true;
}

void Led::turnOff() {
  ESP_ERROR_CHECK(led_strip_clear(this->ledStrip));
  ESP_LOGI(TAG, "LED OFF!");
  this->ledOn = false;
}

bool Led::isOn() { return this->ledOn; }
