#include "driver/i2s_types.h"
#include "esp_err.h"
#include "soc/gpio_num.h"

class SDCard {
public:
  SDCard(gpio_num_t doGPIO, gpio_num_t clkGPIO, gpio_num_t diGPIO,
         gpio_num_t csGPIO);

private:
  gpio_num_t doGPIO;
  gpio_num_t clkGPIO;
  gpio_num_t diGPIO;
  gpio_num_t csGPIO;
};
