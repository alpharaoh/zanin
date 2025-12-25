#include "sdcard.h"

SDCard::SDCard(gpio_num_t doGPIO, gpio_num_t clkGPIO, gpio_num_t diGPIO,
               gpio_num_t csGPIO)
    : doGPIO(doGPIO), clkGPIO(clkGPIO), diGPIO(diGPIO), csGPIO(csGPIO) {
  // TODO: Implement SDCard
}
