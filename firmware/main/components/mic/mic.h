#include "driver/i2s_types.h"
#include "esp_err.h"
#include "soc/gpio_num.h"

class Microphone {
public:
  Microphone(gpio_num_t blck, gpio_num_t dio, gpio_num_t lrcl);
  void start();
  void stop();
  esp_err_t read(void *buffer, size_t bytes_to_read, size_t *bytes_read,
                 uint32_t timeout_ms);

private:
  gpio_num_t blck;
  gpio_num_t dio;
  gpio_num_t lrcl;
  i2s_chan_handle_t rx_handle;
};
