#include "mic.h"
#include "FreeRTOSConfig.h"
#include "driver/gpio.h"
#include "driver/i2s_pdm.h"
#include "driver/i2s_std.h"
#include "esp_log.h"
#include "freertos/projdefs.h"
#include "hal/i2s_types.h"
#include "portmacro.h"

static const char *TAG = "zanin-mic";

Microphone::Microphone(gpio_num_t bclk, gpio_num_t dio, gpio_num_t lrcl)
    : blck(bclk), dio(dio), lrcl(lrcl) {

  i2s_chan_config_t chan_cfg =
      I2S_CHANNEL_DEFAULT_CONFIG(I2S_NUM_0, I2S_ROLE_MASTER);

  ESP_ERROR_CHECK(i2s_new_channel(&chan_cfg, nullptr, &rx_handle));
  ESP_LOGI(TAG, "Created new i2s RX channel");

  i2s_std_config_t std_cfg = {
      .clk_cfg = I2S_STD_CLK_DEFAULT_CONFIG(16000),
      .slot_cfg = I2S_STD_PHILIPS_SLOT_DEFAULT_CONFIG(I2S_DATA_BIT_WIDTH_32BIT,
                                                      I2S_SLOT_MODE_STEREO),
      .gpio_cfg =
          {
              .mclk = I2S_GPIO_UNUSED,
              .bclk = bclk,
              .ws = lrcl,
              .dout = I2S_GPIO_UNUSED,
              .din = dio,
              .invert_flags =
                  {
                      .mclk_inv = false,
                      .bclk_inv = false,
                      .ws_inv = false,
                  },
          },
  };

  ESP_LOGI(TAG, "I2S Config: BCLK=%d, WS=%d, DIN=%d", bclk, lrcl, dio);

  ESP_ERROR_CHECK(i2s_channel_init_std_mode(rx_handle, &std_cfg));
  ESP_LOGI(TAG, "Initialized i2s channel");
}

void Microphone::start() {
  ESP_ERROR_CHECK(i2s_channel_enable(rx_handle));
  ESP_LOGI(TAG, "Enabled i2s channel");
}

esp_err_t Microphone::read(void *buffer, size_t bytes_to_read,
                           size_t *bytes_read, uint32_t timeout_ms) {
  TickType_t ticks = pdMS_TO_TICKS(timeout_ms);
  return i2s_channel_read(rx_handle, buffer, bytes_to_read, bytes_read, ticks);
}

void Microphone::stop() {
  /* Have to stop the channel before deleting it */
  ESP_ERROR_CHECK(i2s_channel_disable(this->rx_handle));
  /* If the handle is not needed any more, delete it to release the channel
   * resources */
  ESP_ERROR_CHECK(i2s_del_channel(this->rx_handle));
  ESP_LOGI(TAG, "Disabled i2s channel");
}
